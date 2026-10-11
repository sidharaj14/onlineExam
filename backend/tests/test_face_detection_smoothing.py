import pytest
import numpy as np
import cv2
import base64
import time
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.proctoring.frame_processor import OpenCVFrameProcessor
from app.proctoring.face_detector import OpenCVFaceDetector
from app.proctoring.violation_engine import OpenCVProctoringEngine, proctoring_engine
from app.proctoring.config import (
    NO_FACE_GRACE_PERIOD_SECONDS,
    FACE_DETECTION_MIN_CONSECUTIVE_FRAMES,
    VIOLATION_COOLDOWN_SECONDS,
)

def create_synthetic_image_b64(width=320, height=240, color=(128, 128, 128)) -> str:
    """Helper to create a solid color synthetic image (no face)."""
    img = np.full((height, width, 3), color, dtype=np.uint8)
    _, buffer = cv2.imencode(".jpg", img)
    b64_str = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"

def get_real_face_frame_b64() -> str:
    """Load real verification photo from test dataset as base64."""
    img_path = "backend/storage/verifications/verify_177f1c8fd8d3465abc7ecf9380490172.jpg"
    img = cv2.imread(img_path)
    if img is None:
        img = np.full((240, 320, 3), 180, dtype=np.uint8)
        cv2.circle(img, (160, 120), 50, (220, 200, 180), -1)
    _, buffer = cv2.imencode(".jpg", img)
    b64_str = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"

@pytest.mark.asyncio
async def test_1_valid_frame_face_detected(db_session: AsyncSession):
    """Test 1: Valid frame containing visible face produces VERIFIED status and 0 violations."""
    engine = OpenCVProctoringEngine()
    face_b64 = get_real_face_frame_b64()

    res = await engine.process_frame("test_att_valid_1", face_b64, db_session)

    assert res["status"] == "VERIFIED"
    assert res["face_count"] >= 1
    assert res["smoothed_face_count"] >= 1
    assert res["confidence"] > 0.5
    assert res["in_grace_period"] is False
    assert res["violation_detected"] is False

@pytest.mark.asyncio
async def test_2_consecutive_frames_with_face_detected(db_session: AsyncSession):
    """Test 2: Steady state consecutive frames maintain verified status and increments counter."""
    engine = OpenCVProctoringEngine()
    face_b64 = get_real_face_frame_b64()
    attempt_id = "test_att_consecutive_2"

    for _ in range(5):
        res = await engine.process_frame(attempt_id, face_b64, db_session)
        assert res["status"] == "VERIFIED"
        assert res["violation_detected"] is False

    state = engine.get_attempt_state(attempt_id)
    assert state.face_detected_consecutive_frames == 5
    assert state.no_face_consecutive_frames == 0
    assert state.no_face_start is None

@pytest.mark.asyncio
async def test_3_missed_frames_within_grace_period_no_strike(db_session: AsyncSession):
    """Test 3: 1-2 missed frames (brief head movement/tilt) enter CHECKING state with 0 strikes."""
    engine = OpenCVProctoringEngine()
    face_b64 = get_real_face_frame_b64()
    blank_b64 = create_synthetic_image_b64()
    attempt_id = "test_att_grace_3"

    # Establish initial verified face
    await engine.process_frame(attempt_id, face_b64, db_session)

    # Frame 1 of missing face
    res1 = await engine.process_frame(attempt_id, blank_b64, db_session)
    assert res1["status"] == "CHECKING"
    assert res1["in_grace_period"] is True
    assert res1["violation_detected"] is False
    assert "Checking face position" in res1["message"]

    # Frame 2 of missing face (still < 3.0s and < 3 frames)
    res2 = await engine.process_frame(attempt_id, blank_b64, db_session)
    assert res2["status"] == "CHECKING"
    assert res2["in_grace_period"] is True
    assert res2["violation_detected"] is False

    state = engine.get_attempt_state(attempt_id)
    assert state.no_face_consecutive_frames == 2
    assert state.no_face_start is not None

@pytest.mark.asyncio
async def test_4_continuous_absence_beyond_grace_triggers_violation(client: AsyncClient):
    """Test 4: Face missing continuously beyond grace period (>= 3.0s, >= 3 frames) confirms NO_FACE violation."""
    # 1. Start an exam attempt via API
    exams_res = await client.get("/api/v1/exams")
    exam_id = exams_res.json()[0]["id"]
    start_res = await client.post(
        f"/api/v1/exams/{exam_id}/start",
        json={
            "candidate_name": "Absence Candidate",
            "candidate_email": "absence.candidate@test.com",
            "verification_photo_base64": create_synthetic_image_b64(),
        },
    )
    attempt_id = start_res.json()["attempt_id"]
    blank_b64 = create_synthetic_image_b64()

    # Frame 1 & 2: within grace period
    res1 = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/process-frame",
        json={"frame_base64": blank_b64},
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "CHECKING"
    assert res1.json()["violation_detected"] is False

    res2 = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/process-frame",
        json={"frame_base64": blank_b64},
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "CHECKING"
    assert res2.json()["violation_detected"] is False

    # Simulate elapsed time beyond grace period (>= 3.0s)
    state = proctoring_engine.get_attempt_state(attempt_id)
    state.no_face_start = time.time() - 3.5

    # Frame 3: exceeds both 3.0s duration and >= 3 frames -> triggers confirmed NO_FACE violation
    res3 = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/process-frame",
        json={"frame_base64": blank_b64},
    )
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["status"] == "NO_FACE"
    assert data3["in_grace_period"] is False
    assert data3["violation_detected"] is True
    assert data3["violation"]["violations_count"] == 1
    assert data3["violation"]["violation"]["violation_type"] == "NO_FACE"

