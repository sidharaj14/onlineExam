from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: str = Field(..., min_length=2, max_length=150)
    role: str = Field("student", description="'student' or 'admin'")
    # Optional fields for student
    student_id_number: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    semester: Optional[int] = 1
    academic_year: Optional[int] = 1
    # Optional fields for admin/teacher
    employee_code: Optional[str] = None
    admin_level: Optional[str] = "invigilator"

class SendOtpResponse(BaseModel):
    message: str
    email: str
    expires_in_seconds: int
    debug_otp: Optional[str] = None

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]{6}$")

class ResendOtpRequest(BaseModel):
    email: EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class StudentProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    student_id_number: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    semester: Optional[int] = None
    academic_year: Optional[int] = None

class AdminProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    employee_code: Optional[str] = None
    admin_level: Optional[str] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    student_profile: Optional[StudentProfileResponse] = None
    admin_profile: Optional[AdminProfileResponse] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
