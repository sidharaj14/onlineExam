export interface StudentProfile {
  student_id_number?: string;
  department?: string;
  course?: string;
  semester?: number;
  academic_year?: number;
}

export interface AdminProfile {
  employee_code?: string;
  admin_level?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "teacher" | "admin" | "super_admin";
  avatar_url?: string | null;
  is_active: boolean;
  is_verified: boolean;
  student_profile?: StudentProfile;
  admin_profile?: AdminProfile;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role: "student" | "teacher" | "admin";
  student_id_number?: string;
  department?: string;
  course?: string;
  semester?: number;
  academic_year?: number;
  employee_code?: string;
  admin_level?: string;
}

export interface SendOtpResponse {
  message: string;
  email: string;
  expires_in_seconds: number;
  debug_otp?: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp_code: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}
