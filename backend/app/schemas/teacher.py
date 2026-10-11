from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.exam import OptionSchema

class TeacherOverviewStats(BaseModel):
    total_exams: int = 0
    published_exams: int = 0
    draft_exams: int = 0
    scheduled_ongoing_exams: int = 0
    total_students_attempted: int = 0
    total_completed_attempts: int = 0
    average_score: float = 0.0
    total_violations: int = 0
    highest_score: float = 0.0
    lowest_score: float = 0.0
    pass_percentage: float = 0.0
    completion_rate: float = 0.0

class RecentActivityItem(BaseModel):
    id: str
    event_type: str  # 'EXAM_CREATED', 'EXAM_SUBMITTED', 'VIOLATION_RECORDED', 'ATTEMPT_STARTED'
    description: str
    timestamp: str
    severity: str = "INFO"  # 'INFO', 'WARNING', 'CRITICAL', 'SUCCESS'

class ExamViolationRank(BaseModel):
    exam_id: str
    title: str
    course_code: str
    violations_count: int

class TeacherOverviewResponse(BaseModel):
    stats: TeacherOverviewStats
    recent_activity: List[RecentActivityItem] = []
    top_violation_exams: List[ExamViolationRank] = []

class TeacherExamItem(BaseModel):
    id: str
    title: str
    course_code: str
    description: Optional[str] = None
    duration_minutes: int
    total_marks: int
    passing_marks: int
    is_published: bool
    is_active: bool
    status: str  # 'DRAFT', 'PUBLISHED', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'ARCHIVED'
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    question_count: int = 0
    participants_count: int = 0
    submitted_count: int = 0
    average_score: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class QuestionCreateInput(BaseModel):
    id: Optional[str] = None
    question_text: str = Field(..., min_length=3)
    question_type: str = "MCQ"
    marks: int = Field(default=1, ge=1)
    order_index: int = 0
    options: List[OptionSchema]
    correct_answer: Union[str, List[str]]
    explanation: Optional[str] = None

class TeacherExamCreateRequest(BaseModel):
    title: str = Field(..., min_length=3)
    course_code: str = Field(..., min_length=2)
    description: Optional[str] = None
    duration_minutes: int = Field(default=60, ge=5)
    total_marks: int = Field(default=100, ge=1)
    passing_marks: int = Field(default=40, ge=1)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_published: bool = True
    questions: List[QuestionCreateInput] = []

class TeacherExamUpdateRequest(BaseModel):
    title: Optional[str] = None
    course_code: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    total_marks: Optional[int] = None
    passing_marks: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_published: Optional[bool] = None
    status: Optional[str] = None
    questions: Optional[List[QuestionCreateInput]] = None

class TeacherStudentResultItem(BaseModel):
    attempt_id: str
    student_name: str
    student_email: str
    exam_id: str
    exam_title: str
    course_code: str
    total_marks: int
    score: float
    percentage: float
    passed: Optional[bool]
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    violations_count: int = 0
    integrity_score: float = 100.0

class ScoreDistributionBucket(BaseModel):
    range: str
    count: int

class TeacherResultsAnalytics(BaseModel):
    total_attempts: int = 0
    submitted_count: int = 0
    in_progress_count: int = 0
    average_score: float = 0.0
    highest_score: float = 0.0
    lowest_score: float = 0.0
    pass_percentage: float = 0.0
    score_distribution: List[ScoreDistributionBucket] = []

class TeacherResultsListResponse(BaseModel):
    attempts: List[TeacherStudentResultItem]
    analytics: TeacherResultsAnalytics

class TeacherLiveAttemptItem(BaseModel):
    attempt_id: str
    student_name: str
    student_email: str
    exam_id: str
    exam_title: str
    course_code: str
    status: str
    started_at: datetime
    elapsed_minutes: int
    violations_count: int
    integrity_score: float
    latest_violation: Optional[str] = None

class TeacherViolationItem(BaseModel):
    id: str
    attempt_id: str
    student_name: str
    student_email: str
    exam_id: str
    exam_title: str
    course_code: str
    event_type: str
    severity: str
    strike_number: int
    evidence_path: Optional[str] = None
    message: Optional[str] = None
    timestamp: datetime
