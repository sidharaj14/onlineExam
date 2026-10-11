from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class StudentDashboardSummary(BaseModel):
    total_exams_attempted: int = 0
    exams_completed: int = 0
    exams_in_progress: int = 0
    average_score: float = 0.0
    highest_score: float = 0.0
    lowest_score: float = 0.0
    passed_exams: int = 0
    failed_exams: int = 0
    pending_evaluations: int = 0
    average_integrity_score: float = 100.0
    pass_rate: float = 0.0

class StudentAttemptHistoryItem(BaseModel):
    attempt_id: str
    exam_id: str
    exam_title: str
    course_code: str
    attempt_number: int = 1
    started_at: datetime
    submitted_at: Optional[datetime] = None
    marks_obtained: float
    total_marks: int
    percentage: float
    passed: Optional[bool] = None
    status: str  # IN_PROGRESS, SUBMITTED, TIMED_OUT, TERMINATED_VIOLATION, EVALUATED
    grading_status: str = "AUTO_GRADED"  # AUTO_GRADED, PENDING_EVALUATION, EVALUATED
    violations_count: int = 0
    integrity_score: float = 100.0
    time_spent_seconds: Optional[int] = None
    termination_reason: Optional[str] = None

class ScoreTrendPoint(BaseModel):
    attempt_id: str
    exam_title: str
    course_code: str
    date: str
    percentage: float
    passed: bool

class SubjectPerformanceItem(BaseModel):
    course_code: str
    subject_name: str
    attempts_count: int
    average_score: float
    pass_rate: float

class StudentAnalyticsTrend(BaseModel):
    score_trend: List[ScoreTrendPoint] = []
    subject_performance: List[SubjectPerformanceItem] = []
    strongest_subject: Optional[str] = None
    weakest_subject: Optional[str] = None
    pass_rate: float = 0.0
    has_sufficient_data: bool = False
    data_note: Optional[str] = None

class StudentActivityItem(BaseModel):
    id: str
    activity_type: str
    title: str
    description: Optional[str] = None
    exam_id: Optional[str] = None
    exam_title: Optional[str] = None
    course_code: Optional[str] = None
    attempt_id: Optional[str] = None
    status: str = "INFO"
    timestamp: str
    details: Dict[str, Any] = {}

class StudentFullDashboardResponse(BaseModel):
    student_id: str
    student_name: str
    student_email: str
    summary: StudentDashboardSummary
    recent_history: List[StudentAttemptHistoryItem]
    analytics: StudentAnalyticsTrend
    recent_activities: List[StudentActivityItem]

# Teacher Student Performance Schemas
class TeacherStudentPerformanceExamItem(BaseModel):
    attempt_id: str
    exam_id: str
    exam_title: str
    course_code: str
    attempt_number: int
    started_at: datetime
    submitted_at: Optional[datetime] = None
    score: float
    total_marks: int
    percentage: float
    passed: Optional[bool] = None
    status: str
    grading_status: str
    violations_count: int
    integrity_score: float

class TeacherStudentPerformanceResponse(BaseModel):
    student_id: str
    full_name: str
    email: str
    student_id_number: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    semester: Optional[int] = None
    total_attempts: int
    completed_attempts: int
    average_score: float
    highest_score: float
    pass_rate: float
    attempts: List[TeacherStudentPerformanceExamItem]
    score_trend: List[ScoreTrendPoint]
