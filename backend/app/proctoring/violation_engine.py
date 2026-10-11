import time
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.proctoring.config import (
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

class AttemptState:
    """In-memory state tracker for an attempt's temporal persistence & strike cooldowns."""
    def __init__(self):
        self.no_face_start: Optional[float] = None
        self.multi_face_start: Optional[float] = None
        self.phone_start: Optional[float] = None
        self.last_violation_time: float = 0.0

class OpenCVProctoringEngine:
    """
    Main OpenCV Proctoring Engine
    Coordinates OpenCV frame decoding/preprocessing, OpenCV face detection,
    OpenCV object detection, temporal persistence filtering, event deduplication,
    cooldown management, evidence annotation, and database violation recording.
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
            return {
                "status": "ERROR",
                "message": "Invalid or unreadable camera frame",
                "face_count": 0,
                "violation_detected": False,
            }

        # 2. Preprocess frame using OpenCV (resize, grayscale, equalize, blur)
        resized_bgr, equalized_gray, scale_x, scale_y = self.processor.preprocess_frame(bgr_img)

        # 3. Detect faces using OpenCV Cascade Classifier
        face_boxes = self.face_detector.detect_faces(equalized_gray)
        face_count = len(face_boxes)

        # 4. Detect prohibited objects using OpenCV DNN / ROI analysis
        object_boxes = self.object_detector.detect_objects(resized_bgr, face_boxes)
        has_phone = any(obj.get("label") == "PHONE_DETECTED" for obj in object_boxes)

        # Evaluate detection conditions and update temporal persistence
        confirmed_violation_type: Optional[str] = None
        message: str = ""

        # A. NO FACE PERSISTENCE
        if face_count == 0:
            if state.no_face_start is None:
                state.no_face_start = now
            elif (now - state.no_face_start) >= NO_FACE_PERSISTENCE_SECONDS:
                confirmed_violation_type = "NO_FACE"
                message = "Candidate Absent: No face detected in camera viewport!"
        else:
            state.no_face_start = None

        # B. MULTIPLE FACES PERSISTENCE
        if face_count >= 2:
            if state.multi_face_start is None:
                state.multi_face_start = now
            elif (now - state.multi_face_start) >= MULTIPLE_FACES_PERSISTENCE_SECONDS:
                confirmed_violation_type = "MULTIPLE_FACES"
                message = "Unauthorized Activity: Secondary person / 2nd face entered camera frame!"
        else:
            state.multi_face_start = None

        # C. PHONE DETECTION PERSISTENCE
        if has_phone:
            if state.phone_start is None:
                state.phone_start = now
            elif (now - state.phone_start) >= PHONE_DETECTION_PERSISTENCE_SECONDS:
                confirmed_violation_type = "PHONE_DETECTED"
                message = "Unauthorized Activity: Mobile phone detected in camera view!"
        else:
            state.phone_start = None

        # 5. Check Cooldown & Trigger Violation Recording
        violation_result = None
        if confirmed_violation_type:
            # Enforce violation cooldown
            if (now - state.last_violation_time) >= VIOLATION_COOLDOWN_SECONDS:
                state.last_violation_time = now

                # Reset persistence timers post-strike
                state.no_face_start = None
                state.multi_face_start = None
                state.phone_start = None

                # Generate OpenCV annotated evidence frame
                annotated_b64 = OpenCVEvidenceCapturer.annotate_evidence_frame(
                    bgr_img=resized_bgr,
                    attempt_id=attempt_id,
                    violation_type=confirmed_violation_type,
                    message=message,
                    face_boxes=face_boxes,
                    object_boxes=object_boxes,
                    confidence=92.0,
                )

                # Feed confirmed violation into existing ExamService & database
                req = RecordViolationRequest(
                    violation_type=confirmed_violation_type,
                    message=message,
                    snapshot_base64=annotated_b64,
                )
                violation_result = await ExamService.record_violation(attempt_id, req, db)

        # Status text formatting
        if face_count == 0:
            current_status = "NO_FACE"
            status_msg = "Candidate absent from camera viewport."
        elif face_count >= 2:
            current_status = "MULTIPLE_FACES"
            status_msg = "Secondary person detected in camera view!"
        elif has_phone:
            current_status = "PHONE_DETECTED"
            status_msg = "Mobile phone detected in camera view!"
        else:
            current_status = "VERIFIED"
            status_msg = "AI Monitoring Active — Face verified."

        return {
            "status": current_status,
            "message": status_msg,
            "face_count": face_count,
            "violation_detected": violation_result is not None,
            "violation": violation_result,
        }

# Global Proctoring Engine Singleton
proctoring_engine = OpenCVProctoringEngine()
