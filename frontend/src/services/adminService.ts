import { api } from "./api";
import type { UserProfile } from "../types/auth.types";

export interface GetUsersParams {
  role?: string;
  search?: string;
  is_active?: boolean;
}

export interface AdminExamAttempt {
  id: string;
  exam_id: string;
  exam_title: string;
  course_code: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean | null;
  started_at: string;
  submitted_at: string | null;
  verification_photo_url: string | null;
  violations_count: number;
}

export const adminService = {
  async getUsers(params?: GetUsersParams): Promise<{ total: number; users: UserProfile[] }> {
    const response = await api.get<{ total: number; users: UserProfile[] }>("/admin/users", {
      params,
    });
    return response.data;
  },

  async toggleUserStatus(userId: string, isActive: boolean): Promise<UserProfile> {
    const response = await api.patch<UserProfile>(`/admin/users/${userId}/status`, {
      is_active: isActive,
    });
    return response.data;
  },

  async getExamAttempts(examId?: string): Promise<{ attempts: AdminExamAttempt[] }> {
    const url = examId ? `/exams/admin/${examId}/attempts` : `/exams/admin/attempts`;
    const response = await api.get<{ attempts: AdminExamAttempt[] }>(url);
    return response.data;
  },
};

