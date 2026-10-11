from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_current_user, require_role
from app.db.models.user import User
from app.db.session import get_db
from app.services.exam_service import ExamService
from app.schemas.exam import (
    ExamSummaryResponse,
    StartExamRequest,
    SaveAnswerRequest,
    ExamAttemptDetailResponse,
    ExamResultResponse,
    ExamAdminCreate,
    RecordViolationRequest,
    StudentAnalyticsResponse,
)
from pydantic import BaseModel

class ProcessFrameRequest(BaseModel):
    frame_base64: str

router = APIRouter()

@router.get("/student/analytics", response_model=StudentAnalyticsResponse, summary="Get candidate test analytics")
async def get_student_analytics(
    email: Optional[str] = None,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve candidate performance analytics: tests taken, average score, pass rate, and recent attempts.
    """
    return await ExamService.get_student_analytics(email, user_id, db)

@router.get("", response_model=List[ExamSummaryResponse], summary="List all available examinations")
async def get_available_exams(db: AsyncSession = Depends(get_db)):
    """Retrieve all active and published exams with question counts."""
    # Ensure default exam is seeded if database is fresh
    await ExamService.seed_default_exam_if_empty(db)
    return await ExamService.list_exams(db)

@router.get("/{exam_id}", response_model=ExamSummaryResponse, summary="Get exam overview")
async def get_exam_details(
    exam_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve single examination details."""
    exam = await ExamService.get_exam_by_id(exam_id, db)
    if current_user and current_user.role == "student":
        from app.services.activity_service import ActivityService
        await ActivityService.record_activity(
            db=db,
            user_id=current_user.id,
            activity_type="EXAM_VIEWED",
            title=f"Viewed instructions for {exam.title}",
            description=f"Read examination rules and hardware guidelines ({exam.course_code}).",
            exam_id=exam.id,
            status="INFO",
        )
    return exam

@router.get("/{exam_id}/active-attempt", summary="Check if student has an active in-progress attempt")
async def check_active_attempt(
    exam_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if candidate already has an in-progress session to resume."""
    if not current_user:
        return {"has_active": False, "attempt_id": None}
    active_id = await ExamService.get_active_attempt_for_student(
        exam_id=exam_id,
        user_id=current_user.id,
        email=current_user.email,
        db=db,
    )
    return {
        "has_active": active_id is not None,
        "has_active_attempt": active_id is not None,
        "attempt_id": active_id,
    }

@router.post("/{exam_id}/start", summary="Start exam attempt with camera verification snapshot")
async def start_exam_attempt(
    exam_id: str,
    payload: StartExamRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Candidate starts examination after completing camera verification.
    Saves verification snapshot and initializes timer session.
    """
    user_id = current_user.id if current_user else None
    if current_user:
        if current_user.full_name and payload.candidate_name == "Candidate":
            payload.candidate_name = current_user.full_name
        if current_user.email:
            payload.candidate_email = current_user.email

    attempt_id = await ExamService.start_exam_attempt(exam_id, payload, db, user_id=user_id)
    return {"status": "started", "attempt_id": attempt_id}

@router.get("/attempts/{attempt_id}", response_model=ExamAttemptDetailResponse, summary="Get active exam attempt")
async def get_exam_attempt(
    attempt_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve active exam questions (without answer keys), timer, and saved answers.
    """
    attempt_res = await ExamService.get_attempt_for_taking(attempt_id, db)
    if current_user and current_user.role == "student":
        if attempt_res.candidate_email.lower() != current_user.email.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot view another candidate's active exam attempt."
            )
    return attempt_res

@router.post("/attempts/{attempt_id}/save-answer", summary="Autosave student answer")
async def save_student_answer(
    attempt_id: str,
    payload: SaveAnswerRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Autosave individual answer in real-time as candidate clicks options.
    """
    return await ExamService.save_answer(attempt_id, payload, db)

@router.post("/attempts/{attempt_id}/submit", response_model=ExamResultResponse, summary="Submit exam & auto-grade")
async def submit_exam_attempt(attempt_id: str, db: AsyncSession = Depends(get_db)):
    """
    Finalize submission, compute auto-grading score, evaluate pass/fail, and generate audit result.
    """
    return await ExamService.submit_exam(attempt_id, db)

@router.post("/attempts/{attempt_id}/process-frame", summary="Process sampled webcam frame with OpenCV & AI proctoring")
async def process_proctoring_frame(
    attempt_id: str,
    payload: ProcessFrameRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Backend OpenCV Computer-Vision Endpoint.
    Decodes frame, runs image preprocessing, face presence monitoring, and object detection.
    Applies temporal persistence filtering and records violation if confirmed.
    """
    from app.proctoring.violation_engine import proctoring_engine
    return await proctoring_engine.process_frame(attempt_id, payload.frame_base64, db)

@router.post("/attempts/{attempt_id}/violation", summary="Record suspicious activity / 2nd face warning")
async def record_exam_violation(
    attempt_id: str,
    payload: RecordViolationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Record real-time proctoring infraction (multiple faces, no face, tab switch).
    Increments warning counter and automatically terminates exam on 3rd warning.
    """
    return await ExamService.record_violation(attempt_id, payload, db)

@router.post("/attempts/{attempt_id}/terminate", summary="Force terminate exam on severe violation")
async def terminate_exam_attempt(
    attempt_id: str,
    reason: str = "Severe integrity violation",
    db: AsyncSession = Depends(get_db)
):
    """
    Directly lock and terminate examination session.
    """
    return await ExamService.force_terminate_exam(attempt_id, reason, db)

@router.get("/attempts/{attempt_id}/result", response_model=ExamResultResponse, summary="Get exam attempt result")
async def get_exam_result(
    attempt_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve detailed score breakdown, verification photo, and time spent.
    """
    result = await ExamService.get_attempt_result(attempt_id, db)
    if current_user and current_user.role == "student":
        if result.candidate_email.lower() != current_user.email.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot view another candidate's examination scorecard."
            )
    return result

@router.post("/admin/create", summary="Admin: Create new examination")
async def admin_create_exam(
    payload: ExamAdminCreate,
    current_admin: User = Depends(require_role(["admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Faculty/Admin endpoint to create a new exam with questions and answer keys.
    """
    exam_id = await ExamService.create_exam_with_questions(payload, db, creator_id=current_admin.id)
    return {"status": "created", "exam_id": exam_id}

@router.get("/admin/attempts", summary="Admin: List all candidate submissions across exams")
async def admin_get_all_attempts(
    exam_id: Optional[str] = None,
    current_admin: User = Depends(require_role(["admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve all candidate attempts and proctoring stats for invigilator review.
    """
    attempts = await ExamService.get_exam_attempts(exam_id, db)
    return {"attempts": attempts}

@router.get("/admin/{exam_id}/attempts", summary="Admin: List candidate submissions for specific exam")
async def admin_get_exam_attempts(
    exam_id: str,
    current_admin: User = Depends(require_role(["admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve all candidate attempts and scores for a specific exam.
    """
    attempts = await ExamService.get_exam_attempts(exam_id, db)
    return {"exam_id": exam_id, "attempts": attempts}
