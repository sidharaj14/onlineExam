import time
import logging
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.proctoring.config import (
    NO_FACE_GRACE_PERIOD_SECONDS,
    FACE_DETECTION_PERSISTENCE_SECONDS,
    FACE_DETECTION_MIN_CONSECUTIVE_FRAMES,
    FACE_DETECTION_SMOOTHING_WINDOW,
    NO_FACE_PERSISTENCE_SECONDS,
    MULTIPLE_FACES_PERSISTENCE_SECONDS,
    PHONE_DETECTION_PERSISTENCE_SECONDS,
    VIOLATION_COOLDOWN_SECONDS,
)
from app.proctoring.frame_processor import OpenCVFrameProcessor
from app.proctoring.face_detector import OpenCVFaceDetector
from app.proctoring.object_detector import OpenCVObjectDetector
from app.proctoring.evidence import OpenCVEvidenceCapturer
from app.schemas.exam import RecordViolationRequest
from app.services.exam_service import ExamService

logger = logging.getLogger("proctoring.violation_engine")

class AttemptState:
    """
    In-memory state tracker for an attempt's temporal persistence,
    sliding window smoothing, and strike cooldowns.
    """
    def __init__(self):
        self.no_face_start: Optional[float] = None
        self.multi_face_start: Optional[float] = None
        self.phone_start: Optional[float] = None
        self.last_violation_time: float = 0.0
        self.last_violation_recorded_at: Dict[str, float] = {}

        # Temporal smoothing & grace period tracking
        self.no_face_consecutive_frames: int = 0
        self.face_detected_consecutive_frames: int = 0
        self.history_face_counts: List[int] = []
        self.last_detected_boxes: List[Tuple[int, int, int, int]] = []
        self.last_verified_timestamp: float = 0.0
        self.best_confidence: float = 1.0


