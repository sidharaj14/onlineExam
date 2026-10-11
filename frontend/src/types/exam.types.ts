export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: string;
  marks: number;
  order_index: number;
  options: Option[];
}

export interface Exam {
  id: string;
  title: string;
  course_code: string;
  description?: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  question_count: number;
  is_active: boolean;
}

export interface StartExamPayload {
  candidate_name: string;
  candidate_email: string;
  verification_photo_base64?: string;
}

export interface ExamAttemptDetail {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  course_code: string;
  duration_minutes: number;
  candidate_name: string;
  candidate_email: string;
  verification_photo_url?: string;
  status: string;
  started_at: string;
  time_remaining_seconds: number;
  questions: Question[];
  saved_answers: Record<string, string | string[]>;
  violations_count?: number;
  violations?: ViolationItem[];
}

export interface ViolationItem {
  warning_number: number;
  violation_type: string;
  message: string;
  timestamp: string;
  snapshot_url?: string;
}

export interface StudentAttemptItem {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  course_code: string;
  status: string;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  submitted_at?: string;
  violations_count: number;
  integrity_score?: number;
}

export interface SubjectPerformanceItem {
  course_code: string;
  attempts_count: number;
  average_score: number;
}

export interface StudentAnalytics {
  total_tests_taken: number;
  average_score: number;
  highest_score: number;
  pass_rate: number;
  passed_count: number;
  failed_count: number;
  integrity_score: number;
  recent_attempts: StudentAttemptItem[];
  subject_performance: SubjectPerformanceItem[];
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  question_type: string;
  marks: number;
  user_answer?: string | string[];
  correct_answer: string | string[];
  is_correct: boolean;
  explanation?: string;
  points_awarded?: number;
  max_marks?: number;
}

export interface ExamResult {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  course_code: string;
  candidate_name: string;
  candidate_email: string;
  verification_photo_url?: string;
  status: string;
  score: number;
  total_marks: number;
  passing_marks: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  submitted_at?: string;
  time_spent_seconds: number;
  total_questions: number;
  answered_count: number;
  question_breakdown: QuestionResult[];
  violations_count?: number;
  integrity_score?: number;
  violations?: ViolationItem[];
}

export interface StudentDashboardSummary {
  total_exams_attempted: number;
  exams_completed: number;
  exams_in_progress: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  passed_exams: number;
  failed_exams: number;
  pending_evaluations: number;
  average_integrity_score: number;
  pass_rate: number;
}

export interface StudentAttemptHistoryItem {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  course_code: string;
  attempt_number: number;
  started_at: string;
  submitted_at?: string;
  marks_obtained: number;
  score?: number;
  total_marks: number;
  percentage: number;
  passed?: boolean | null;
  status: string;
  grading_status: string;
  violations_count: number;
  integrity_score: number;
  time_spent_seconds?: number | null;
  termination_reason?: string | null;
  can_resume?: boolean;
}

export interface ScoreTrendPoint {
  attempt_id: string;
  exam_title: string;
  course_code: string;
  date: string;
  percentage: number;
  passed: boolean;
}

export interface SubjectPerformanceDetail {
  course_code: string;
  subject_name: string;
  attempts_count: number;
  average_score: number;
  pass_rate: number;
}

export interface StudentAnalyticsTrend {
  score_trend: ScoreTrendPoint[];
  subject_performance: SubjectPerformanceDetail[];
  strongest_subject?: string | null;
  weakest_subject?: string | null;
  pass_rate: number;
  has_sufficient_data: boolean;
  data_note?: string | null;
}

export interface StudentActivityItem {
  id: string;
  activity_type: string;
  title: string;
  description?: string | null;
  exam_id?: string | null;
  exam_title?: string | null;
  course_code?: string | null;
  attempt_id?: string | null;
  status: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface StudentFullDashboardResponse {
  student_id: string;
  student_name: string;
  student_email: string;
  summary: StudentDashboardSummary;
  recent_history: StudentAttemptHistoryItem[];
  analytics: StudentAnalyticsTrend;
  recent_activities: StudentActivityItem[];
}

export interface TeacherStudentPerformanceResponse {
  student_id: string;
  full_name: string;
  email: string;
  student_id_number?: string | null;
  department?: string | null;
  course?: string | null;
  semester?: number | null;
  total_attempts: number;
  completed_attempts: number;
  average_score: number;
  highest_score: number;
  pass_rate: number;
  attempts: StudentAttemptHistoryItem[];
  score_trend: ScoreTrendPoint[];
}

