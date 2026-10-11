import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Integer,
    ForeignKey,
    Text,
    Float,
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Exam(Base):
    __tablename__ = "exams"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    course_code = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=60)
    total_marks = Column(Integer, nullable=False, default=100)
    passing_marks = Column(Integer, nullable=False, default=40)
    is_published = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    status = Column(String(30), default="PUBLISHED", nullable=False)  # DRAFT, PUBLISHED, ARCHIVED
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan", order_by="Question.order_index")
    attempts = relationship("ExamAttempt", back_populates="exam", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    exam_id = Column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False, default="MCQ")  # MCQ, MULTI_SELECT, SHORT_ANSWER
    marks = Column(Integer, nullable=False, default=1)
    order_index = Column(Integer, nullable=False, default=0)
    # Stored as JSON string list: [{"id": "A", "text": "Option A"}, ...]
    options_json = Column(Text, nullable=False, default="[]")
    # Stored as JSON string or plain text: e.g. "A" or '["A", "B"]'
    correct_answer_json = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)

    exam = relationship("Exam", back_populates="questions")


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    exam_id = Column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    candidate_name = Column(String(255), nullable=False, default="Candidate")
    candidate_email = Column(String(255), nullable=False, default="candidate@example.com", index=True)
    verification_photo_url = Column(String(500), nullable=True)
    status = Column(String(50), nullable=False, default="IN_PROGRESS")  # IN_PROGRESS, SUBMITTED, TIMED_OUT, TERMINATED_VIOLATION, EVALUATED
    attempt_number = Column(Integer, default=1, nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    last_activity_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True, default=0.0)
    total_marks = Column(Integer, nullable=False, default=0)
    percentage = Column(Float, nullable=True)
    passed = Column(Boolean, nullable=True)
    grading_status = Column(String(30), default="AUTO_GRADED", nullable=False)  # AUTO_GRADED, PENDING_EVALUATION, EVALUATED
    termination_reason = Column(String(255), nullable=True)
    integrity_score = Column(Float, nullable=False, default=100.0)
    # Stored as JSON string map: {"question_id": "A", ...}
    answers_json = Column(Text, nullable=False, default="{}")
    violations_count = Column(Integer, nullable=False, default=0)
    # Stored as JSON string list of violation records
    violations_json = Column(Text, nullable=False, default="[]")

    exam = relationship("Exam", back_populates="attempts")
    recorded_answers = relationship("AttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")
    recorded_violations = relationship("ProctoringViolation", back_populates="attempt", cascade="all, delete-orphan")
    activities = relationship("StudentActivity", back_populates="attempt", cascade="all, delete-orphan")


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    attempt_id = Column(String(36), ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_answer = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    attempt = relationship("ExamAttempt", back_populates="recorded_answers")
    question = relationship("Question")


class ProctoringViolation(Base):
    __tablename__ = "proctoring_violations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    attempt_id = Column(String(36), ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # MULTIPLE_FACES, NO_FACE, PHONE_DETECTED, TAB_SWITCH, etc.
    severity = Column(String(20), nullable=False, default="WARNING")  # WARNING, CRITICAL, TERMINATION
    confidence = Column(Float, nullable=False, default=95.0)
    strike_number = Column(Integer, nullable=False, default=1)
    evidence_path = Column(String(500), nullable=True)
    message = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    attempt = relationship("ExamAttempt", back_populates="recorded_violations")


class StudentActivity(Base):
    __tablename__ = "student_activities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_type = Column(String(50), nullable=False, index=True)
    # Event types:
    # LOGIN, LOGOUT, EXAM_VIEWED, ATTEMPT_STARTED, ANSWER_SAVED, EXAM_SUBMITTED,
    # AUTO_TERMINATED, EXAM_GRADED, VIOLATION_RECORDED, MANUAL_GRADING_SUBMITTED, MANUAL_GRADING_COMPLETED
    exam_id = Column(String(36), ForeignKey("exams.id", ondelete="SET NULL"), nullable=True, index=True)
    attempt_id = Column(String(36), ForeignKey("exam_attempts.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    details_json = Column(Text, nullable=True, default="{}")
    status = Column(String(30), nullable=False, default="INFO")  # SUCCESS, INFO, WARNING, CRITICAL
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    user = relationship("User")
    exam = relationship("Exam")
    attempt = relationship("ExamAttempt", back_populates="activities")


class SecurityAuditLog(Base):
    __tablename__ = "security_audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # USER_LOGIN, EXAM_START, EXAM_SUBMIT, VIOLATION_RECORDED, etc.
    details_json = Column(Text, nullable=True, default="{}")
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

