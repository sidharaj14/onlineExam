import { api } from "./api";
import type {
  LoginPayload,
  RegisterPayload,
  SendOtpResponse,
  TokenResponse,
  UserProfile,
  VerifyOtpPayload,
} from "../types/auth.types";

export interface UpdateProfilePayload {
  full_name?: string;
  student_id_number?: string;
  department?: string;
  course?: string;
  semester?: number;
  academic_year?: number;
  employee_code?: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<SendOtpResponse> {
    const response = await api.post<SendOtpResponse>("/auth/register", payload);
    return response.data;
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>("/auth/verify-otp", payload);
    return response.data;
  },

  async resendOtp(email: string): Promise<SendOtpResponse> {
    const response = await api.post<SendOtpResponse>("/auth/resend-otp", { email });
    return response.data;
  },

  async login(payload: LoginPayload): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>("/auth/login", payload);
    return response.data;
  },

  async loginWithOtp(email: string, otpCode: string): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>("/auth/login-with-otp", {
      email,
      otp_code: otpCode,
    });
    return response.data;
  },

  async requestLoginOtp(email: string): Promise<SendOtpResponse> {
    const response = await api.post<SendOtpResponse>("/auth/request-login-otp", { email });
    return response.data;
  },

  async getCurrentUser(): Promise<UserProfile> {
    const response = await api.get<UserProfile>("/users/me");
    return response.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    const response = await api.patch<UserProfile>("/users/me", payload);
    return response.data;
  },

  async uploadPhoto(file: File): Promise<UserProfile> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<UserProfile>("/users/me/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>("/users/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  async forgotPassword(email: string): Promise<SendOtpResponse> {
    const response = await api.post<SendOtpResponse>("/auth/forgot-password", { email });
    return response.data;
  },

  async resetPassword(email: string, otpCode: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>("/auth/reset-password", {
      email,
      otp_code: otpCode,
      new_password: newPassword,
    });
    return response.data;
  },
};