@pytest.mark.asyncio
async def test_5_face_reappearing_resets_absence_timer(db_session: AsyncSession):
    """Test 5: Face reappearing after grace/absence immediately resets timers and returns to VERIFIED."""
    engine = OpenCVProctoringEngine()
    face_b64 = get_real_face_frame_b64()
    blank_b64 = create_synthetic_image_b64()
    attempt_id = "test_att_reappear_5"

    # Candidate looks away (1 missed frame)
    res_away = await engine.process_frame(attempt_id, blank_b64, db_session)
    assert res_away["status"] == "CHECKING"

    # Candidate looks back (face visible)
    res_back = await engine.process_frame(attempt_id, face_b64, db_session)
    assert res_back["status"] == "VERIFIED"
    assert res_back["in_grace_period"] is False
    assert res_back["violation_detected"] is False

    state = engine.get_attempt_state(attempt_id)
    assert state.no_face_start is None
    assert state.no_face_consecutive_frames == 0
    assert state.face_detected_consecutive_frames == 1

@pytest.mark.asyncio
async def test_6_invalid_or_empty_frame_handling(db_session: AsyncSession):
    """Test 6: Invalid or unreadable frame returns CAMERA_UNAVAILABLE without penalizing candidate."""
    engine = OpenCVProctoringEngine()

    # Corrupted / invalid base64 data
    res = await engine.process_frame("test_att_invalid_6", "invalid-corrupted-data", db_session)

    assert res["status"] == "CAMERA_UNAVAILABLE"
    assert res["face_count"] == 0
    assert res["violation_detected"] is False
    assert res["in_grace_period"] is False

@pytest.mark.asyncio
async def test_7_detector_model_error_resilience():
    """Test 7: Detector handles matrix errors or exceptions gracefully."""
    detector = OpenCVFaceDetector()
    # Test on invalid grayscale image (empty matrix)
    empty_mat = np.array([], dtype=np.uint8)
    boxes, conf, method = detector.detect_faces_detailed(empty_mat)
    assert boxes == []
    assert conf == 0.0

@pytest.mark.asyncio
async def test_8_low_confidence_filtering():
    """Test 8: Low confidence faces without sufficient neighbor weights are filtered out cleanly."""
    detector = OpenCVFaceDetector()
    # Blank low-texture image produces 0 faces and 0 confidence
    blank = np.full((240, 320), 128, dtype=np.uint8)
    boxes, conf, method = detector.detect_faces_detailed(blank)
    assert len(boxes) == 0
    assert conf == 0.0

@pytest.mark.asyncio
async def test_9_duplicate_violation_cooldown(client: AsyncClient):
    """Test 9: Enforces VIOLATION_COOLDOWN_SECONDS so rapid frames do not generate duplicate strikes."""
    exams_res = await client.get("/api/v1/exams")
    exam_id = exams_res.json()[0]["id"]
    start_res = await client.post(
        f"/api/v1/exams/{exam_id}/start",
        json={
            "candidate_name": "Cooldown Candidate",
            "candidate_email": "cooldown.candidate@test.com",
            "verification_photo_base64": create_synthetic_image_b64(),
        },
    )
    attempt_id = start_res.json()["attempt_id"]
    blank_b64 = create_synthetic_image_b64()

    # Advance state to trigger first strike
    state = proctoring_engine.get_attempt_state(attempt_id)
    state.no_face_start = time.time() - 4.0
    state.no_face_consecutive_frames = 4

    res1 = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/process-frame",
        json={"frame_base64": blank_b64},
    )
    data1 = res1.json()
    assert data1["violation_detected"] is True
    assert data1["violation"]["violations_count"] == 1

    # Immediately send another absent frame (within cooldown window)
    res2 = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/process-frame",
        json={"frame_base64": blank_b64},
    )
    data2 = res2.json()
    # Even though candidate is still absent, cooldown prevents duplicate violation creation
    assert data2["violation_detected"] is False

@pytest.mark.asyncio
async def test_10_independent_state_isolation_across_attempts(db_session: AsyncSession):
    """Test 10: State tracking is completely isolated across distinct attempt_ids."""
    engine = OpenCVProctoringEngine()
    face_b64 = get_real_face_frame_b64()
    blank_b64 = create_synthetic_image_b64()

    attempt_A = "att_isolation_A"
    attempt_B = "att_isolation_B"

    # Candidate A has no face
    res_A = await engine.process_frame(attempt_A, blank_b64, db_session)
    # Candidate B has valid face
    res_B = await engine.process_frame(attempt_B, face_b64, db_session)

    state_A = engine.get_attempt_state(attempt_A)
    state_B = engine.get_attempt_state(attempt_B)

    assert res_A["status"] == "CHECKING"
    assert state_A.no_face_consecutive_frames == 1
    assert state_A.face_detected_consecutive_frames == 0

    assert res_B["status"] == "VERIFIED"
    assert state_B.no_face_consecutive_frames == 0
    assert state_B.face_detected_consecutive_frames == 1
