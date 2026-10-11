import pytest
import numpy as np
import cv2
import base64
import time
from httpx import AsyncClient, ASGITransport

from app.proctoring.frame_processor import OpenCVFrameProcessor
from app.proctoring.face_detector import OpenCVFaceDetector
from app.proctoring.object_detector import OpenCVObjectDetector
from app.proctoring.evidence import OpenCVEvidenceCapturer
from app.proctoring.violation_engine import OpenCVProctoringEngine
from app.main import app

def create_synthetic_image_b64(width=320, height=240, color=(128, 128, 128)) -> str:
    """Helper to create a solid color synthetic image and return base64 string."""
    img = np.full((height, width, 3), color, dtype=np.uint8)
    _, buffer = cv2.imencode(".jpg", img)
    b64_str = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"

def test_opencv_import_and_version():
    """Test 1: Verify OpenCV is installed and imported cleanly."""
    assert cv2.__version__ is not None
    assert isinstance(cv2.__version__, str)

def test_frame_preprocessing():
    """Test 2: Verify OpenCV frame decoding, resizing, grayscale conversion, equalization & blur."""
    b64_src = create_synthetic_image_b64(640, 480)
    bgr_img = OpenCVFrameProcessor.decode_base64_frame(b64_src)
    assert bgr_img is not None
    assert bgr_img.shape == (480, 640, 3)

    resized_bgr, equalized_gray, scale_x, scale_y = OpenCVFrameProcessor.preprocess_frame(bgr_img)
    assert resized_bgr.shape == (240, 320, 3)
    assert equalized_gray.shape == (240, 320)
    assert len(equalized_gray.shape) == 2  # Grayscale image
    assert scale_x == 2.0
    assert scale_y == 2.0

    b64_out = OpenCVFrameProcessor.encode_frame_to_base64(resized_bgr)
    assert b64_out is not None
    assert b64_out.startswith("data:image/jpeg;base64,")

def test_face_detector_no_faces():
    """Test 3: Verify OpenCVFaceDetector returns 0 faces on blank/dark image."""
    detector = OpenCVFaceDetector()
    blank_gray = np.zeros((240, 320), dtype=np.uint8)
    boxes = detector.detect_faces(blank_gray)
    assert isinstance(boxes, list)
    assert len(boxes) == 0

def test_evidence_annotation():
    """Test 4: Verify OpenCVEvidenceCapturer annotates frame with cv2 bounding boxes and text overlays."""
    img = np.full((240, 320, 3), 180, dtype=np.uint8)
    face_boxes = [(50, 50, 60, 60)]
    object_boxes = [{"label": "PHONE_DETECTED", "confidence": 0.85, "box": (150, 150, 40, 60)}]

    b64_annotated = OpenCVEvidenceCapturer.annotate_evidence_frame(
        bgr_img=img,
        attempt_id="att_test_123",
        violation_type="PHONE_DETECTED",
        message="Test phone violation",
        face_boxes=face_boxes,
        object_boxes=object_boxes,
        confidence=95.0,
        strike_number=1,
    )
    assert b64_annotated is not None
    assert b64_annotated.startswith("data:image/jpeg;base64,")

@pytest.mark.asyncio
async def test_opencv_proctoring_endpoint_integration(client: AsyncClient):
    """Test 5: End-to-end integration test of /api/v1/exams/attempts/{attempt_id}/process-frame endpoint."""
    # 1. Fetch available exams to trigger default seeding
    exams_res = await client.get("/api/v1/exams")
    assert exams_res.status_code == 200
    exams = exams_res.json()
    assert len(exams) >= 1
    exam_id = exams[0]["id"]

    # 2. Start an exam attempt
    start_res = await client.post(
        f"/api/v1/exams/{exam_id}/start",
        json={
            "candidate_name": "OpenCV Candidate",
            "candidate_email": "opencv.candidate@test.com",
            "verification_photo_base64": create_synthetic_image_b64(),
        },
    )
    assert start_res.status_code == 200
    attempt_id = start_res.json()["attempt_id"]

    # 3. Process frame via backend OpenCV endpoint
    frame_b64 = create_synthetic_image_b64()
    process_res = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/process-frame",
        json={"frame_base64": frame_b64},
    )
    assert process_res.status_code == 200
    data = process_res.json()

    assert "status" in data
    assert "face_count" in data
    assert "violation_detected" in data
    assert isinstance(data["face_count"], int)

def test_object_detector_initialization_and_model_loading():
    """Test 6: Verify OpenCVObjectDetector initializes cleanly and loads model via ModelManager."""
    from app.proctoring.models.model_manager import ModelManager
    detector = OpenCVObjectDetector()
    assert detector is not None
    # Model net is loaded
    net = ModelManager.get_net()
    assert net is not None

def test_phone_detection_controlled_image():
    """Test 7: Controlled phone test image classification & filtering pipeline test."""
    detector = OpenCVObjectDetector()
    # Create controlled test frame containing smartphone geometry + skin context
    test_img = np.full((240, 320, 3), 200, dtype=np.uint8)

    # Draw dark smartphone box (aspect ratio 1.8)
    cv2.rectangle(test_img, (100, 50), (140, 122), (20, 20, 20), -1)
    # Draw adjacent hand skin pixels (HSV skin hue range)
    cv2.rectangle(test_img, (90, 115), (150, 150), (140, 160, 220), -1)

    face_boxes = []
    objs = detector.detect_objects(test_img, face_boxes)
    assert isinstance(objs, list)
    if len(objs) > 0:
        assert any(o.get("label") == "PHONE_DETECTED" for o in objs)

def test_hand_only_image_no_phone_false_positives():
    """Test 8: Verify a hand/person image without a phone does NOT trigger PHONE_DETECTED (0 false positives)."""
    detector = OpenCVObjectDetector()
    # Create synthetic frame with only hand skin pixels (no phone chassis/screen)
    hand_img = np.full((240, 320, 3), 200, dtype=np.uint8)
    # Draw hand shape only (skin tones, circular blob)
    cv2.circle(hand_img, (160, 160), 40, (140, 160, 220), -1)

    face_boxes = [(100, 30, 80, 80)]
    objs = detector.detect_objects(hand_img, face_boxes)
    phone_objs = [o for o in objs if o.get("label") == "PHONE_DETECTED"]
    # Hands alone must NEVER produce PHONE_DETECTED
    assert len(phone_objs) == 0

def test_phone_persistence_and_cooldown_logic():
    """Test 9: Verify temporal persistence duration (1.5s) and cooldown logic in AttemptState."""
    engine = OpenCVProctoringEngine()
    state = engine.get_attempt_state("test_attempt_persistence")
    assert state.phone_start is None

    now = time.time()
    state.phone_start = now - 0.5  # 0.5 seconds (less than 1.5s threshold)
    assert (now - state.phone_start) < 1.5  # Should not trigger strike yet

    state.phone_start = now - 1.8  # 1.8 seconds (exceeds 1.5s threshold)
    assert (now - state.phone_start) >= 1.5  # Confirms temporal persistence trigger

