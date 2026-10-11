from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.exam import ExamResultResponse
from app.schemas.student_dashboard import (
    StudentFullDashboardResponse,
    StudentAttemptHistoryItem,
    StudentActivityItem,
)
from app.services.student_dashboard_service import StudentDashboardService
from app.services.activity_service import ActivityService
from app.services.exam_service import ExamService

router = APIRouter()

@router.get(
    "/me/dashboard",
    response_model=StudentFullDashboardResponse,
    summary="Get authenticated student's real-time dashboard data and analytics"
)
async def get_student_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns authentic database-persisted summary cards, complete attempt history,
    score trend, subject mastery breakdown, and chronological activity timeline.
    """
    return await StudentDashboardService.get_student_full_dashboard(db, current_user)

@router.get(
    "/me/attempts",
    response_model=List[StudentAttemptHistoryItem],
    summary="Get paginated list of student's examination attempts"
)
async def get_student_attempts(
    status_filter: Optional[str] = Query("all", alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists past and in-progress examination attempts with scores, pass/fail status, and violations.
    """
    return await StudentDashboardService.get_student_attempts_list(
        db=db,
        student=current_user,
        status_filter=status_filter,
        limit=limit,
        offset=offset
    )

@router.get(
    "/me/attempts/{attempt_id}",
    response_model=ExamResultResponse,
    summary="Get detailed score breakdown and question audit for a specific student attempt"
)
async def get_student_attempt_detail(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full question-level scorecard and proctoring logs for the authenticated student.
    Strictly forbids accessing attempts belonging to other candidates.
    """
    result = await ExamService.get_attempt_result(attempt_id, db)
    if current_user.role == "student":
        if result.candidate_email.lower() != current_user.email.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot view another student's examination records."
            )
    return result

@router.get(
    "/me/activity",
    response_model=List[StudentActivityItem],
    summary="Get chronological activity timeline for authenticated student"
)
async def get_student_activity_timeline(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves chronological student timeline (login, exam started, answer saved, exam submitted, warnings).
    """
    raw_activities = await ActivityService.get_student_activities(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )
    return [
        StudentActivityItem(
            id=act["id"],
            activity_type=act["activity_type"],
            title=act["title"],
            description=act["description"],
            exam_id=act["exam_id"],
            exam_title=act["exam_title"],
            course_code=act["course_code"],
            attempt_id=act["attempt_id"],
            status=act["status"],
            timestamp=act["timestamp"],
            details=act["details"],
        )
        for act in raw_activities
    ]
