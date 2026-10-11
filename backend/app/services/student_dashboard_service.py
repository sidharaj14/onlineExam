import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.exam import Exam, ExamAttempt, Question, ProctoringViolation, AttemptAnswer
from app.db.models.user import User, Student
from app.schemas.student_dashboard import (
    StudentDashboardSummary,
    StudentAttemptHistoryItem,
    ScoreTrendPoint,
    SubjectPerformanceItem,
    StudentAnalyticsTrend,
    StudentActivityItem,
    StudentFullDashboardResponse,
    TeacherStudentPerformanceExamItem,
    TeacherStudentPerformanceResponse,
)
from app.services.activity_service import ActivityService

logger = logging.getLogger(__name__)

class StudentDashboardService:
    @staticmethod
    async def get_student_full_dashboard(
        db: AsyncSession,
        student: User
    ) -> StudentFullDashboardResponse:
        """
        Retrieves real database-backed metrics, attempt history, score trend, and activity log.
        Uses authenticated student's identity as authoritative source.
        """
        # 1. Fetch all student attempts with exam eagerly loaded
        stmt = (
            select(ExamAttempt)
            .options(selectinload(ExamAttempt.exam))
            .where(
                or_(
                    ExamAttempt.user_id == student.id,
                    func.lower(ExamAttempt.candidate_email) == student.email.lower()
                )
            )
            .order_by(desc(ExamAttempt.started_at))
        )
        res = await db.execute(stmt)
        attempts = res.scalars().all()

        # Link any unlinked attempts to user_id
        for att in attempts:
            if not att.user_id:
                att.user_id = student.id

        # 2. Compute Summary Metrics
        total_attempted = len(attempts)
        completed_statuses = ["SUBMITTED", "TERMINATED_VIOLATION", "TIMED_OUT", "EVALUATED"]
        completed_attempts = [a for a in attempts if a.status in completed_statuses]
        in_progress_attempts = [a for a in attempts if a.status == "IN_PROGRESS"]

        scores_pct: List[float] = []
        passed_count = 0
        failed_count = 0
        pending_evals = 0
        integrity_scores: List[float] = []

        history_items: List[StudentAttemptHistoryItem] = []

        for att in attempts:
            tot = att.total_marks if att.total_marks > 0 else (att.exam.total_marks if att.exam else 100)
            sc = att.score if att.score is not None else 0.0
            pct = round((sc / tot * 100), 1) if tot > 0 else 0.0
            if att.percentage is None:
                att.percentage = pct

            if att.integrity_score is not None:
                integrity_scores.append(att.integrity_score)

            if att.status in completed_statuses:
                scores_pct.append(pct)
                if att.passed:
                    passed_count += 1
                else:
                    failed_count += 1

            if att.grading_status == "PENDING_EVALUATION":
                pending_evals += 1

            # Calculate time spent if submitted
            time_spent = None
            if att.submitted_at and att.started_at:
                st = att.started_at.replace(tzinfo=timezone.utc) if att.started_at.tzinfo is None else att.started_at
                sub = att.submitted_at.replace(tzinfo=timezone.utc) if att.submitted_at.tzinfo is None else att.submitted_at
                time_spent = max(0, int((sub - st).total_seconds()))

            history_items.append(
                StudentAttemptHistoryItem(
                    attempt_id=att.id,
                    exam_id=att.exam_id,
                    exam_title=att.exam.title if att.exam else "Examination",
                    course_code=att.exam.course_code if att.exam else "CS",
                    attempt_number=att.attempt_number or 1,
                    started_at=att.started_at,
                    submitted_at=att.submitted_at,
                    marks_obtained=sc,
                    total_marks=tot,
                    percentage=pct,
                    passed=att.passed,
                    status=att.status,
                    grading_status=att.grading_status or "AUTO_GRADED",
                    violations_count=att.violations_count or 0,
                    integrity_score=att.integrity_score if att.integrity_score is not None else 100.0,
                    time_spent_seconds=time_spent,
                    termination_reason=att.termination_reason,
                )
            )

        avg_score = round(sum(scores_pct) / len(scores_pct), 1) if scores_pct else 0.0
        high_score = round(max(scores_pct), 1) if scores_pct else 0.0
        low_score = round(min(scores_pct), 1) if scores_pct else 0.0
        pass_rate = round((passed_count / len(completed_attempts) * 100), 1) if completed_attempts else 0.0
        avg_integrity = round(sum(integrity_scores) / len(integrity_scores), 1) if integrity_scores else 100.0

        summary = StudentDashboardSummary(
            total_exams_attempted=total_attempted,
            exams_completed=len(completed_attempts),
            exams_in_progress=len(in_progress_attempts),
            average_score=avg_score,
            highest_score=high_score,
            lowest_score=low_score,
            passed_exams=passed_count,
            failed_exams=failed_count,
            pending_evaluations=pending_evals,
            average_integrity_score=avg_integrity,
            pass_rate=pass_rate,
        )

        # 3. Compute Analytics Trend & Subject Breakdown
        # Chronological order for score trend (oldest to newest)
        chronological_completed = sorted(
            completed_attempts,
            key=lambda a: a.started_at or datetime.min
        )

        score_trend: List[ScoreTrendPoint] = []
        for a in chronological_completed:
            tot = a.total_marks if a.total_marks > 0 else (a.exam.total_marks if a.exam else 100)
            sc = a.score if a.score is not None else 0.0
            pct = round((sc / tot * 100), 1) if tot > 0 else 0.0
            d_str = a.started_at.strftime("%b %d, %Y") if a.started_at else "Recent"
            score_trend.append(
                ScoreTrendPoint(
                    attempt_id=a.id,
                    exam_title=a.exam.title if a.exam else "Exam",
                    course_code=a.exam.course_code if a.exam else "CS",
                    date=d_str,
                    percentage=pct,
                    passed=bool(a.passed),
                )
            )

        # Group by Subject / Course Code
        subject_groups: Dict[str, List[float]] = {}
        subject_names: Dict[str, str] = {}
        subject_passes: Dict[str, int] = {}

        for a in completed_attempts:
            c_code = a.exam.course_code if a.exam else "GENERAL"
            t_title = a.exam.title if a.exam else c_code
            if c_code not in subject_groups:
                subject_groups[c_code] = []
                subject_names[c_code] = t_title
                subject_passes[c_code] = 0

            tot = a.total_marks if a.total_marks > 0 else (a.exam.total_marks if a.exam else 100)
            sc = a.score if a.score is not None else 0.0
            pct = round((sc / tot * 100), 1) if tot > 0 else 0.0
            subject_groups[c_code].append(pct)
            if a.passed:
                subject_passes[c_code] += 1

        subject_performance: List[SubjectPerformanceItem] = []
        for c_code, pcts in subject_groups.items():
            s_avg = round(sum(pcts) / len(pcts), 1)
            s_pass_rate = round((subject_passes[c_code] / len(pcts) * 100), 1)
            subject_performance.append(
                SubjectPerformanceItem(
                    course_code=c_code,
                    subject_name=subject_names[c_code],
                    attempts_count=len(pcts),
                    average_score=s_avg,
                    pass_rate=s_pass_rate,
                )
            )

        # Subject comparisons only if >= 2 subjects exist
        strongest_subject = None
        weakest_subject = None
        has_sufficient = len(completed_attempts) >= 2
        data_note = None

        if len(subject_performance) >= 2:
            sorted_subjects = sorted(subject_performance, key=lambda s: s.average_score, reverse=True)
            strongest_subject = f"{sorted_subjects[0].course_code} ({sorted_subjects[0].average_score}%)"
            weakest_subject = f"{sorted_subjects[-1].course_code} ({sorted_subjects[-1].average_score}%)"
        elif len(completed_attempts) == 1:
            data_note = "Only 1 completed examination on record. Complete at least 2 examinations across subjects to generate comparative performance trends."
        elif len(completed_attempts) == 0:
            data_note = "No completed examinations yet. Start your first proctored exam to view performance analytics."

        analytics = StudentAnalyticsTrend(
            score_trend=score_trend,
            subject_performance=subject_performance,
            strongest_subject=strongest_subject,
            weakest_subject=weakest_subject,
            pass_rate=pass_rate,
            has_sufficient_data=has_sufficient,
            data_note=data_note,
        )

        # 4. Fetch Chronological Activity Timeline
        recent_activities_raw = await ActivityService.get_student_activities(db, student.id, limit=20)
        recent_activities = [
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
            for act in recent_activities_raw
        ]

        return StudentFullDashboardResponse(
            student_id=student.id,
            student_name=student.full_name,
            student_email=student.email,
            summary=summary,
            recent_history=history_items,
            analytics=analytics,
            recent_activities=recent_activities,
        )

    @staticmethod
    async def get_student_attempts_list(
        db: AsyncSession,
        student: User,
        status_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[StudentAttemptHistoryItem]:
        query = (
            select(ExamAttempt)
            .options(selectinload(ExamAttempt.exam))
            .where(
                or_(
                    ExamAttempt.user_id == student.id,
                    func.lower(ExamAttempt.candidate_email) == student.email.lower()
                )
            )
        )
        if status_filter and status_filter != "all":
            query = query.where(ExamAttempt.status == status_filter.upper())

        query = query.order_by(desc(ExamAttempt.started_at)).offset(offset).limit(limit)
        res = await db.execute(query)
        attempts = res.scalars().all()

        items = []
        for att in attempts:
            tot = att.total_marks if att.total_marks > 0 else (att.exam.total_marks if att.exam else 100)
            sc = att.score if att.score is not None else 0.0
            pct = round((sc / tot * 100), 1) if tot > 0 else 0.0

            time_spent = None
            if att.submitted_at and att.started_at:
                st = att.started_at.replace(tzinfo=timezone.utc) if att.started_at.tzinfo is None else att.started_at
                sub = att.submitted_at.replace(tzinfo=timezone.utc) if att.submitted_at.tzinfo is None else att.submitted_at
                time_spent = max(0, int((sub - st).total_seconds()))

            items.append(
                StudentAttemptHistoryItem(
                    attempt_id=att.id,
                    exam_id=att.exam_id,
                    exam_title=att.exam.title if att.exam else "Examination",
                    course_code=att.exam.course_code if att.exam else "CS",
                    attempt_number=att.attempt_number or 1,
                    started_at=att.started_at,
                    submitted_at=att.submitted_at,
                    marks_obtained=sc,
                    total_marks=tot,
                    percentage=pct,
                    passed=att.passed,
                    status=att.status,
                    grading_status=att.grading_status or "AUTO_GRADED",
                    violations_count=att.violations_count or 0,
                    integrity_score=att.integrity_score if att.integrity_score is not None else 100.0,
                    time_spent_seconds=time_spent,
                    termination_reason=att.termination_reason,
                )
            )
        return items

    @staticmethod
    async def get_teacher_student_performance(
        db: AsyncSession,
        teacher_id: str,
        is_admin: bool,
        student_id: str
    ) -> TeacherStudentPerformanceResponse:
        """
        Allows authorized teachers to view an individual student's performance
        for exams they own or administer.
        """
        # Fetch student user
        student_res = await db.execute(
            select(User)
            .options(selectinload(User.student_profile))
            .where(User.id == student_id)
        )
        student = student_res.scalars().first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")

        # Determine teacher authorized exams
        exam_query = select(Exam)
        if not is_admin:
            exam_query = exam_query.where(or_(Exam.created_by_id == teacher_id, Exam.created_by_id.is_(None)))
        authorized_exams = (await db.execute(exam_query)).scalars().all()
        authorized_exam_ids = [e.id for e in authorized_exams]

        if not authorized_exam_ids:
            return TeacherStudentPerformanceResponse(
                student_id=student.id,
                full_name=student.full_name,
                email=student.email,
                student_id_number=student.student_profile.student_id_number if student.student_profile else None,
                department=student.student_profile.department if student.student_profile else None,
                course=student.student_profile.course if student.student_profile else None,
                semester=student.student_profile.semester if student.student_profile else None,
                total_attempts=0,
                completed_attempts=0,
                average_score=0.0,
                highest_score=0.0,
                pass_rate=0.0,
                attempts=[],
                score_trend=[],
            )

        # Query attempts for this student on authorized exams
        att_stmt = (
            select(ExamAttempt)
            .options(selectinload(ExamAttempt.exam))
            .where(
                ExamAttempt.exam_id.in_(authorized_exam_ids),
                or_(
                    ExamAttempt.user_id == student.id,
                    func.lower(ExamAttempt.candidate_email) == student.email.lower()
                )
            )
            .order_by(desc(ExamAttempt.started_at))
        )
        attempts = (await db.execute(att_stmt)).scalars().all()

        scores_pct: List[float] = []
        passed_count = 0
        attempts_items: List[TeacherStudentPerformanceExamItem] = []

        for att in attempts:
            tot = att.total_marks if att.total_marks > 0 else (att.exam.total_marks if att.exam else 100)
            sc = att.score if att.score is not None else 0.0
            pct = round((sc / tot * 100), 1) if tot > 0 else 0.0

            if att.status in ["SUBMITTED", "TERMINATED_VIOLATION", "TIMED_OUT", "EVALUATED"]:
                scores_pct.append(pct)
                if att.passed:
                    passed_count += 1

            attempts_items.append(
                TeacherStudentPerformanceExamItem(
                    attempt_id=att.id,
                    exam_id=att.exam_id,
                    exam_title=att.exam.title if att.exam else "Exam",
                    course_code=att.exam.course_code if att.exam else "CS",
                    attempt_number=att.attempt_number or 1,
                    started_at=att.started_at,
                    submitted_at=att.submitted_at,
                    score=sc,
                    total_marks=tot,
                    percentage=pct,
                    passed=att.passed,
                    status=att.status,
                    grading_status=att.grading_status or "AUTO_GRADED",
                    violations_count=att.violations_count or 0,
                    integrity_score=att.integrity_score if att.integrity_score is not None else 100.0,
                )
            )

        completed_count = len(scores_pct)
        avg_score = round(sum(scores_pct) / completed_count, 1) if completed_count else 0.0
        high_score = round(max(scores_pct), 1) if completed_count else 0.0
        pass_rate = round((passed_count / completed_count * 100), 1) if completed_count else 0.0

        score_trend = [
            ScoreTrendPoint(
                attempt_id=a.id,
                exam_title=a.exam.title if a.exam else "Exam",
                course_code=a.exam.course_code if a.exam else "CS",
                date=a.started_at.strftime("%b %d") if a.started_at else "",
                percentage=round(((a.score or 0.0) / max(1, a.total_marks or 100)) * 100, 1),
                passed=bool(a.passed),
            )
            for a in sorted(attempts, key=lambda x: x.started_at or datetime.min)
            if a.status in ["SUBMITTED", "TERMINATED_VIOLATION", "TIMED_OUT", "EVALUATED"]
        ]

        return TeacherStudentPerformanceResponse(
            student_id=student.id,
            full_name=student.full_name,
            email=student.email,
            student_id_number=student.student_profile.student_id_number if student.student_profile else None,
            department=student.student_profile.department if student.student_profile else None,
            course=student.student_profile.course if student.student_profile else None,
            semester=student.student_profile.semester if student.student_profile else None,
            total_attempts=len(attempts),
            completed_attempts=completed_count,
            average_score=avg_score,
            highest_score=high_score,
            pass_rate=pass_rate,
            attempts=attempts_items,
            score_trend=score_trend,
        )
