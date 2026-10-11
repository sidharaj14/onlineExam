import os
import json
import base64
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.models.exam import (
    Exam,
    Question,
    ExamAttempt,
    AttemptAnswer,
    ProctoringViolation,
    SecurityAuditLog,
)
from app.schemas.exam import (
    StartExamRequest,
    SaveAnswerRequest,
    ExamSummaryResponse,
    ExamAttemptDetailResponse,
    QuestionPublicResponse,
    OptionSchema,
    ExamResultResponse,
    QuestionResultItem,
    ExamAdminCreate,
    ViolationItem,
    RecordViolationRequest,
    StudentAnalyticsResponse,
    StudentAttemptItem,
    SubjectPerformanceItem,
)

VERIFICATION_DIR = os.path.join(os.getcwd(), "storage", "verifications")
os.makedirs(VERIFICATION_DIR, exist_ok=True)

VIOLATIONS_DIR = os.path.join(os.getcwd(), "storage", "violations")
os.makedirs(VIOLATIONS_DIR, exist_ok=True)

class ExamService:
    @staticmethod
    async def seed_default_exam_if_empty(db: AsyncSession) -> None:
        """Auto-seed a rich default examination if none exists."""
        stmt = select(func.count(Exam.id))
        count = (await db.execute(stmt)).scalar() or 0
        if count > 0:
            return

        demo_exam = Exam(
            title="CS301: Advanced Data Structures & Algorithms",
            course_code="CS301",
            description="Official Midterm Examination covering Trees, Graphs, Dynamic Programming, and Computational Complexity. Closed-book, AI proctored.",
            duration_minutes=45,
            total_marks=50,
            passing_marks=20,
            is_published=True,
            is_active=True,
        )
        db.add(demo_exam)
        await db.flush()

        questions_data = [
            {
                "question_text": "What is the worst-case time complexity of lookup in a Red-Black Balanced Binary Search Tree with N elements?",
                "question_type": "MCQ",
                "marks": 10,
                "order_index": 1,
                "options": [
                    {"id": "A", "text": "O(1)"},
                    {"id": "B", "text": "O(log N)"},
                    {"id": "C", "text": "O(N)"},
                    {"id": "D", "text": "O(N log N)"},
                ],
                "correct_answer": "B",
                "explanation": "In a Red-Black tree, the height is strictly bounded by 2 * log2(N + 1), guaranteeing O(log N) worst-case lookup.",
            },
            {
                "question_text": "Which graph algorithm finds the shortest paths from a single source vertex to all other vertices in a weighted graph with negative edge weights (assuming no negative cycles)?",
                "question_type": "MCQ",
                "marks": 10,
                "order_index": 2,
                "options": [
                    {"id": "A", "text": "Dijkstra's Algorithm"},
                    {"id": "B", "text": "Kruskal's Algorithm"},
                    {"id": "C", "text": "Bellman-Ford Algorithm"},
                    {"id": "D", "text": "Prim's Algorithm"},
                ],
                "correct_answer": "C",
                "explanation": "Bellman-Ford runs in O(V * E) and handles negative edge weights, detecting negative cycles unlike Dijkstra.",
            },
            {
                "question_text": "Which of the following data structures is typically used to implement Breadth-First Search (BFS) in a graph?",
                "question_type": "MCQ",
                "marks": 10,
                "order_index": 3,
                "options": [
                    {"id": "A", "text": "Stack"},
                    {"id": "B", "text": "Queue (FIFO)"},
                    {"id": "C", "text": "Priority Queue / Min-Heap"},
                    {"id": "D", "text": "Disjoint Set Union (DSU)"},
                ],
                "correct_answer": "B",
                "explanation": "BFS uses a FIFO Queue to visit neighbors level-by-level.",
            },
            {
                "question_text": "Which of the following problems belong to the NP-Complete complexity class? (Select the most accurate)",
                "question_type": "MCQ",
                "marks": 10,
                "order_index": 4,
                "options": [
                    {"id": "A", "text": "Boolean 3-Satisfiability (3-SAT)"},
                    {"id": "B", "text": "Shortest Path in Unweighted Graph"},
                    {"id": "C", "text": "Minimum Spanning Tree"},
                    {"id": "D", "text": "Merge Sort"},
                ],
                "correct_answer": "A",
                "explanation": "3-SAT is one of Karp's 21 NP-complete problems and was proven NP-complete via Cook-Levin theorem.",
            },
            {
                "question_text": "In Dynamic Programming, what two core properties must an optimization problem exhibit to be solvable via DP?",
                "question_type": "MCQ",
                "marks": 10,
                "order_index": 5,
                "options": [
                    {"id": "A", "text": "Optimal Substructure and Overlapping Subproblems"},
                    {"id": "B", "text": "Greedy Choice Property and Infinite Memory"},
                    {"id": "C", "text": "Continuous Functions and Differentiability"},
                    {"id": "D", "text": "Randomized State Space and Bounded Depth"},
                ],
                "correct_answer": "A",
                "explanation": "Dynamic programming requires optimal substructure (optimal solution contains optimal sub-solutions) and overlapping subproblems.",
            },
        ]

        for q in questions_data:
            question = Question(
                exam_id=demo_exam.id,
                question_text=q["question_text"],
                question_type=q["question_type"],
                marks=q["marks"],
                order_index=q["order_index"],
                options_json=json.dumps(q["options"]),
                correct_answer_json=json.dumps(q["correct_answer"]),
                explanation=q["explanation"],
            )
            db.add(question)

        await db.commit()
        print("[SEEDED] Default Exam CS301 created with 5 questions.")

    @staticmethod
    async def list_exams(db: AsyncSession) -> List[ExamSummaryResponse]:
        """Fetch all active exams with question count."""
        stmt = (
            select(Exam, func.count(Question.id).label("q_count"))
            .outerjoin(Question, Exam.id == Question.exam_id)
            .where(Exam.is_active == True, Exam.is_published == True)
            .group_by(Exam.id)
            .order_by(Exam.created_at.desc())
        )
        result = await db.execute(stmt)
        rows = result.all()

        exam_list = []
        for exam, q_count in rows:
            exam_list.append(
                ExamSummaryResponse(
                    id=exam.id,
                    title=exam.title,
                    course_code=exam.course_code,
                    description=exam.description,
                    duration_minutes=exam.duration_minutes,
                    total_marks=exam.total_marks,
                    passing_marks=exam.passing_marks,
                    question_count=q_count,
                    is_active=exam.is_active,
                )
            )
        return exam_list

    @staticmethod
    async def get_exam_by_id(exam_id: str, db: AsyncSession) -> ExamSummaryResponse:
        stmt = (
            select(Exam, func.count(Question.id).label("q_count"))
            .outerjoin(Question, Exam.id == Question.exam_id)
            .where(Exam.id == exam_id)
            .group_by(Exam.id)
        )
        result = await db.execute(stmt)
        row = result.first()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found")
        exam, q_count = row
        return ExamSummaryResponse(
            id=exam.id,
            title=exam.title,
            course_code=exam.course_code,
            description=exam.description,
            duration_minutes=exam.duration_minutes,
            total_marks=exam.total_marks,
            passing_marks=exam.passing_marks,
            question_count=q_count,
            is_active=exam.is_active,
        )

    @staticmethod
    async def start_exam_attempt(
        exam_id: str,
        payload: StartExamRequest,
        db: AsyncSession,
        user_id: Optional[str] = None
    ) -> str:
        """Initializes a new exam attempt with camera verification photo saved."""
        exam = await db.get(Exam, exam_id)
        if not exam or not exam.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not available or inactive")

        photo_url = None
        if payload.verification_photo_base64:
            try:
                # Expect data:image/...;base64,xxxx
                data_str = payload.verification_photo_base64
                if "," in data_str:
                    _, b64_data = data_str.split(",", 1)
                else:
                    b64_data = data_str
                
                img_bytes = base64.b64decode(b64_data)
                filename = f"verify_{uuid.uuid4().hex}.jpg"
                file_path = os.path.join(VERIFICATION_DIR, filename)
                with open(file_path, "wb") as f:
                    f.write(img_bytes)
                photo_url = f"/storage/verifications/{filename}"
            except Exception as e:
                print(f"[VERIFICATION PHOTO ERROR] {e}")
                photo_url = None

        attempt = ExamAttempt(
            exam_id=exam.id,
            user_id=user_id,
            candidate_name=payload.candidate_name,
            candidate_email=payload.candidate_email,
            verification_photo_url=photo_url,
            status="IN_PROGRESS",
            total_marks=exam.total_marks,
            integrity_score=100.0,
            started_at=datetime.now(timezone.utc),
            answers_json="{}",
            violations_count=0,
            violations_json="[]",
        )
        db.add(attempt)
        await db.flush()

        audit = SecurityAuditLog(
            user_id=attempt.user_id,
            action="EXAM_START",
            details_json=json.dumps({"attempt_id": attempt.id, "exam_id": exam.id, "candidate_email": payload.candidate_email}),
        )
        db.add(audit)
        await db.commit()
        await db.refresh(attempt)
        return attempt.id

    @staticmethod
    async def get_attempt_for_taking(attempt_id: str, db: AsyncSession) -> ExamAttemptDetailResponse:
        attempt = await db.get(ExamAttempt, attempt_id)
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam session not found")

        exam = await db.get(Exam, attempt.exam_id)
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

        # Calculate time remaining
        elapsed_seconds = (datetime.now(timezone.utc) - attempt.started_at.replace(tzinfo=timezone.utc)).total_seconds()
        total_seconds = exam.duration_minutes * 60
        time_remaining_seconds = max(0, int(total_seconds - elapsed_seconds))

        # Auto-timeout check
        if time_remaining_seconds == 0 and attempt.status == "IN_PROGRESS":
            attempt.status = "TIMED_OUT"
            attempt.submitted_at = datetime.now(timezone.utc)
            await db.commit()

        # Fetch questions ordered
        q_stmt = select(Question).where(Question.exam_id == exam.id).order_by(Question.order_index)
        q_result = await db.execute(q_stmt)
        questions = q_result.scalars().all()

        question_responses = []
        for q in questions:
            options_raw = json.loads(q.options_json) if q.options_json else []
            options = [OptionSchema(id=opt["id"], text=opt["text"]) for opt in options_raw]
            question_responses.append(
                QuestionPublicResponse(
                    id=q.id,
                    exam_id=q.exam_id,
                    question_text=q.question_text,
                    question_type=q.question_type,
                    marks=q.marks,
                    order_index=q.order_index,
                    options=options,
                )
            )

        saved_answers = json.loads(attempt.answers_json) if attempt.answers_json else {}
        violations_raw = json.loads(attempt.violations_json) if attempt.violations_json else []
        violations_items = [
            ViolationItem(
                warning_number=v["warning_number"],
                violation_type=v["violation_type"],
                message=v["message"],
                timestamp=v["timestamp"],
                snapshot_url=v.get("snapshot_url"),
            )
            for v in violations_raw
        ]

        return ExamAttemptDetailResponse(
            attempt_id=attempt.id,
            exam_id=exam.id,
            exam_title=exam.title,
            course_code=exam.course_code,
            duration_minutes=exam.duration_minutes,
            candidate_name=attempt.candidate_name,
            candidate_email=attempt.candidate_email,
            verification_photo_url=attempt.verification_photo_url,
            status=attempt.status,
            started_at=attempt.started_at,
            time_remaining_seconds=time_remaining_seconds,
            questions=question_responses,
            saved_answers=saved_answers,
            violations_count=attempt.violations_count or 0,
            violations=violations_items,
        )

    @staticmethod
    async def save_answer(attempt_id: str, payload: SaveAnswerRequest, db: AsyncSession) -> Dict[str, Any]:
        attempt = await db.get(ExamAttempt, attempt_id)
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt session not found")

        if attempt.status != "IN_PROGRESS":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot modify answer in status {attempt.status}")

        answers = json.loads(attempt.answers_json) if attempt.answers_json else {}
        answers[payload.question_id] = payload.selected_option
        attempt.answers_json = json.dumps(answers)

        # Upsert relational AttemptAnswer
        ans_stmt = select(AttemptAnswer).where(
            AttemptAnswer.attempt_id == attempt.id,
            AttemptAnswer.question_id == payload.question_id,
        )
        existing_ans = (await db.execute(ans_stmt)).scalars().first()
        if existing_ans:
            existing_ans.selected_answer = str(payload.selected_option)
            existing_ans.timestamp = datetime.now(timezone.utc)
        else:
            new_ans = AttemptAnswer(
                attempt_id=attempt.id,
                question_id=payload.question_id,
                selected_answer=str(payload.selected_option),
            )
            db.add(new_ans)

        await db.commit()
        return {"status": "saved", "question_id": payload.question_id, "saved_answers_count": len(answers)}

    @staticmethod
    async def submit_exam(attempt_id: str, db: AsyncSession) -> ExamResultResponse:
        attempt = await db.get(ExamAttempt, attempt_id)
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam attempt not found")

        exam = await db.get(Exam, attempt.exam_id)
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

        q_stmt = select(Question).where(Question.exam_id == exam.id).order_by(Question.order_index)
        q_result = await db.execute(q_stmt)
        questions = q_result.scalars().all()

        user_answers = json.loads(attempt.answers_json) if attempt.answers_json else {}

        total_score = 0.0
        calculated_total_marks = 0
        breakdown: List[QuestionResultItem] = []

        for q in questions:
            calculated_total_marks += q.marks
            user_ans = user_answers.get(q.id)
            correct_ans = json.loads(q.correct_answer_json) if q.correct_answer_json else ""

            # Check correctness
            is_correct = False
            if isinstance(correct_ans, list):
                if isinstance(user_ans, list) and sorted(user_ans) == sorted(correct_ans):
                    is_correct = True
            else:
                if str(user_ans).strip().upper() == str(correct_ans).strip().upper():
                    is_correct = True

            if is_correct:
                total_score += q.marks

            breakdown.append(
                QuestionResultItem(
                    question_id=q.id,
                    question_text=q.question_text,
                    question_type=q.question_type,
                    marks=q.marks,
                    user_answer=user_ans,
                    correct_answer=correct_ans,
                    is_correct=is_correct,
                    explanation=q.explanation,
                )
            )

        passed = total_score >= exam.passing_marks
        attempt.score = total_score
        attempt.total_marks = calculated_total_marks
        attempt.passed = passed
        if attempt.status != "TERMINATED_VIOLATION":
            attempt.status = "SUBMITTED"
        attempt.submitted_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(attempt)

        time_spent_seconds = int((attempt.submitted_at.replace(tzinfo=timezone.utc) - attempt.started_at.replace(tzinfo=timezone.utc)).total_seconds())
        percentage = round((total_score / calculated_total_marks * 100), 2) if calculated_total_marks > 0 else 0.0

        violations_raw = json.loads(attempt.violations_json) if attempt.violations_json else []
        violations_items = [
            ViolationItem(
                warning_number=v["warning_number"],
                violation_type=v["violation_type"],
                message=v["message"],
                timestamp=v["timestamp"],
                snapshot_url=v.get("snapshot_url"),
            )
            for v in violations_raw
        ]

        return ExamResultResponse(
            attempt_id=attempt.id,
            exam_id=exam.id,
            exam_title=exam.title,
            course_code=exam.course_code,
            candidate_name=attempt.candidate_name,
            candidate_email=attempt.candidate_email,
            verification_photo_url=attempt.verification_photo_url,
            status=attempt.status,
            score=total_score,
            total_marks=calculated_total_marks,
            passing_marks=exam.passing_marks,
            percentage=percentage,
            passed=passed,
            started_at=attempt.started_at,
            submitted_at=attempt.submitted_at,
            time_spent_seconds=time_spent_seconds,
            total_questions=len(questions),
            answered_count=len(user_answers),
            question_breakdown=breakdown,
            violations_count=attempt.violations_count or 0,
            integrity_score=attempt.integrity_score if attempt.integrity_score is not None else 100.0,
            violations=violations_items,
        )

    @staticmethod
    async def get_attempt_result(attempt_id: str, db: AsyncSession) -> ExamResultResponse:
        attempt = await db.get(ExamAttempt, attempt_id)
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam attempt not found")

        exam = await db.get(Exam, attempt.exam_id)
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

        if attempt.status == "IN_PROGRESS":
            # auto-submit to finalize score
            return await ExamService.submit_exam(attempt_id, db)

        q_stmt = select(Question).where(Question.exam_id == exam.id).order_by(Question.order_index)
        q_result = await db.execute(q_stmt)
        questions = q_result.scalars().all()

        user_answers = json.loads(attempt.answers_json) if attempt.answers_json else {}
        breakdown: List[QuestionResultItem] = []

        for q in questions:
            user_ans = user_answers.get(q.id)
            correct_ans = json.loads(q.correct_answer_json) if q.correct_answer_json else ""
            is_correct = False
            if isinstance(correct_ans, list):
                if isinstance(user_ans, list) and sorted(user_ans) == sorted(correct_ans):
                    is_correct = True
            else:
                if str(user_ans).strip().upper() == str(correct_ans).strip().upper():
                    is_correct = True

            breakdown.append(
                QuestionResultItem(
                    question_id=q.id,
                    question_text=q.question_text,
                    question_type=q.question_type,
                    marks=q.marks,
                    user_answer=user_ans,
                    correct_answer=correct_ans,
                    is_correct=is_correct,
                    explanation=q.explanation,
                )
            )

        submitted_at = attempt.submitted_at or datetime.now(timezone.utc)
        time_spent_seconds = int((submitted_at.replace(tzinfo=timezone.utc) - attempt.started_at.replace(tzinfo=timezone.utc)).total_seconds())
        total_m = attempt.total_marks if attempt.total_marks > 0 else exam.total_marks
        percentage = round(((attempt.score or 0.0) / total_m * 100), 2) if total_m > 0 else 0.0

        violations_raw = json.loads(attempt.violations_json) if attempt.violations_json else []
        violations_items = [
            ViolationItem(
                warning_number=v["warning_number"],
                violation_type=v["violation_type"],
                message=v["message"],
                timestamp=v["timestamp"],
                snapshot_url=v.get("snapshot_url"),
            )
            for v in violations_raw
        ]

        return ExamResultResponse(
            attempt_id=attempt.id,
            exam_id=exam.id,
            exam_title=exam.title,
            course_code=exam.course_code,
            candidate_name=attempt.candidate_name,
            candidate_email=attempt.candidate_email,
            verification_photo_url=attempt.verification_photo_url,
            status=attempt.status,
            score=attempt.score or 0.0,
            total_marks=total_m,
            passing_marks=exam.passing_marks,
            percentage=percentage,
            passed=bool(attempt.passed),
            started_at=attempt.started_at,
            submitted_at=attempt.submitted_at,
            time_spent_seconds=time_spent_seconds,
            total_questions=len(questions),
            answered_count=len(user_answers),
            question_breakdown=breakdown,
            violations_count=attempt.violations_count or 0,
            integrity_score=attempt.integrity_score if attempt.integrity_score is not None else 100.0,
            violations=violations_items,
        )

    @staticmethod
    async def record_violation(
        attempt_id: str,
        payload: RecordViolationRequest,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """Record suspicious proctoring activity, increment warning, and auto-terminate on 3rd warning."""
        attempt = await db.get(ExamAttempt, attempt_id)
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam session not found")

        if attempt.status in ["SUBMITTED", "TIMED_OUT", "TERMINATED_VIOLATION"]:
            return {
                "violations_count": attempt.violations_count or 0,
                "terminated": attempt.status == "TERMINATED_VIOLATION",
                "status": attempt.status,
                "warning_number": attempt.violations_count or 0,
            }

        # Save snapshot if provided
        snapshot_url = None
        if payload.snapshot_base64:
            try:
                data_str = payload.snapshot_base64
                if "," in data_str:
                    _, b64_data = data_str.split(",", 1)
                else:
                    b64_data = data_str
                img_bytes = base64.b64decode(b64_data)
                filename = f"violation_{attempt.id}_{uuid.uuid4().hex[:8]}.jpg"
                file_path = os.path.join(VIOLATIONS_DIR, filename)
                with open(file_path, "wb") as f:
                    f.write(img_bytes)
                snapshot_url = f"/storage/violations/{filename}"
            except Exception as e:
                print(f"[VIOLATION SNAPSHOT ERROR] {e}")

        current_count = (attempt.violations_count or 0) + 1
        attempt.violations_count = current_count
        attempt.integrity_score = max(0.0, round(100.0 - (current_count * 20.0), 1))

        violations_list = json.loads(attempt.violations_json) if attempt.violations_json else []
        violation_entry = {
            "warning_number": current_count,
            "violation_type": payload.violation_type,
            "message": payload.message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "snapshot_url": snapshot_url,
        }
        violations_list.append(violation_entry)
        attempt.violations_json = json.dumps(violations_list)

        # Persist normalized ProctoringViolation record
        rel_violation = ProctoringViolation(
            attempt_id=attempt.id,
            event_type=payload.violation_type,
            severity="TERMINATION" if current_count >= 3 else "WARNING",
            confidence=95.0,
            strike_number=current_count,
            evidence_path=snapshot_url,
            message=payload.message,
        )
        db.add(rel_violation)

        # Audit log entry
        audit = SecurityAuditLog(
            user_id=attempt.user_id,
            action="VIOLATION_RECORDED",
            details_json=json.dumps({
                "attempt_id": attempt.id,
                "strike": current_count,
                "violation_type": payload.violation_type,
                "integrity_score": attempt.integrity_score,
            }),
        )
        db.add(audit)

        terminated = False
        if current_count >= 3:
            terminated = True
            attempt.status = "TERMINATED_VIOLATION"
            await db.commit()
            # Grade answers up to termination point
            await ExamService.submit_exam(attempt_id, db)
        else:
            await db.commit()

        return {
            "violations_count": current_count,
            "terminated": terminated,
            "status": attempt.status,
            "warning_number": current_count,
            "violation": violation_entry,
        }

    @staticmethod
    async def force_terminate_exam(attempt_id: str, reason: str, db: AsyncSession) -> Dict[str, Any]:
        """Directly terminate examination due to severe integrity violation."""
        attempt = await db.get(ExamAttempt, attempt_id)
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

        attempt.status = "TERMINATED_VIOLATION"
        attempt.violations_count = max(3, (attempt.violations_count or 0) + 1)
        violations_list = json.loads(attempt.violations_json) if attempt.violations_json else []
        violations_list.append({
            "warning_number": attempt.violations_count,
            "violation_type": "FORCED_TERMINATION",
            "message": reason,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        attempt.violations_json = json.dumps(violations_list)
        await db.commit()
        await ExamService.submit_exam(attempt_id, db)
        return {"status": "TERMINATED_VIOLATION", "violations_count": attempt.violations_count}


    @staticmethod
    async def create_exam_with_questions(payload: ExamAdminCreate, db: AsyncSession, creator_id: Optional[str] = None) -> str:
        new_exam = Exam(
            title=payload.title,
            course_code=payload.course_code,
            description=payload.description,
            duration_minutes=payload.duration_minutes,
            total_marks=payload.total_marks,
            passing_marks=payload.passing_marks,
            is_published=True,
            is_active=True,
            created_by_id=creator_id,
        )
        db.add(new_exam)
        await db.flush()

        for idx, q in enumerate(payload.questions):
            question = Question(
                exam_id=new_exam.id,
                question_text=q.question_text,
                question_type=q.question_type,
                marks=q.marks,
                order_index=idx + 1,
                options_json=json.dumps([opt.model_dump() for opt in q.options]),
                correct_answer_json=json.dumps(q.correct_answer),
                explanation=q.explanation,
            )
            db.add(question)

        await db.commit()
        await db.refresh(new_exam)
        return new_exam.id

    @staticmethod
    async def get_exam_attempts(exam_id: Optional[str], db: AsyncSession) -> List[Dict[str, Any]]:
        stmt = select(ExamAttempt).options(selectinload(ExamAttempt.exam))
        if exam_id and exam_id != "all":
            stmt = stmt.where(ExamAttempt.exam_id == exam_id)
        stmt = stmt.order_by(ExamAttempt.started_at.desc())
        result = await db.execute(stmt)
        attempts = result.scalars().all()
        return [
            {
                "id": a.id,
                "exam_id": a.exam_id,
                "exam_title": a.exam.title if a.exam else "Midterm Examination",
                "course_code": a.exam.course_code if a.exam else "CS",
                "candidate_name": a.candidate_name,
                "candidate_email": a.candidate_email,
                "status": a.status,
                "score": a.score or 0.0,
                "total_marks": a.total_marks or (a.exam.total_marks if a.exam else 100),
                "percentage": round(((a.score or 0.0) / max(1, a.total_marks or 100)) * 100, 1),
                "passed": a.passed,
                "started_at": a.started_at.isoformat() if a.started_at else None,
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
                "verification_photo_url": a.verification_photo_url,
                "violations_count": a.violations_count or 0,
                "integrity_score": a.integrity_score if a.integrity_score is not None else 100.0,
            }
            for a in attempts
        ]

    @staticmethod
    async def get_student_analytics(
        student_email: Optional[str],
        user_id: Optional[str],
        db: AsyncSession
    ) -> StudentAnalyticsResponse:
        query = select(ExamAttempt).options(selectinload(ExamAttempt.exam))
        if user_id:
            query = query.where(ExamAttempt.user_id == user_id)
        elif student_email:
            query = query.where(ExamAttempt.candidate_email == student_email.lower())
        else:
            query = query.order_by(ExamAttempt.started_at.desc()).limit(20)

        query = query.order_by(ExamAttempt.started_at.desc())
        result = await db.execute(query)
        attempts = result.scalars().all()

        if not attempts:
            return StudentAnalyticsResponse(
                total_tests_taken=0,
                average_score=0.0,
                highest_score=0.0,
                pass_rate=0.0,
                passed_count=0,
                failed_count=0,
                integrity_score=100.0,
                recent_attempts=[],
                subject_performance=[],
            )

        completed = [a for a in attempts if a.status in ("SUBMITTED", "TERMINATED_VIOLATION")]
        total_taken = len(completed)

        scores = []
        passed_count = 0
        failed_count = 0
        total_violations = 0

        recent_items = []
        subject_map: Dict[str, List[float]] = {}

        for a in attempts:
            tot = a.total_marks if a.total_marks > 0 else (a.exam.total_marks if a.exam else 100)
            sc = a.score or 0.0
            pct = round((sc / tot * 100), 1) if tot > 0 else 0.0
            is_pass = bool(a.passed)

            if a.status in ("SUBMITTED", "TERMINATED_VIOLATION"):
                scores.append(pct)
                if is_pass:
                    passed_count += 1
                else:
                    failed_count += 1
                total_violations += (a.violations_count or 0)

            c_code = a.exam.course_code if a.exam else "GENERAL"
            if c_code not in subject_map:
                subject_map[c_code] = []
            if a.status in ("SUBMITTED", "TERMINATED_VIOLATION"):
                subject_map[c_code].append(pct)

            recent_items.append(
                StudentAttemptItem(
                    attempt_id=a.id,
                    exam_id=a.exam_id,
                    exam_title=a.exam.title if a.exam else "Course Examination",
                    course_code=c_code,
                    status=a.status,
                    score=sc,
                    total_marks=tot,
                    percentage=pct,
                    passed=is_pass,
                    started_at=a.started_at,
                    submitted_at=a.submitted_at,
                    violations_count=a.violations_count or 0,
                    integrity_score=a.integrity_score if a.integrity_score is not None else 100.0,
                )
            )

        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
        high_score = round(max(scores), 1) if scores else 0.0
        pass_rate = round((passed_count / total_taken * 100), 1) if total_taken > 0 else 0.0
        integrity = max(60.0, round(100.0 - (total_violations * 4.5), 1))

        subject_performance = [
            SubjectPerformanceItem(
                course_code=code,
                attempts_count=len(arr),
                average_score=round(sum(arr) / len(arr), 1) if arr else 0.0,
            )
            for code, arr in subject_map.items()
        ]

        return StudentAnalyticsResponse(
            total_tests_taken=total_taken,
            average_score=avg_score,
            highest_score=high_score,
            pass_rate=pass_rate,
            passed_count=passed_count,
            failed_count=failed_count,
            integrity_score=integrity,
            recent_attempts=recent_items,
            subject_performance=subject_performance,
        )

