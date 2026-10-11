from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.deps import require_role
from app.db.models.user import User
from app.db.session import get_db
from app.services.teacher_service import TeacherService
from app.schemas.teacher import (
    TeacherOverviewResponse,
    TeacherExamItem,
    TeacherExamCreateRequest,
    TeacherExamUpdateRequest,
    TeacherResultsListResponse,
    TeacherLiveAttemptItem,
    TeacherViolationItem,
)

router = APIRouter()

class PublishToggleRequest(BaseModel):
    publish: bool

@router.get("/overview", response_model=TeacherOverviewResponse, summary="Teacher: Overview analytics & recent events")
async def get_teacher_overview(
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    is_admin = current_teacher.role in ["admin", "super_admin"]
    return await TeacherService.get_overview_stats(current_teacher.id, is_admin, db)

@router.get("/exams", response_model=List[TeacherExamItem], summary="Teacher: List created exams")
async def get_teacher_exams(
    search: Optional[str] = Query(None, description="Search by title or course code"),
    status: Optional[str] = Query(None, description="Filter by status: all, draft, published, etc."),
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    is_admin = current_teacher.role in ["admin", "super_admin"]
    return await TeacherService.get_teacher_exams(current_teacher.id, is_admin, search, status, db)

@router.post("/exams", summary="Teacher: Create a new exam with questions")
async def create_teacher_exam(
    payload: TeacherExamCreateRequest,
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    exam_id = await TeacherService.create_teacher_exam(current_teacher.id, payload, db)
    return {"status": "created", "exam_id": exam_id, "message": "Exam created successfully."}

@router.get("/exams/{exam_id}", summary="Teacher: Get full exam details with answer keys")
async def get_teacher_exam_by_id(
    exam_id: str,
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    is_admin = current_teacher.role in ["admin", "super_admin"]
    return await TeacherService.get_teacher_exam_by_id(exam_id, current_teacher.id, is_admin, db)

@router.put("/exams/{exam_id}", summary="Teacher: Update exam details and questions")
async def update_teacher_exam(
    exam_id: str,
    payload: TeacherExamUpdateRequest,
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    is_admin = current_teacher.role in ["admin", "super_admin"]
    return await TeacherService.update_teacher_exam(exam_id, current_teacher.id, payload, is_admin, db)

@router.patch("/exams/{exam_id}/publish", summary="Teacher: Toggle exam publish status")
async def toggle_publish_exam(
    exam_id: str,
    payload: PublishToggleRequest,
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    is_admin = current_teacher.role in ["admin", "super_admin"]
    return await TeacherService.toggle_publish_exam(exam_id, current_teacher.id, payload.publish, is_admin, db)

@router.delete("/exams/{exam_id}", summary="Teacher: Delete or archive exam")
async def delete_teacher_exam(
    exam_id: str,
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    is_admin = current_teacher.role in ["admin", "super_admin"]
    return await TeacherService.delete_or_archive_exam(exam_id, current_teacher.id, is_admin, db)

@router.get("/results", response_model=TeacherResultsListResponse, summary="Teacher: List all candidate submissions & scores")
async def get_teacher_results(
    exam_id: Optional[str] = Query(None, description="Filter by specific exam ID"),
    passed: Optional[bool] = Query(None, description="Filter by pass or fail status"),
    search: Optional[str] = Query(None, description="Search by student name or email"),
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    is_admin = current_teacher.role in ["admin", "super_admin"]
    return await TeacherService.get_teacher_results(current_teacher.id, is_admin, exam_id, passed, search, db)

@router.get("/results/{attempt_id}", summary="Teacher: Get itemized individual student result with answers & violations")
async def get_teacher_student_attempt_details(
    attempt_id: str,
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    is_admin = current_teacher.role in ["admin", "super_admin"]
    return await TeacherService.get_teacher_attempt_details(attempt_id, current_teacher.id, is_admin, db)

@router.get("/monitoring", response_model=List[TeacherLiveAttemptItem], summary="Teacher: List active/in-progress exam attempts")
async def get_teacher_live_monitoring(
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    is_admin = current_teacher.role in ["admin", "super_admin"]
    return await TeacherService.get_live_monitoring(current_teacher.id, is_admin, db)

@router.get("/violations", response_model=List[TeacherViolationItem], summary="Teacher: Review proctoring violations & evidence")
async def get_teacher_violations(
    exam_id: Optional[str] = Query(None, description="Filter by exam ID"),
    event_type: Optional[str] = Query(None, description="Filter by violation type (PHONE_DETECTED, TAB_SWITCH, etc.)"),
    search: Optional[str] = Query(None, description="Search by student name or email"),
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    is_admin = current_teacher.role in ["admin", "super_admin"]
    return await TeacherService.get_teacher_violations(current_teacher.id, is_admin, exam_id, event_type, search, db)

@router.get("/exams/{exam_id}/analytics", summary="Teacher: Get comprehensive analytics for specific exam")
async def get_teacher_exam_analytics(
    exam_id: str,
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns total started, submitted, evaluations status, average score, pass percentage, and violations.
    """
    is_admin = current_teacher.role in ["admin", "super_admin"]
    return await TeacherService.get_exam_analytics(exam_id, current_teacher.id, is_admin, db)

@router.get("/students/{student_id}/performance", summary="Teacher: View individual student examination performance history")
async def get_teacher_student_performance(
    student_id: str,
    current_teacher: User = Depends(require_role(["teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns student info, score trend, attempts list, and pass rate for authorized exams.
    """
    from app.services.student_dashboard_service import StudentDashboardService
    is_admin = current_teacher.role in ["admin", "super_admin"]
    return await StudentDashboardService.get_teacher_student_performance(db, current_teacher.id, is_admin, student_id)

