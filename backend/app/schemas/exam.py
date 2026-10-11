from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict

class OptionSchema(BaseModel):
    id: str
    text: str

class QuestionPublicResponse(BaseModel):
    id: str
    exam_id: str
    question_text: str
    question_type: str
    marks: int
    order_index: int
    options: List[OptionSchema]

    model_config = ConfigDict(from_attributes=True)

class ExamSummaryResponse(BaseModel):
    id: str
    title: str
    course_code: str
    description: Optional[str] = None
    duration_minutes: int
    total_marks: int
    passing_marks: int
    question_count: int = 0
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)

class StartExamRequest(BaseModel):
    candidate_name: str = Field(default="Candidate Alex Johnson", min_length=2)
    candidate_email: str = Field(default="alex.johnson@university.edu")
    verification_photo_base64: Optional[str] = None

class SaveAnswerRequest(BaseModel):
    question_id: str
    selected_option: Union[str, List[str]]

class ViolationItem(BaseModel):
    warning_number: int
    violation_type: str
    message: str
    timestamp: str
    snapshot_url: Optional[str] = None

class RecordViolationRequest(BaseModel):
    violation_type: str  # 'MULTIPLE_FACES', 'NO_FACE', 'TAB_SWITCH', 'LOOKING_AWAY'
    message: str
    snapshot_base64: Optional[str] = None

class ExamAttemptDetailResponse(BaseModel):
    attempt_id: str
    exam_id: str
    exam_title: str
    course_code: str
    duration_minutes: int
    candidate_name: str
    candidate_email: str
    verification_photo_url: Optional[str] = None
    status: str
    started_at: datetime
    time_remaining_seconds: int
    questions: List[QuestionPublicResponse]
    saved_answers: Dict[str, Any]
    violations_count: int = 0
    violations: List[ViolationItem] = []

class QuestionResultItem(BaseModel):
    question_id: str
    question_text: str
    question_type: str
    marks: int
    user_answer: Optional[Union[str, List[str]]] = None
    correct_answer: Union[str, List[str]]
    is_correct: bool
    explanation: Optional[str] = None

class ExamResultResponse(BaseModel):
    attempt_id: str
    exam_id: str
    exam_title: str
    course_code: str
    candidate_name: str
    candidate_email: str
    verification_photo_url: Optional[str] = None
    status: str
    score: float
    total_marks: int
    passing_marks: int
    percentage: float
    passed: bool
    started_at: datetime
    submitted_at: Optional[datetime] = None
    time_spent_seconds: int
    total_questions: int
    answered_count: int
    question_breakdown: List[QuestionResultItem]
    violations_count: int = 0
    integrity_score: float = 100.0
    violations: List[ViolationItem] = []


class QuestionAdminCreate(BaseModel):
    question_text: str
    question_type: str = "MCQ"
    marks: int = 1
    options: List[OptionSchema]
    correct_answer: Union[str, List[str]]
    explanation: Optional[str] = None

class ExamAdminCreate(BaseModel):
    title: str
    course_code: str
    description: Optional[str] = None
    duration_minutes: int = 60
    total_marks: int = 100
    passing_marks: int = 40
    questions: List[QuestionAdminCreate]

class StudentAttemptItem(BaseModel):
    attempt_id: str
    exam_id: str
    exam_title: str
    course_code: str
    status: str
    score: float
    total_marks: int
    percentage: float
    passed: bool
    started_at: datetime
    submitted_at: Optional[datetime] = None
    violations_count: int = 0
    integrity_score: float = 100.0

class SubjectPerformanceItem(BaseModel):
    course_code: str
    attempts_count: int
    average_score: float

class StudentAnalyticsResponse(BaseModel):
    total_tests_taken: int
    average_score: float
    highest_score: float
    pass_rate: float
    passed_count: int
    failed_count: int
    integrity_score: float
    recent_attempts: List[StudentAttemptItem]
    subject_performance: List[SubjectPerformanceItem]
