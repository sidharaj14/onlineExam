from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    ResendOtpRequest,
    SendOtpResponse,
    TokenResponse,
    UserResponse,
    VerifyOtpRequest,
)
from app.schemas.profile import (
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
)
from app.services.auth_service import (
    authenticate_user,
    authenticate_with_otp,
    request_login_otp,
    request_password_reset_otp,
    request_registration_otp,
    resend_otp,
    reset_password_with_otp,
    verify_otp_and_register,
)

router = APIRouter()

@router.post(
    "/register",
    response_model=SendOtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit registration details and receive email verification OTP"
)
async def register(
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Step 1 of Registration:
    Submits user information (name, email, password, role), validates that email is unique,
    hashes the password securely, and generates a 6-digit numeric OTP valid for 10 minutes.
    """
    return await request_registration_otp(db, req)

@router.post(
    "/verify-otp",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Verify 6-digit OTP code to complete user registration and log in"
)
async def verify_otp(
    req: VerifyOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2 of Registration:
    Verifies the 6-digit OTP against the pending registration for this email.
    If valid, creates the active user and profile, marks email as verified,
    and returns an access token for immediate login.
    """
    return await verify_otp_and_register(db, req)

@router.post(
    "/resend-otp",
    response_model=SendOtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Resend a fresh 6-digit OTP to the specified email"
)
async def resend_registration_otp(
    req: ResendOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Resends a new 6-digit OTP for pending registrations if the previous one expired or was lost.
    """
    return await resend_otp(db, req.email)

@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user and obtain JWT token"
)
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticates registered and verified users via email and password (or OTP).
    Returns JWT access token with role and user profile.
    """
    return await authenticate_user(db, req)

@router.post(
    "/login-with-otp",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate using email and 6-digit OTP code"
)
async def login_with_otp(
    req: VerifyOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Passwordless / OTP-based authentication.
    Validates the 6-digit OTP for pending registrations or existing users and logs in immediately.
    """
    return await authenticate_with_otp(db, req.email, req.otp_code)

@router.post(
    "/request-login-otp",
    response_model=SendOtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Request a 6-digit sign-in OTP for passwordless login"
)
async def request_otp_for_login(
    req: ResendOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Dispatches a 6-digit login OTP to the candidate/proctor email address.
    """
    return await request_login_otp(db, req.email)

@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get profile of currently logged-in user"
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Fetches the profile and role details of the authenticated user.
    """
    return UserResponse.model_validate(current_user)

@router.post(
    "/forgot-password",
    response_model=SendOtpResponse,
    status_code=status.HTTP_200_OK,
    summary="Request a password reset OTP"
)
async def forgot_password(
    req: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Sends an Email OTP to the user for resetting their password.
    """
    return await request_password_reset_otp(db, req.email)

@router.post(
    "/reset-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify OTP and reset password"
)
async def reset_password(
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies the password reset OTP and updates the user's password.
    """
    return await reset_password_with_otp(db, req.email, req.otp_code, req.new_password)
