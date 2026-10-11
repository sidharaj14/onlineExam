import { api } from "./api";
import type {
  TeacherOverviewResponse,
  TeacherExamItem,
  TeacherExamDetail,
  TeacherExamCreateRequest,
  TeacherExamUpdateRequest,
  TeacherResultsListResponse,
  StudentAttemptDetailResponse,
  TeacherLiveAttemptItem,
  TeacherViolationItem,
} from "../types/teacher.types";

export const teacherService = {
  // 1. Overview analytics
  async getOverview(): Promise<TeacherOverviewResponse> {
    const response = await api.get<TeacherOverviewResponse>("/teacher/overview");
    return response.data;
  },

  // 2. Exam management
  async getExams(params?: { search?: string; status?: string }): Promise<TeacherExamItem[]> {
    const response = await api.get<TeacherExamItem[]>("/teacher/exams", { params });
    return response.data;
  },

  async getExamById(examId: string): Promise<TeacherExamDetail> {
    const response = await api.get<TeacherExamDetail>(`/teacher/exams/${examId}`);
    return response.data;
  },

  async createExam(payload: TeacherExamCreateRequest): Promise<{ status: string; exam_id: string; message: string }> {
    const response = await api.post<{ status: string; exam_id: string; message: string }>("/teacher/exams", payload);
    return response.data;
  },

  async updateExam(examId: string, payload: TeacherExamUpdateRequest): Promise<{ status: string; exam_id: string }> {
    const response = await api.put<{ status: string; exam_id: string }>(`/teacher/exams/${examId}`, payload);
    return response.data;
  },

  async togglePublish(examId: string, publish: boolean): Promise<{ status: string; exam_id: string; is_published: boolean; status_label: string }> {
    const response = await api.patch<{ status: string; exam_id: string; is_published: boolean; status_label: string }>(
      `/teacher/exams/${examId}/publish`,
      { publish }
    );
    return response.data;
  },

  async deleteExam(examId: string): Promise<{ status: string; message: string }> {
    const response = await api.delete<{ status: string; message: string }>(`/teacher/exams/${examId}`);
    return response.data;
  },

  // 3. Students & Results
  async getResults(params?: { exam_id?: string; passed?: boolean; search?: string }): Promise<TeacherResultsListResponse> {
    const response = await api.get<TeacherResultsListResponse>("/teacher/results", { params });
    return response.data;
  },

  async getAttemptDetail(attemptId: string): Promise<StudentAttemptDetailResponse> {
    const response = await api.get<StudentAttemptDetailResponse>(`/teacher/results/${attemptId}`);
    return response.data;
  },

  // 4. Live monitoring
  async getLiveMonitoring(): Promise<TeacherLiveAttemptItem[]> {
    const response = await api.get<TeacherLiveAttemptItem[]>("/teacher/monitoring");
    return response.data;
  },

  // 5. Violations & Evidence
  async getViolations(params?: { exam_id?: string; event_type?: string; search?: string }): Promise<TeacherViolationItem[]> {
    const response = await api.get<TeacherViolationItem[]>("/teacher/violations", { params });
    return response.data;
  },

  // 6. Teacher auth helpers
  async requestTeacherOtp(email: string): Promise<{ message: string; email: string; expires_in_seconds: number; debug_otp?: string }> {
    const response = await api.post("/auth/teacher/request-login-otp", { email });
    return response.data;
  },

  async loginTeacherWithOtp(email: string, otp_code: string): Promise<{ access_token: string; token_type: string; user: any }> {
    const response = await api.post("/auth/teacher/login-with-otp", { email, otp_code });
    return response.data;
  },

  async loginTeacherWithPassword(email: string, password: string): Promise<{ access_token: string; token_type: string; user: any }> {
    const response = await api.post("/auth/teacher/login", { email, password });
    return response.data;
  },
};
