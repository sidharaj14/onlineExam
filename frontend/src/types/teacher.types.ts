export interface OptionSchema {
  id: string;
  text: string;
}

export interface QuestionCreateInput {
  id?: string;
  question_text: string;
  question_type: string;
  marks: number;
  order_index?: number;
  options: OptionSchema[];
  correct_answer: string | string[];
  explanation?: string;
}

export interface TeacherExamCreateRequest {
  title: string;
  course_code: string;
  description?: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  start_time?: string;
  end_time?: string;
  is_published: boolean;
  questions: QuestionCreateInput[];
}

export interface TeacherExamUpdateRequest {
  title?: string;
  course_code?: string;
  description?: string;
  duration_minutes?: number;
  total_marks?: number;
  passing_marks?: number;
  start_time?: string;
  end_time?: string;
  is_published?: boolean;
  status?: string;
  questions?: QuestionCreateInput[];
}

export interface TeacherExamItem {
  id: string;
  title: string;
  course_code: string;
  description: string | null;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  is_published: boolean;
  is_active: boolean;
  status: string;
  start_time: string | null;
  end_time: string | null;
  question_count: number;
  participants_count: number;
  submitted_count: number;
  average_score: number | null;
  created_at: string;
}

export interface TeacherExamDetail extends TeacherExamItem {
  questions: {
    id: string;
    exam_id: string;
    question_text: string;
    question_type: string;
    marks: number;
    order_index: number;
    options: OptionSchema[];
    correct_answer: string | string[];
    explanation?: string;
  }[];
  has_active_attempts: boolean;
}

export interface TeacherOverviewStats {
  total_exams: number;
  published_exams: number;
  draft_exams: number;
  scheduled_ongoing_exams: number;
  total_students_attempted: number;
  total_completed_attempts: number;
  average_score: number;
  total_violations: number;
  highest_score: number;
  lowest_score: number;
  pass_percentage: number;
  completion_rate: number;
}

export interface RecentActivityItem {
  id: string;
  event_type: string;
  description: string;
  timestamp: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | "SUCCESS";
}

export interface ExamViolationRank {
  exam_id: string;
  title: string;
  course_code: string;
  violations_count: number;
}

export interface TeacherOverviewResponse {
  stats: TeacherOverviewStats;
  recent_activity: RecentActivityItem[];
  top_violation_exams: ExamViolationRank[];
}

export interface TeacherStudentResultItem {
  attempt_id: string;
  student_name: string;
  student_email: string;
  exam_id: string;
  exam_title: string;
  course_code: string;
  total_marks: number;
  score: number;
  percentage: number;
  passed: boolean | null;
  status: string;
  started_at: string;
  submitted_at: string | null;
  violations_count: number;
  integrity_score: number;
}

export interface ScoreDistributionBucket {
  range: string;
  count: number;
}

export interface TeacherResultsAnalytics {
  total_attempts: number;
  submitted_count: number;
  in_progress_count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  pass_percentage: number;
  score_distribution: ScoreDistributionBucket[];
}

export interface TeacherResultsListResponse {
  attempts: TeacherStudentResultItem[];
  analytics: TeacherResultsAnalytics;
}

export interface QuestionBreakdownItem {
  question_id: string;
  question_text: string;
  question_type: string;
  marks: number;
  marks_awarded: number;
  options: OptionSchema[];
  student_answer: string | string[] | null;
  correct_answer: string | string[];
  is_correct: boolean;
  explanation?: string;
}

export interface StudentAttemptDetailResponse {
  attempt_id: string;
  student_name: string;
  student_email: string;
  verification_photo_url: string | null;
  exam_id: string;
  exam_title: string;
  course_code: string;
  status: string;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean | null;
  started_at: string | null;
  submitted_at: string | null;
  time_spent_seconds: number;
  integrity_score: number;
  violations_count: number;
  violations: {
    warning_number: number;
    violation_type: string;
    message: string;
    timestamp: string;
    snapshot_url?: string;
  }[];
  questions_breakdown: QuestionBreakdownItem[];
}

export interface TeacherLiveAttemptItem {
  attempt_id: string;
  student_name: string;
  student_email: string;
  exam_id: string;
  exam_title: string;
  course_code: string;
  status: string;
  started_at: string;
  elapsed_minutes: number;
  violations_count: number;
  integrity_score: number;
  latest_violation: string | null;
}

export interface TeacherViolationItem {
  id: string;
  attempt_id: string;
  student_name: string;
  student_email: string;
  exam_id: string;
  exam_title: string;
  course_code: string;
  event_type: string;
  severity: string;
  strike_number: number;
  evidence_path: string | null;
  message: string | null;
  timestamp: string;
}
