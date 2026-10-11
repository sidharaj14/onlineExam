import { api } from "./api";
import type {
  Exam,
  StartExamPayload,
  ExamAttemptDetail,
  ExamResult,
  StudentAnalytics,
} from "../types/exam.types";

export const examService = {
  getAvailableExams: async (): Promise<Exam[]> => {
    const response = await api.get<Exam[]>("/exams");
    return response.data;
  },

  getExamById: async (examId: string): Promise<Exam> => {
    const response = await api.get<Exam>(`/exams/${examId}`);
    return response.data;
  },

  startExamAttempt: async (
    examId: string,
    payload: StartExamPayload
  ): Promise<{ status: string; attempt_id: string }> => {
    const response = await api.post<{ status: string; attempt_id: string }>(
      `/exams/${examId}/start`,
      payload
    );
    return response.data;
  },

  getAttemptDetails: async (attemptId: string): Promise<ExamAttemptDetail> => {
    const response = await api.get<ExamAttemptDetail>(
      `/exams/attempts/${attemptId}`
    );
    return response.data;
  },

  saveAnswer: async (
    attemptId: string,
    questionId: string,
    selectedOption: string | string[]
  ): Promise<{ status: string; question_id: string; saved_answers_count: number }> => {
    const response = await api.post<{
      status: string;
      question_id: string;
      saved_answers_count: number;
    }>(`/exams/attempts/${attemptId}/save-answer`, {
      question_id: questionId,
      selected_option: selectedOption,
    });
    return response.data;
  },

  submitExam: async (attemptId: string): Promise<ExamResult> => {
    const response = await api.post<ExamResult>(
      `/exams/attempts/${attemptId}/submit`
    );
    return response.data;
  },

  getExamResult: async (attemptId: string): Promise<ExamResult> => {
    const response = await api.get<ExamResult>(
      `/exams/attempts/${attemptId}/result`
    );
    return response.data;
  },

  recordViolation: async (
    attemptId: string,
    payload: { violation_type: string; message: string; snapshot_base64?: string }
  ): Promise<{
    violations_count: number;
    terminated: boolean;
    status: string;
    warning_number: number;
  }> => {
    const response = await api.post<{
      violations_count: number;
      terminated: boolean;
      status: string;
      warning_number: number;
    }>(`/exams/attempts/${attemptId}/violation`, payload);
    return response.data;
  },

  terminateExam: async (
    attemptId: string,
    reason: string = "Integrity violation"
  ): Promise<{ status: string; violations_count: number }> => {
    const response = await api.post<{ status: string; violations_count: number }>(
      `/exams/attempts/${attemptId}/terminate?reason=${encodeURIComponent(reason)}`
    );
    return response.data;
  },

  processFrame: async (
    attemptId: string,
    frameBase64: string
  ): Promise<{
    status: string;
    message: string;
    face_count: number;
    violation_detected: boolean;
    violation?: {
      violations_count: number;
      terminated: boolean;
      status: string;
      warning_number: number;
    };
  }> => {
    const response = await api.post(`/exams/attempts/${attemptId}/process-frame`, {
      frame_base64: frameBase64,
    });
    return response.data;
  },

  getStudentAnalytics: async (email?: string, userId?: string): Promise<StudentAnalytics> => {
    const params = new URLSearchParams();
    if (email) params.append("email", email);
    if (userId) params.append("user_id", userId);
    const response = await api.get(`/exams/student/analytics?${params.toString()}`);
    return response.data;
  },

  getStudentFullDashboard: async (): Promise<any> => {
    const response = await api.get("/students/me/dashboard");
    return response.data;
  },

  getStudentAttemptsList: async (status?: string): Promise<any[]> => {
    const params = new URLSearchParams();
    if (status && status !== "all") params.append("status", status);
    const response = await api.get(`/students/me/attempts?${params.toString()}`);
    return response.data;
  },

  getStudentActivityTimeline: async (limit: number = 20): Promise<any[]> => {
    const response = await api.get(`/students/me/activity?limit=${limit}`);
    return response.data;
  },

  checkActiveAttempt: async (
    examId: string
  ): Promise<{ has_active: boolean; has_active_attempt: boolean; attempt_id: string | null }> => {
    const response = await api.get(`/exams/${examId}/active-attempt`);
    return {
      has_active: response.data.has_active ?? response.data.has_active_attempt ?? false,
      has_active_attempt: response.data.has_active_attempt ?? response.data.has_active ?? false,
      attempt_id: response.data.attempt_id ?? null,
    };
  },

  logoutUser: async (): Promise<{ message: string }> => {
    const response = await api.post("/auth/logout");
    return response.data;
  },
};

