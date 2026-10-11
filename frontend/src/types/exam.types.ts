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
