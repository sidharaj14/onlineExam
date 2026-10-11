import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import func, select, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.exam import Exam, Question, ExamAttempt, AttemptAnswer, ProctoringViolation, SecurityAuditLog
from app.db.models.user import User
from app.schemas.teacher import (
    TeacherOverviewResponse,
    TeacherOverviewStats,
    RecentActivityItem,
    ExamViolationRank,
    TeacherExamItem,
    TeacherExamCreateRequest,
    TeacherExamUpdateRequest,
    TeacherResultsListResponse,
    TeacherResultsAnalytics,
    TeacherStudentResultItem,
    ScoreDistributionBucket,
    TeacherLiveAttemptItem,
    TeacherViolationItem,
)

logger = logging.getLogger(__name__)

class TeacherService:

    @staticmethod
    async def get_overview_stats(teacher_id: str, is_admin: bool, db: AsyncSession) -> TeacherOverviewResponse:
        # Base query for teacher's exams
        exam_query = select(Exam)
        if not is_admin:
            exam_query = exam_query.where(or_(Exam.created_by_id == teacher_id, Exam.created_by_id.is_(None)))
        
        exam_res = await db.execute(exam_query)
        exams = exam_res.scalars().all()
        exam_ids = [e.id for e in exams]

        if not exams or not exam_ids:
            return TeacherOverviewResponse(
                stats=TeacherOverviewStats(),
                recent_activity=[],
                top_violation_exams=[]
            )

        total_exams = len(exams)
        published_exams = sum(1 for e in exams if e.is_published and e.is_active)
        draft_exams = sum(1 for e in exams if not e.is_published and e.is_active)
        scheduled_ongoing = sum(1 for e in exams if e.status in ["SCHEDULED", "ONGOING"])

        # Fetch attempts for these exams with exam details eagerly loaded
        attempts_stmt = (
            select(ExamAttempt)
            .options(selectinload(ExamAttempt.exam))
            .where(ExamAttempt.exam_id.in_(exam_ids))
            .order_by(ExamAttempt.started_at.desc())
        )
        attempts_res = await db.execute(attempts_stmt)
        attempts = attempts_res.scalars().all()

        total_completed = 0
        unique_students = set()
        scores_pct: List[float] = []
        passed_count = 0
        total_violations = 0
        exam_violations_map: Dict[str, int] = {e.id: 0 for e in exams}

        for att in attempts:
            unique_students.add(att.candidate_email.lower())
            total_violations += (att.violations_count or 0)
            exam_violations_map[att.exam_id] = exam_violations_map.get(att.exam_id, 0) + (att.violations_count or 0)

            if att.status in ["SUBMITTED", "TERMINATED_VIOLATION", "TIMED_OUT"]:
                total_completed += 1
                tot = att.total_marks if att.total_marks > 0 else 100
                pct = round(((att.score or 0.0) / tot) * 100, 1)
                scores_pct.append(pct)
                if att.passed:
                    passed_count += 1

        avg_score = round(sum(scores_pct) / len(scores_pct), 1) if scores_pct else 0.0
        high_score = round(max(scores_pct), 1) if scores_pct else 0.0
        low_score = round(min(scores_pct), 1) if scores_pct else 0.0
        pass_pct = round((passed_count / total_completed * 100), 1) if total_completed > 0 else 0.0
        completion_rate = round((total_completed / len(attempts) * 100), 1) if attempts else 0.0

        stats = TeacherOverviewStats(
            total_exams=total_exams,
            published_exams=published_exams,
            draft_exams=draft_exams,
            scheduled_ongoing_exams=scheduled_ongoing,
            total_students_attempted=len(unique_students),
            total_completed_attempts=total_completed,
            average_score=avg_score,
            total_violations=total_violations,
            highest_score=high_score,
            lowest_score=low_score,
            pass_percentage=pass_pct,
            completion_rate=completion_rate,
        )

        # Recent activities
        recent_activity: List[RecentActivityItem] = []
        for att in attempts[:8]:
            if att.status == "TERMINATED_VIOLATION":
                recent_activity.append(RecentActivityItem(
                    id=f"act-term-{att.id}",
                    event_type="VIOLATION_TERMINATION",
                    description=f"{att.candidate_name} disqualified due to integrity violations in {att.exam.title if att.exam else 'Exam'}.",
                    timestamp=att.submitted_at.isoformat() if att.submitted_at else att.started_at.isoformat(),
                    severity="CRITICAL"
                ))
            elif att.status == "SUBMITTED":
                recent_activity.append(RecentActivityItem(
                    id=f"act-sub-{att.id}",
                    event_type="EXAM_SUBMITTED",
                    description=f"{att.candidate_name} submitted {att.exam.title if att.exam else 'Exam'} (Score: {att.score or 0.0}).",
                    timestamp=att.submitted_at.isoformat() if att.submitted_at else att.started_at.isoformat(),
                    severity="SUCCESS"
                ))
            elif att.status == "IN_PROGRESS":
                recent_activity.append(RecentActivityItem(
                    id=f"act-start-{att.id}",
                    event_type="ATTEMPT_STARTED",
                    description=f"{att.candidate_name} started examination attempt for {att.exam.title if att.exam else 'Exam'}.",
                    timestamp=att.started_at.isoformat(),
                    severity="INFO"
                ))

        # Top violation exams
        top_violation_exams: List[ExamViolationRank] = []
        sorted_exams_by_v = sorted(
            [e for e in exams if exam_violations_map.get(e.id, 0) > 0],
            key=lambda e: exam_violations_map.get(e.id, 0),
            reverse=True
        )[:5]

        for e in sorted_exams_by_v:
            top_violation_exams.append(ExamViolationRank(
                exam_id=e.id,
                title=e.title,
                course_code=e.course_code,
                violations_count=exam_violations_map[e.id]
            ))

        return TeacherOverviewResponse(
            stats=stats,
            recent_activity=recent_activity,
            top_violation_exams=top_violation_exams
        )

    @staticmethod
    async def get_teacher_exams(
        teacher_id: str,
        is_admin: bool,
        search: Optional[str],
        status_filter: Optional[str],
        db: AsyncSession
    ) -> List[TeacherExamItem]:
        query = select(Exam).options(
            selectinload(Exam.questions),
            selectinload(Exam.attempts)
        )

        if not is_admin:
            query = query.where(or_(Exam.created_by_id == teacher_id, Exam.created_by_id.is_(None)))

        if search:
            s_clean = f"%{search.strip().lower()}%"
            query = query.where(
                or_(
                    func.lower(Exam.title).like(s_clean),
                    func.lower(Exam.course_code).like(s_clean),
                    func.lower(Exam.description).like(s_clean)
                )
            )

        if status_filter and status_filter.lower() != "all":
            sf = status_filter.upper()
            if sf == "DRAFT":
                query = query.where(Exam.is_published == False)
            elif sf == "PUBLISHED":
                query = query.where(Exam.is_published == True)
            else:
                query = query.where(Exam.status == sf)

        query = query.order_by(Exam.created_at.desc())
        res = await db.execute(query)
        exams = res.scalars().all()

        items: List[TeacherExamItem] = []
        for e in exams:
            attempts = e.attempts or []
            participants_count = len(set(a.candidate_email.lower() for a in attempts))
            completed_attempts = [a for a in attempts if a.status in ["SUBMITTED", "TERMINATED_VIOLATION", "TIMED_OUT"]]
            submitted_count = len(completed_attempts)

            scores = []
            for a in completed_attempts:
                tot = a.total_marks if a.total_marks > 0 else e.total_marks
                scores.append(((a.score or 0.0) / max(1, tot)) * 100)

            avg_score = round(sum(scores) / len(scores), 1) if scores else None
            computed_status = e.status
            if not e.is_published:
                computed_status = "DRAFT"
            elif not e.is_active:
                computed_status = "ARCHIVED"

            items.append(TeacherExamItem(
                id=e.id,
                title=e.title,
                course_code=e.course_code,
                description=e.description,
                duration_minutes=e.duration_minutes,
                total_marks=e.total_marks,
                passing_marks=e.passing_marks,
                is_published=e.is_published,
                is_active=e.is_active,
                status=computed_status,
                start_time=e.start_time,
                end_time=e.end_time,
                question_count=len(e.questions or []),
                participants_count=participants_count,
                submitted_count=submitted_count,
                average_score=avg_score,
                created_at=e.created_at
            ))

        return items

    @staticmethod
    async def create_teacher_exam(teacher_id: str, payload: TeacherExamCreateRequest, db: AsyncSession) -> str:
        # Validate questions
        calculated_total = sum(q.marks for q in payload.questions) if payload.questions else 0
        if payload.is_published and payload.questions and calculated_total != payload.total_marks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Question marks sum ({calculated_total}) does not match exam total marks ({payload.total_marks})."
            )

        status_str = "PUBLISHED" if payload.is_published else "DRAFT"

        new_exam = Exam(
            title=payload.title.strip(),
            course_code=payload.course_code.strip().upper(),
            description=payload.description.strip() if payload.description else None,
            duration_minutes=payload.duration_minutes,
            total_marks=payload.total_marks,
            passing_marks=payload.passing_marks,
            is_published=payload.is_published,
            is_active=True,
            status=status_str,
            start_time=payload.start_time,
            end_time=payload.end_time,
            created_by_id=teacher_id,
        )
        db.add(new_exam)
        await db.flush()

        for idx, q_data in enumerate(payload.questions):
            q_options = [opt.model_dump() for opt in q_data.options]
            question = Question(
                exam_id=new_exam.id,
                question_text=q_data.question_text.strip(),
                question_type=q_data.question_type or "MCQ",
                marks=q_data.marks,
                order_index=q_data.order_index if q_data.order_index else (idx + 1),
                options_json=json.dumps(q_options),
                correct_answer_json=json.dumps(q_data.correct_answer),
                explanation=q_data.explanation.strip() if q_data.explanation else None,
            )
            db.add(question)

        # Log audit
        audit = SecurityAuditLog(
            user_id=teacher_id,
            action="EXAM_CREATED",
            details_json=json.dumps({"exam_id": new_exam.id, "title": new_exam.title, "published": payload.is_published}),
        )
        db.add(audit)

        await db.commit()
        await db.refresh(new_exam)
        return new_exam.id

    @staticmethod
    async def get_teacher_exam_by_id(exam_id: str, teacher_id: str, is_admin: bool, db: AsyncSession) -> Dict[str, Any]:
        stmt = (
            select(Exam)
            .options(selectinload(Exam.questions), selectinload(Exam.attempts))
            .where(Exam.id == exam_id)
        )
        res = await db.execute(stmt)
        exam = res.scalars().first()

        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found.")

        if not is_admin and exam.created_by_id and exam.created_by_id != teacher_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not own this examination.")

        questions_list = []
        for q in exam.questions:
            options_raw = json.loads(q.options_json) if q.options_json else []
            correct_ans = json.loads(q.correct_answer_json) if q.correct_answer_json else q.correct_answer_json
            questions_list.append({
                "id": q.id,
                "exam_id": q.exam_id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "marks": q.marks,
                "order_index": q.order_index,
                "options": options_raw,
                "correct_answer": correct_ans,
                "explanation": q.explanation,
            })

        attempts_count = len(exam.attempts or [])
        completed_count = sum(1 for a in (exam.attempts or []) if a.status in ["SUBMITTED", "TERMINATED_VIOLATION"])

        return {
            "id": exam.id,
            "title": exam.title,
            "course_code": exam.course_code,
            "description": exam.description,
            "duration_minutes": exam.duration_minutes,
            "total_marks": exam.total_marks,
            "passing_marks": exam.passing_marks,
            "is_published": exam.is_published,
            "is_active": exam.is_active,
            "status": exam.status,
            "start_time": exam.start_time.isoformat() if exam.start_time else None,
            "end_time": exam.end_time.isoformat() if exam.end_time else None,
            "created_by_id": exam.created_by_id,
            "created_at": exam.created_at.isoformat(),
            "questions": questions_list,
            "attempts_count": attempts_count,
            "completed_count": completed_count,
            "has_active_attempts": attempts_count > 0,
        }

    @staticmethod
    async def update_teacher_exam(
        exam_id: str,
        teacher_id: str,
        payload: TeacherExamUpdateRequest,
        is_admin: bool,
        db: AsyncSession
    ) -> Dict[str, Any]:
        stmt = (
            select(Exam)
            .options(selectinload(Exam.questions), selectinload(Exam.attempts))
            .where(Exam.id == exam_id)
        )
        res = await db.execute(stmt)
        exam = res.scalars().first()

        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found.")

        if not is_admin and exam.created_by_id and exam.created_by_id != teacher_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not own this examination.")

        attempts_count = len(exam.attempts or [])

        # Prevent unsafe question modifications if attempts exist
        if attempts_count > 0 and payload.questions is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot modify questions or answer keys because {attempts_count} candidate attempt(s) already exist for this exam."
            )

        if payload.title is not None:
            exam.title = payload.title.strip()
        if payload.course_code is not None:
            exam.course_code = payload.course_code.strip().upper()
        if payload.description is not None:
            exam.description = payload.description.strip()
        if payload.duration_minutes is not None:
            exam.duration_minutes = payload.duration_minutes
        if payload.total_marks is not None:
            exam.total_marks = payload.total_marks
        if payload.passing_marks is not None:
            exam.passing_marks = payload.passing_marks
        if payload.start_time is not None:
            exam.start_time = payload.start_time
        if payload.end_time is not None:
            exam.end_time = payload.end_time
        if payload.is_published is not None:
            exam.is_published = payload.is_published
            exam.status = "PUBLISHED" if payload.is_published else "DRAFT"
        if payload.status is not None:
            exam.status = payload.status

        # If questions are provided and no attempts exist, replace questions
        if payload.questions is not None and attempts_count == 0:
            calc_marks = sum(q.marks for q in payload.questions)
            if exam.is_published and calc_marks != exam.total_marks:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Sum of question marks ({calc_marks}) does not equal exam total marks ({exam.total_marks})."
                )

            # Delete old questions
            for old_q in exam.questions:
                await db.delete(old_q)
            await db.flush()

            # Insert new questions
            for idx, q_data in enumerate(payload.questions):
                q_options = [opt.model_dump() for opt in q_data.options]
                new_q = Question(
                    exam_id=exam.id,
                    question_text=q_data.question_text.strip(),
                    question_type=q_data.question_type or "MCQ",
                    marks=q_data.marks,
                    order_index=q_data.order_index if q_data.order_index else (idx + 1),
                    options_json=json.dumps(q_options),
                    correct_answer_json=json.dumps(q_data.correct_answer),
                    explanation=q_data.explanation.strip() if q_data.explanation else None,
                )
                db.add(new_q)

        await db.commit()
        await db.refresh(exam)
        return {"status": "updated", "exam_id": exam.id}

    @staticmethod
    async def toggle_publish_exam(exam_id: str, teacher_id: str, publish: bool, is_admin: bool, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(Exam).options(selectinload(Exam.questions)).where(Exam.id == exam_id)
        res = await db.execute(stmt)
        exam = res.scalars().first()

        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found.")

        if not is_admin and exam.created_by_id and exam.created_by_id != teacher_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not own this examination.")

        if publish:
            # Validate question count
            if not exam.questions:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot publish an exam with no questions. Please add questions first.")
            calc_marks = sum(q.marks for q in exam.questions)
            if calc_marks != exam.total_marks:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Question marks sum ({calc_marks}) must equal total marks ({exam.total_marks}) before publishing."
                )
            exam.is_published = True
            exam.status = "PUBLISHED"
        else:
            exam.is_published = False
            exam.status = "DRAFT"

        await db.commit()
        return {"status": "ok", "exam_id": exam.id, "is_published": exam.is_published, "status_label": exam.status}

    @staticmethod
    async def delete_or_archive_exam(exam_id: str, teacher_id: str, is_admin: bool, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(Exam).options(selectinload(Exam.attempts)).where(Exam.id == exam_id)
        res = await db.execute(stmt)
        exam = res.scalars().first()

        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found.")

        if not is_admin and exam.created_by_id and exam.created_by_id != teacher_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not own this examination.")

        if exam.attempts and len(exam.attempts) > 0:
            # Archive exam to preserve student records
            exam.is_active = False
            exam.is_published = False
            exam.status = "ARCHIVED"
            await db.commit()
            return {"status": "archived", "message": "Exam has existing student attempts and was archived rather than deleted."}
        else:
            await db.delete(exam)
            await db.commit()
            return {"status": "deleted", "message": "Exam deleted successfully."}

    @staticmethod
    async def get_teacher_results(
        teacher_id: str,
        is_admin: bool,
        exam_id: Optional[str],
        passed: Optional[bool],
        search: Optional[str],
        db: AsyncSession
    ) -> TeacherResultsListResponse:
        # Get teacher's exam ids
        exam_query = select(Exam)
        if not is_admin:
            exam_query = exam_query.where(or_(Exam.created_by_id == teacher_id, Exam.created_by_id.is_(None)))
        if exam_id and exam_id != "all":
            exam_query = exam_query.where(Exam.id == exam_id)

        exam_res = await db.execute(exam_query)
        exams = exam_res.scalars().all()
        exam_ids = [e.id for e in exams]

        if not exam_ids:
            return TeacherResultsListResponse(
                attempts=[],
                analytics=TeacherResultsAnalytics()
            )

        query = select(ExamAttempt).options(selectinload(ExamAttempt.exam)).where(ExamAttempt.exam_id.in_(exam_ids))

        if passed is not None:
            query = query.where(ExamAttempt.passed == passed)

        if search:
            s_clean = f"%{search.strip().lower()}%"
            query = query.where(
                or_(
                    func.lower(ExamAttempt.candidate_name).like(s_clean),
                    func.lower(ExamAttempt.candidate_email).like(s_clean)
                )
            )

        query = query.order_by(ExamAttempt.started_at.desc())
        res = await db.execute(query)
        attempts = res.scalars().all()

        items: List[TeacherStudentResultItem] = []
        scores: List[float] = []
        submitted_count = 0
        in_progress_count = 0
        passed_count = 0

        # Distribution buckets
        b_0_40 = 0
        b_41_60 = 0
        b_61_80 = 0
        b_81_100 = 0

        for a in attempts:
            tot = a.total_marks if a.total_marks > 0 else (a.exam.total_marks if a.exam else 100)
            pct = round(((a.score or 0.0) / max(1, tot)) * 100, 1)

            if a.status in ["SUBMITTED", "TERMINATED_VIOLATION", "TIMED_OUT"]:
                submitted_count += 1
                scores.append(pct)
                if a.passed:
                    passed_count += 1

                if pct <= 40:
                    b_0_40 += 1
                elif pct <= 60:
                    b_41_60 += 1
                elif pct <= 80:
                    b_61_80 += 1
                else:
                    b_81_100 += 1
            else:
                in_progress_count += 1

            items.append(TeacherStudentResultItem(
                attempt_id=a.id,
                student_name=a.candidate_name,
                student_email=a.candidate_email,
                exam_id=a.exam_id,
                exam_title=a.exam.title if a.exam else "Examination",
                course_code=a.exam.course_code if a.exam else "GENERAL",
                total_marks=tot,
                score=a.score or 0.0,
                percentage=pct,
                passed=a.passed,
                status=a.status,
                started_at=a.started_at,
                submitted_at=a.submitted_at,
                violations_count=a.violations_count or 0,
                integrity_score=a.integrity_score if a.integrity_score is not None else 100.0,
            ))

        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
        high_score = round(max(scores), 1) if scores else 0.0
        low_score = round(min(scores), 1) if scores else 0.0
        pass_pct = round((passed_count / submitted_count * 100), 1) if submitted_count > 0 else 0.0

        analytics = TeacherResultsAnalytics(
            total_attempts=len(attempts),
            submitted_count=submitted_count,
            in_progress_count=in_progress_count,
            average_score=avg_score,
            highest_score=high_score,
            lowest_score=low_score,
            pass_percentage=pass_pct,
            score_distribution=[
                ScoreDistributionBucket(range="0-40%", count=b_0_40),
                ScoreDistributionBucket(range="41-60%", count=b_41_60),
                ScoreDistributionBucket(range="61-80%", count=b_61_80),
                ScoreDistributionBucket(range="81-100%", count=b_81_100),
            ]
        )

        return TeacherResultsListResponse(
            attempts=items,
            analytics=analytics
        )

    @staticmethod
    async def get_teacher_attempt_details(attempt_id: str, teacher_id: str, is_admin: bool, db: AsyncSession) -> Dict[str, Any]:
        stmt = (
            select(ExamAttempt)
            .options(
                selectinload(ExamAttempt.exam).selectinload(Exam.questions),
                selectinload(ExamAttempt.recorded_violations),
                selectinload(ExamAttempt.recorded_answers)
            )
            .where(ExamAttempt.id == attempt_id)
        )
        res = await db.execute(stmt)
        attempt = res.scalars().first()

        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam attempt not found.")

        if not is_admin and attempt.exam and attempt.exam.created_by_id and attempt.exam.created_by_id != teacher_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not own this examination.")

        user_answers = json.loads(attempt.answers_json) if attempt.answers_json else {}
        questions_breakdown = []

        if attempt.exam and attempt.exam.questions:
            for q in attempt.exam.questions:
                options_raw = json.loads(q.options_json) if q.options_json else []
                correct_ans = json.loads(q.correct_answer_json) if q.correct_answer_json else q.correct_answer_json
                student_ans = user_answers.get(q.id)

                is_correct = False
                if isinstance(correct_ans, list):
                    if isinstance(student_ans, list) and sorted(student_ans) == sorted(correct_ans):
                        is_correct = True
                else:
                    if student_ans is not None and str(student_ans).strip().upper() == str(correct_ans).strip().upper():
                        is_correct = True

                questions_breakdown.append({
                    "question_id": q.id,
                    "question_text": q.question_text,
                    "question_type": q.question_type,
                    "marks": q.marks,
                    "marks_awarded": q.marks if is_correct else 0,
                    "options": options_raw,
                    "student_answer": student_ans,
                    "correct_answer": correct_ans,
                    "is_correct": is_correct,
                    "explanation": q.explanation,
                })

        violations_raw = json.loads(attempt.violations_json) if attempt.violations_json else []

        time_spent_sec = 0
        if attempt.started_at and attempt.submitted_at:
            time_spent_sec = int((attempt.submitted_at.replace(tzinfo=timezone.utc) - attempt.started_at.replace(tzinfo=timezone.utc)).total_seconds())

        return {
            "attempt_id": attempt.id,
            "student_name": attempt.candidate_name,
            "student_email": attempt.candidate_email,
            "verification_photo_url": attempt.verification_photo_url,
            "exam_id": attempt.exam_id,
            "exam_title": attempt.exam.title if attempt.exam else "Examination",
            "course_code": attempt.exam.course_code if attempt.exam else "GENERAL",
            "status": attempt.status,
            "score": attempt.score or 0.0,
            "total_marks": attempt.total_marks or (attempt.exam.total_marks if attempt.exam else 100),
            "percentage": round(((attempt.score or 0.0) / max(1, attempt.total_marks or 100)) * 100, 1),
            "passed": attempt.passed,
            "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            "time_spent_seconds": time_spent_sec,
            "integrity_score": attempt.integrity_score if attempt.integrity_score is not None else 100.0,
            "violations_count": attempt.violations_count or 0,
            "violations": violations_raw,
            "questions_breakdown": questions_breakdown,
        }

    @staticmethod
    async def get_live_monitoring(teacher_id: str, is_admin: bool, db: AsyncSession) -> List[TeacherLiveAttemptItem]:
        # Get teacher's exam ids
        exam_query = select(Exam)
        if not is_admin:
            exam_query = exam_query.where(or_(Exam.created_by_id == teacher_id, Exam.created_by_id.is_(None)))
        
        exam_res = await db.execute(exam_query)
        exams = exam_res.scalars().all()
        exam_ids = [e.id for e in exams]

        if not exam_ids:
            return []

        query = (
            select(ExamAttempt)
            .options(selectinload(ExamAttempt.exam))
            .where(
                ExamAttempt.exam_id.in_(exam_ids),
                ExamAttempt.status == "IN_PROGRESS"
            )
            .order_by(ExamAttempt.started_at.desc())
        )
        res = await db.execute(query)
        active_attempts = res.scalars().all()

        now = datetime.now(timezone.utc)
        items: List[TeacherLiveAttemptItem] = []

        for att in active_attempts:
            st = att.started_at
            if st.tzinfo is None:
                st = st.replace(tzinfo=timezone.utc)
            elapsed = max(0, int((now - st).total_seconds() / 60))

            latest_v = None
            if att.violations_json:
                try:
                    v_list = json.loads(att.violations_json)
                    if v_list:
                        latest_v = v_list[-1].get("violation_type")
                except Exception:
                    pass

            items.append(TeacherLiveAttemptItem(
                attempt_id=att.id,
                student_name=att.candidate_name,
                student_email=att.candidate_email,
                exam_id=att.exam_id,
                exam_title=att.exam.title if att.exam else "Examination",
                course_code=att.exam.course_code if att.exam else "GENERAL",
                status=att.status,
                started_at=att.started_at,
                elapsed_minutes=elapsed,
                violations_count=att.violations_count or 0,
                integrity_score=att.integrity_score if att.integrity_score is not None else 100.0,
                latest_violation=latest_v,
            ))

        return items

    @staticmethod
    async def get_teacher_violations(
        teacher_id: str,
        is_admin: bool,
        exam_id: Optional[str],
        event_type: Optional[str],
        search: Optional[str],
        db: AsyncSession
    ) -> List[TeacherViolationItem]:
        # Get teacher's exams
        exam_query = select(Exam)
        if not is_admin:
            exam_query = exam_query.where(or_(Exam.created_by_id == teacher_id, Exam.created_by_id.is_(None)))
        if exam_id and exam_id != "all":
            exam_query = exam_query.where(Exam.id == exam_id)

        exam_res = await db.execute(exam_query)
        exams = exam_res.scalars().all()
        exam_ids = [e.id for e in exams]

        if not exam_ids:
            return []

        query = (
            select(ProctoringViolation, ExamAttempt, Exam)
            .join(ExamAttempt, ProctoringViolation.attempt_id == ExamAttempt.id)
            .join(Exam, ExamAttempt.exam_id == Exam.id)
            .where(Exam.id.in_(exam_ids))
        )

        if event_type and event_type.lower() != "all":
            query = query.where(ProctoringViolation.event_type == event_type.upper())

        if search:
            s_clean = f"%{search.strip().lower()}%"
            query = query.where(
                or_(
                    func.lower(ExamAttempt.candidate_name).like(s_clean),
                    func.lower(ExamAttempt.candidate_email).like(s_clean),
                    func.lower(Exam.title).like(s_clean)
                )
            )

        query = query.order_by(ProctoringViolation.timestamp.desc())
        res = await db.execute(query)
        rows = res.all()

        items: List[TeacherViolationItem] = []
        for viol, att, exam in rows:
            items.append(TeacherViolationItem(
                id=viol.id,
                attempt_id=att.id,
                student_name=att.candidate_name,
                student_email=att.candidate_email,
                exam_id=exam.id,
                exam_title=exam.title,
                course_code=exam.course_code,
                event_type=viol.event_type,
                severity=viol.severity,
                strike_number=viol.strike_number,
                evidence_path=viol.evidence_path,
                message=viol.message,
                timestamp=viol.timestamp,
            ))

        return items

    @staticmethod
    async def get_exam_analytics(
        exam_id: str,
        teacher_id: str,
        is_admin: bool,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Calculates comprehensive exam analytics for teacher dashboard."""
        exam = await db.get(Exam, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Examination not found.")

        if not is_admin and exam.created_by_id and exam.created_by_id != teacher_id:
            raise HTTPException(status_code=403, detail="Unauthorized to view analytics for this exam.")

        attempts_res = await db.execute(
            select(ExamAttempt).where(ExamAttempt.exam_id == exam_id)
        )
        attempts = attempts_res.scalars().all()

        completed = [a for a in attempts if a.status in ["SUBMITTED", "TERMINATED_VIOLATION", "TIMED_OUT", "EVALUATED"]]
        completed_evals = [a for a in attempts if getattr(a, "grading_status", "AUTO_GRADED") in ["AUTO_GRADED", "EVALUATED"]]
        pending_evals = [a for a in attempts if getattr(a, "grading_status", None) == "PENDING_EVALUATION"]

        scores = [a.score for a in completed if a.score is not None]
        passed = sum(1 for a in completed if a.passed)
        total_violations = sum(a.violations_count or 0 for a in attempts)

        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
        high_score = round(max(scores), 1) if scores else 0.0
        low_score = round(min(scores), 1) if scores else 0.0
        pass_pct = round(passed / len(completed) * 100, 1) if completed else 0.0

        return {
            "exam_id": exam.id,
            "exam_title": exam.title,
            "course_code": exam.course_code,
            "total_marks": exam.total_marks,
            "passing_marks": exam.passing_marks,
            "total_started": len(attempts),
            "total_submitted": len(completed),
            "completed_evaluations": len(completed_evals),
            "pending_evaluations": len(pending_evals),
            "average_score": avg_score,
            "highest_score": high_score,
            "lowest_score": low_score,
            "pass_percentage": pass_pct,
            "total_violations": total_violations,
        }