class OpenCVProctoringEngine:
    """
    Main OpenCV Proctoring Engine
    Coordinates OpenCV frame decoding/preprocessing, ensemble face detection,
    OpenCV object detection, temporal persistence filtering, event deduplication,
    grace periods, cooldown management, evidence annotation, and database violation recording.
    """

    def __init__(self):
        self.processor = OpenCVFrameProcessor()
        self.face_detector = OpenCVFaceDetector()
        self.object_detector = OpenCVObjectDetector()
        self.attempt_states: Dict[str, AttemptState] = {}

    def get_attempt_state(self, attempt_id: str) -> AttemptState:
        if attempt_id not in self.attempt_states:
            self.attempt_states[attempt_id] = AttemptState()
        return self.attempt_states[attempt_id]

    async def process_frame(
        self,
        attempt_id: str,
        frame_base64: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Process a single sampled webcam frame using OpenCV and AI rules.
        """
        now = time.time()
        state = self.get_attempt_state(attempt_id)

        # 1. Decode frame using OpenCV
        bgr_img = self.processor.decode_base64_frame(frame_base64)
        if bgr_img is None:
            logger.warning("[PROCTORING] Attempt %s: Invalid or unreadable camera frame", attempt_id[:8])
            return {
                "status": "CAMERA_UNAVAILABLE",
                "message": "Camera unavailable or invalid frame",
                "face_count": 0,
                "smoothed_face_count": 0,
                "confidence": 0.0,
                "processing_ms": round((time.time() - now) * 1000, 1),
                "in_grace_period": False,
                "violation_detected": False,
                "violation": None,
            }

        orig_h, orig_w = bgr_img.shape[:2]

        # 2. Preprocess frame using OpenCV (resize, CLAHE adaptive grayscale, blur)
        resized_bgr, processed_gray, scale_x, scale_y = self.processor.preprocess_frame(bgr_img)

        # 3. Detect faces using OpenCV Ensemble Face Detector
        face_boxes, confidence, method = self.face_detector.detect_faces_detailed(processed_gray)
        raw_face_count = len(face_boxes)

        # 4. Detect prohibited objects using OpenCV DNN / ROI analysis
        object_boxes = self.object_detector.detect_objects(resized_bgr, face_boxes)
        has_phone = any(obj.get("label") == "PHONE_DETECTED" for obj in object_boxes)

        # 5. Temporal Smoothing & Sliding Window
        state.history_face_counts.append(raw_face_count)
        if len(state.history_face_counts) > FACE_DETECTION_SMOOTHING_WINDOW:
            state.history_face_counts.pop(0)

        smoothed_face_count = int(round(sum(state.history_face_counts) / len(state.history_face_counts)))

        confirmed_violation_type: Optional[str] = None
        message: str = ""
        current_status: str = "VERIFIED"
        status_msg: str = "Camera active — face detected"
        in_grace_period: bool = False

        # Evaluate Face Detection Conditions & Grace Period
        if raw_face_count >= 1:
            state.face_detected_consecutive_frames += 1
            state.no_face_consecutive_frames = 0
            state.no_face_start = None  # Immediately reset absence timer
            state.last_verified_timestamp = now
            state.last_detected_boxes = face_boxes
            state.best_confidence = confidence

            if raw_face_count == 1:
                state.multi_face_start = None
                if has_phone:
                    if state.phone_start is None:
                        state.phone_start = now
                    elif (now - state.phone_start) >= PHONE_DETECTION_PERSISTENCE_SECONDS:
                        confirmed_violation_type = "PHONE_DETECTED"
                        message = "Unauthorized Activity: Mobile phone detected in camera view!"
                    current_status = "PHONE_DETECTED"
                    status_msg = "Mobile phone detected in camera view!"
                else:
                    state.phone_start = None
                    current_status = "VERIFIED"
                    status_msg = "Camera active — face detected"

            else:  # raw_face_count >= 2
                if state.multi_face_start is None:
                    state.multi_face_start = now
                elif (now - state.multi_face_start) >= MULTIPLE_FACES_PERSISTENCE_SECONDS:
                    confirmed_violation_type = "MULTIPLE_FACES"
                    message = "Unauthorized Activity: Secondary person / 2nd face entered camera frame!"
                current_status = "MULTIPLE_FACES"
                status_msg = "Secondary person detected in camera view!"

        else:  # raw_face_count == 0
            state.no_face_consecutive_frames += 1
            state.face_detected_consecutive_frames = 0
            state.multi_face_start = None

            if state.no_face_start is None:
                state.no_face_start = now

            absence_duration = now - state.no_face_start

            # Grace period & temporal persistence check
            if (
                absence_duration < NO_FACE_GRACE_PERIOD_SECONDS
                or state.no_face_consecutive_frames < FACE_DETECTION_MIN_CONSECUTIVE_FRAMES
            ):
                # Within grace period: no violation, indicate non-punitive checking status
                in_grace_period = True
                current_status = "CHECKING"
                status_msg = "Checking face position..."
            else:
                # Absence confirmed beyond grace period
                confirmed_violation_type = "NO_FACE"
                message = "Candidate Absent: No face detected in camera viewport!"
                current_status = "NO_FACE"
                status_msg = "Face not detected — please position your face in the camera"

        # 6. Check Cooldown & Trigger Violation Recording
        violation_result = None
        if confirmed_violation_type:
            last_recorded = state.last_violation_recorded_at.get(confirmed_violation_type, 0.0)
            if (now - last_recorded) >= VIOLATION_COOLDOWN_SECONDS:
                state.last_violation_recorded_at[confirmed_violation_type] = now
                state.last_violation_time = now

                # Reset persistence timers post-strike to prevent immediate duplicate
                state.no_face_start = None
                state.multi_face_start = None
                state.phone_start = None
                state.no_face_consecutive_frames = 0

                # Generate OpenCV annotated evidence frame
                annotated_b64 = OpenCVEvidenceCapturer.annotate_evidence_frame(
                    bgr_img=resized_bgr,
                    attempt_id=attempt_id,
                    violation_type=confirmed_violation_type,
                    message=message,
                    face_boxes=face_boxes,
                    object_boxes=object_boxes,
                    confidence=confidence * 100 if confidence > 0 else 90.0,
                )

                # Feed confirmed violation into existing ExamService & database
                req = RecordViolationRequest(
                    violation_type=confirmed_violation_type,
                    message=message,
                    snapshot_base64=annotated_b64,
                )
                violation_result = await ExamService.record_violation(attempt_id, req, db)

        proc_ms = (time.time() - now) * 1000
        logger.info(
            "[PROCTORING] Attempt: %s | Raw Faces: %d | Smoothed: %d | Status: %s | Conf: %.2f | Method: %s | Time: %.1fms | Grace: %s",
            attempt_id[:8],
            raw_face_count,
            smoothed_face_count,
            current_status,
            confidence,
            method,
            proc_ms,
            in_grace_period,
        )

        return {
            "status": current_status,
            "message": status_msg,
            "face_count": raw_face_count,
            "smoothed_face_count": smoothed_face_count,
            "confidence": round(confidence, 2),
            "processing_ms": round(proc_ms, 1),
            "in_grace_period": in_grace_period,
            "violation_detected": violation_result is not None,
            "violation": violation_result,
        }

# Global Proctoring Engine Singleton
proctoring_engine = OpenCVProctoringEngine()
