import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.email import send_otp_email
from app.core.security import (
    create_access_token,
    generate_otp_code,
    get_password_hash,
    verify_password,
)
from app.db.models.user import Administrator, EmailVerification, Student, User
from app.db.models.exam import SecurityAuditLog
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    SendOtpResponse,
    TokenResponse,
    UserResponse,
    VerifyOtpRequest,
)
from app.schemas.profile import MessageResponse, UpdateProfileRequest

logger = logging.getLogger(__name__)

async def request_registration_otp(db: AsyncSession, req: RegisterRequest) -> SendOtpResponse:
    # 1. Check if user with this email is already registered and verified
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    existing_user = result.scalars().first()
    if existing_user and existing_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email is already registered. Please log in."
        )

    # 2. Invalidate any existing unused registration OTPs for this email
    existing_otps = await db.execute(
        select(EmailVerification).where(
            EmailVerification.email == req.email.lower(),
            EmailVerification.action_type == "REGISTRATION",
            EmailVerification.is_used == False
        )
    )
    for otp_record in existing_otps.scalars().all():
        otp_record.is_used = True

    # 3. Hash password securely before storing in pending registration payload
    hashed_password = get_password_hash(req.password)
    payload_data = {
        "email": req.email.lower(),
        "password_hash": hashed_password,
        "full_name": req.full_name.strip(),
        "role": req.role.lower(),
        "student_id_number": req.student_id_number,
        "department": req.department,
        "course": req.course,
        "semester": req.semester,
        "academic_year": req.academic_year,
        "employee_code": req.employee_code,
        "admin_level": req.admin_level,
    }

    # 4. Generate 6-digit numeric OTP code and expiry
    otp_code = generate_otp_code(6)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    # 5. Persist EmailVerification record
    verification_entry = EmailVerification(
        email=req.email.lower(),
        otp_code=otp_code,
        action_type="REGISTRATION",
        registration_payload=json.dumps(payload_data),
        expires_at=expires_at,
        attempts=0,
        is_used=False
    )
    db.add(verification_entry)
    await db.commit()

    # 6. Deliver OTP via Real Email (SMTP) if configured
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        await send_otp_email(req.email.lower(), otp_code, action="Account Registration")
        msg = f"Verification OTP sent to {req.email.lower()}. Please check your inbox."
    else:
        logger.info(f"SMTP not configured. OTP generated for {req.email.lower()}")
        msg = f"Verification OTP dispatched to {req.email.lower()}."

    logger.info(f"Generated registration OTP for {req.email.lower()}")

    return SendOtpResponse(
        message=msg,
        email=req.email.lower(),
        expires_in_seconds=settings.OTP_EXPIRE_MINUTES * 60,
        debug_otp=otp_code if settings.DEV_MODE else None
    )

async def verify_otp_and_register(db: AsyncSession, req: VerifyOtpRequest) -> TokenResponse:
    now = datetime.now(timezone.utc)

    # 1. Fetch latest active verification record
    result = await db.execute(
        select(EmailVerification).where(
            EmailVerification.email == req.email.lower(),
            EmailVerification.action_type == "REGISTRATION",
            EmailVerification.is_used == False
        ).order_by(EmailVerification.created_at.desc())
    )
    verification = result.scalars().first()

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending registration found for this email. Please submit registration details first."
        )

    # Ensure timezone info for comparison
    exp_time = verification.expires_at
    if exp_time.tzinfo is None:
        exp_time = exp_time.replace(tzinfo=timezone.utc)

    if now > exp_time:
        verification.is_used = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification code has expired. Please request a new code."
        )

    # 2. Check attempt limits
    if verification.attempts >= settings.MAX_OTP_ATTEMPTS:
        verification.is_used = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many verification attempts. Please request a new code."
        )

    # 3. Validate OTP
    verification.attempts += 1
    if verification.otp_code != req.otp_code:
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect verification code. Please check your email and try again."
        )

    # 4. OTP is correct -> Mark as used
    verification.is_used = True

    # 5. Extract pending registration details
    payload = json.loads(verification.registration_payload)

    # 6. Check if user already exists
    user_res = await db.execute(
        select(User).where(User.email == payload["email"])
    )
    user = user_res.scalars().first()

    if not user:
        user = User(
            email=payload["email"],
            password_hash=payload["password_hash"],
            full_name=payload["full_name"],
            role=payload.get("role", "student"),
            is_active=True,
            is_verified=True
        )
        db.add(user)
        await db.flush()

        if user.role == "student":
            student_profile = Student(
                id=user.id,
                student_id_number=payload.get("student_id_number") or f"STU-{user.id[:8].upper()}",
                department=payload.get("department") or "Computer Science",
                course=payload.get("course") or "Computer Science & Engineering",
                semester=payload.get("semester") or 1,
                academic_year=payload.get("academic_year") or 1
            )
            db.add(student_profile)
        elif user.role in ["admin", "teacher"]:
            prefix = "TCH" if user.role == "teacher" else "ADM"
            admin_profile = Administrator(
                id=user.id,
                employee_code=payload.get("employee_code") or f"{prefix}-{user.id[:8].upper()}",
                admin_level=payload.get("admin_level") or "invigilator"
            )
            db.add(admin_profile)
    else:
        user.is_verified = True
        user.is_active = True
        user.password_hash = payload["password_hash"]
        user.full_name = payload["full_name"]

    await db.commit()

    loaded_user = await get_user_with_profiles(db, user.id)

    access_token = create_access_token(
        data={"sub": loaded_user.id, "email": loaded_user.email, "role": loaded_user.role}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(loaded_user)
    )

async def resend_otp(db: AsyncSession, email: str) -> SendOtpResponse:
    email_clean = email.lower()
    result = await db.execute(
        select(EmailVerification).where(
            EmailVerification.email == email_clean,
            EmailVerification.is_used == False
        ).order_by(EmailVerification.created_at.desc())
    )
    last_verification = result.scalars().first()
    if not last_verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending verification found for this email."
        )

    # Cooldown check: 60 seconds between resend requests (enforced in production)
    if not settings.DEV_MODE:
        now = datetime.now(timezone.utc)
        created = last_verification.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        elapsed = (now - created).total_seconds()
        if elapsed < 60:
            wait_sec = max(1, int(60 - elapsed))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {wait_sec} second(s) before requesting a new verification code."
            )

    otp_code = generate_otp_code(6)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    
    last_verification.otp_code = otp_code
    last_verification.expires_at = expires_at
    last_verification.attempts = 0
    await db.commit()

    # Deliver OTP via Real Email (SMTP) if configured
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        await send_otp_email(email_clean, otp_code, action="Verification Code Resend")
        msg = f"A fresh 6-digit OTP code has been sent to {email_clean}."
    else:
        logger.info(f"SMTP not configured. Resent OTP generated for {email_clean}")
        msg = f"A fresh verification code has been dispatched to {email_clean}."

    return SendOtpResponse(
        message=msg,
        email=email_clean,
        expires_in_seconds=settings.OTP_EXPIRE_MINUTES * 60,
        debug_otp=otp_code if settings.DEV_MODE else None
    )

async def authenticate_user(db: AsyncSession, req: LoginRequest) -> TokenResponse:
    clean_email = req.email.strip().lower()
    clean_pwd = req.password.strip()

    result = await db.execute(
        select(User)
        .options(selectinload(User.student_profile), selectinload(User.admin_profile))
        .where(User.email == clean_email)
    )
    user = result.scalars().first()

    # 1. If user doesn't exist, check if there is a pending registration
    if not user:
        pending_res = await db.execute(
            select(EmailVerification).where(
                EmailVerification.email == clean_email,
                EmailVerification.action_type == "REGISTRATION",
                EmailVerification.is_used == False
            ).order_by(EmailVerification.created_at.desc())
        )
        pending_verif = pending_res.scalars().first()
        if pending_verif:
            # Check if user entered the 6-digit OTP into the password field
            if clean_pwd == pending_verif.otp_code:
                # Complete registration and log in immediately
                return await verify_otp_and_register(
                    db, VerifyOtpRequest(email=clean_email, otp_code=pending_verif.otp_code)
                )

            # Check if user entered their chosen registration password
            try:
                reg_payload = json.loads(pending_verif.registration_payload)
                if verify_password(clean_pwd, reg_payload.get("password_hash", "")):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Your account registration is pending email verification. Please enter the 6-digit OTP sent to your email, or enter the OTP directly in the password field."
                    )
            except HTTPException:
                raise
            except Exception:
                pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    # 2. If user exists but is not verified:
    if not user.is_verified:
        # Check if user entered active OTP into password field
        pending_res = await db.execute(
            select(EmailVerification).where(
                EmailVerification.email == clean_email,
                EmailVerification.is_used == False
            ).order_by(EmailVerification.created_at.desc())
        )
        pending_verif = pending_res.scalars().first()
        if pending_verif and clean_pwd == pending_verif.otp_code:
            pending_verif.is_used = True
            user.is_verified = True
            user.is_active = True
            await db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email address not verified. Please enter the 6-digit OTP sent to your email to activate your account."
            )

    # 3. Check password OR active OTP login
    valid_password = verify_password(clean_pwd, user.password_hash)
    if not valid_password:
        # Also check if entered password is a valid unexpired OTP for this email
        otp_res = await db.execute(
            select(EmailVerification).where(
                EmailVerification.email == clean_email,
                EmailVerification.otp_code == clean_pwd,
                EmailVerification.is_used == False
            ).order_by(EmailVerification.created_at.desc())
        )
        matched_otp = otp_res.scalars().first()
        if matched_otp:
            exp_time = matched_otp.expires_at
            if exp_time.tzinfo is None:
                exp_time = exp_time.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) <= exp_time:
                matched_otp.is_used = True
                user.is_verified = True
                user.is_active = True
                await db.commit()
                valid_password = True

    if not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact administration."
        )

    # Security Audit Log for Login
    audit = SecurityAuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        details_json=json.dumps({"email": user.email, "role": user.role}),
    )
    db.add(audit)
    await db.commit()

    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

async def request_login_otp(db: AsyncSession, email: str) -> SendOtpResponse:
    clean_email = email.strip().lower()
    
    # Check if there is already a pending registration
    pending_res = await db.execute(
        select(EmailVerification).where(
            EmailVerification.email == clean_email,
            EmailVerification.action_type == "REGISTRATION",
            EmailVerification.is_used == False
        ).order_by(EmailVerification.created_at.desc())
    )
    if pending_res.scalars().first():
        return await resend_otp(db, clean_email)
    
    user_res = await db.execute(select(User).where(User.email == clean_email))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address. Please register first."
        )
    
    otp_code = generate_otp_code(6)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    
    verification_entry = EmailVerification(
        email=clean_email,
        otp_code=otp_code,
        action_type="LOGIN",
        registration_payload="{}",
        expires_at=expires_at,
        attempts=0,
        is_used=False
    )
    db.add(verification_entry)
    await db.commit()
    
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        await send_otp_email(clean_email, otp_code, action="Sign In Verification")
        msg = f"Sign-in OTP dispatched to {clean_email}. Please check your inbox."
    else:
        msg = f"Sign-in OTP generated for {clean_email}."
        
    return SendOtpResponse(
        message=msg,
        email=clean_email,
        expires_in_seconds=settings.OTP_EXPIRE_MINUTES * 60,
        debug_otp=otp_code if settings.DEV_MODE else None
    )

async def authenticate_with_otp(db: AsyncSession, email: str, otp_code: str) -> TokenResponse:
    clean_email = email.strip().lower()
    clean_otp = otp_code.strip()
    
    # 1. First check if this is a pending registration OTP
    pending_reg = await db.execute(
        select(EmailVerification).where(
            EmailVerification.email == clean_email,
            EmailVerification.action_type == "REGISTRATION",
            EmailVerification.is_used == False
        ).order_by(EmailVerification.created_at.desc())
    )
    reg_verif = pending_reg.scalars().first()
    if reg_verif:
        return await verify_otp_and_register(db, VerifyOtpRequest(email=clean_email, otp_code=clean_otp))
    
    # 2. Check if this is a login or password reset OTP for an existing user
    now = datetime.now(timezone.utc)
    res = await db.execute(
        select(EmailVerification).where(
            EmailVerification.email == clean_email,
            EmailVerification.is_used == False
        ).order_by(EmailVerification.created_at.desc())
    )
    verification = res.scalars().first()
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP found for this email. Please request a new code."
        )
    
    exp_time = verification.expires_at
    if exp_time.tzinfo is None:
        exp_time = exp_time.replace(tzinfo=timezone.utc)
    if now > exp_time:
        verification.is_used = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP code has expired. Please request a new code."
        )
    
    if verification.attempts >= settings.MAX_OTP_ATTEMPTS:
        verification.is_used = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed attempts. Please request a fresh OTP."
        )
        
    verification.attempts += 1
    if verification.otp_code != clean_otp:
        await db.commit()
        remaining = settings.MAX_OTP_ATTEMPTS - verification.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP code. {remaining} attempt(s) remaining."
        )
        
    verification.is_used = True
    
    user_res = await db.execute(
        select(User)
        .options(selectinload(User.student_profile), selectinload(User.admin_profile))
        .where(User.email == clean_email)
    )
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
        
    user.is_verified = True
    user.is_active = True
    
    audit = SecurityAuditLog(
        user_id=user.id,
        action="USER_LOGIN_OTP",
        details_json=json.dumps({"email": user.email, "role": user.role}),
    )
    db.add(audit)
    await db.commit()
    
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

# --- PASSWORD RESET & CHANGE (M2) ---

async def request_password_reset_otp(db: AsyncSession, email: str) -> SendOtpResponse:
    email_clean = email.lower()
    user_res = await db.execute(select(User).where(User.email == email_clean))
    user = user_res.scalars().first()

    if not user or not user.is_verified:
        # Avoid user enumeration by returning a generic message, but for hackathon, raise 404
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No verified account found with this email address."
        )

    # Invalidate previous password reset OTPs
    existing = await db.execute(
        select(EmailVerification).where(
            EmailVerification.email == email_clean,
            EmailVerification.action_type == "PASSWORD_RESET",
            EmailVerification.is_used == False
        )
    )
    for row in existing.scalars().all():
        row.is_used = True

    otp_code = generate_otp_code(6)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    verification = EmailVerification(
        email=email_clean,
        otp_code=otp_code,
        action_type="PASSWORD_RESET",
        registration_payload="{}",
        expires_at=expires_at,
        attempts=0,
        is_used=False
    )
    db.add(verification)
    await db.commit()

    # Deliver OTP via Real Email (SMTP) if configured
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        await send_otp_email(email_clean, otp_code, action="Password Reset")
        msg = f"A 6-digit password reset code has been sent to {email_clean}."
    else:
        print("=" * 70)
        print(f"[ONLINE EXAM SYSTEM - PASSWORD RESET OTP]")
        print(f"Recipient : {email_clean}")
        print(f"OTP Code  : {otp_code}")
        print("=" * 70)
        msg = f"Password reset OTP generated for {email_clean}."

    return SendOtpResponse(
        message=msg,
        email=email_clean,
        expires_in_seconds=settings.OTP_EXPIRE_MINUTES * 60,
        debug_otp=otp_code if (settings.DEV_MODE or not settings.SMTP_PASSWORD) else None
    )

async def reset_password_with_otp(
    db: AsyncSession, email: str, otp_code: str, new_password: str
) -> MessageResponse:
    email_clean = email.lower()
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(EmailVerification).where(
            EmailVerification.email == email_clean,
            EmailVerification.action_type == "PASSWORD_RESET",
            EmailVerification.is_used == False
        ).order_by(EmailVerification.created_at.desc())
    )
    verification = result.scalars().first()

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active password reset request found. Please request an OTP first."
        )

    exp_time = verification.expires_at
    if exp_time.tzinfo is None:
        exp_time = exp_time.replace(tzinfo=timezone.utc)

    if now > exp_time:
        verification.is_used = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset OTP has expired. Please request a new one."
        )

    if verification.attempts >= settings.MAX_OTP_ATTEMPTS:
        verification.is_used = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed attempts. Please request a new reset OTP."
        )

    verification.attempts += 1
    if verification.otp_code != otp_code:
        await db.commit()
        remaining = settings.MAX_OTP_ATTEMPTS - verification.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP code. {remaining} attempt(s) remaining."
        )

    verification.is_used = True

    # Update user password
    user_res = await db.execute(select(User).where(User.email == email_clean))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.password_hash = get_password_hash(new_password)
    await db.commit()

    return MessageResponse(message="Password reset successfully. You can now log in.")

async def change_user_password(
    db: AsyncSession, user: User, current_password: str, new_password: str
) -> MessageResponse:
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    user.password_hash = get_password_hash(new_password)
    await db.commit()
    return MessageResponse(message="Password changed successfully.")

# --- PROFILE MANAGEMENT (M2) ---

async def update_user_profile(
    db: AsyncSession, user: User, data: UpdateProfileRequest
) -> User:
    if data.full_name is not None and data.full_name.strip():
        user.full_name = data.full_name.strip()

    if user.student_profile and user.role == "student":
        if data.student_id_number is not None:
            user.student_profile.student_id_number = data.student_id_number
        if data.department is not None:
            user.student_profile.department = data.department
        if data.course is not None:
            user.student_profile.course = data.course
        if data.semester is not None:
            user.student_profile.semester = data.semester
        if data.academic_year is not None:
            user.student_profile.academic_year = data.academic_year

    if user.admin_profile and (user.role in ["admin", "super_admin", "teacher"]):
        if data.employee_code is not None:
            user.admin_profile.employee_code = data.employee_code

    await db.commit()
    return await get_user_with_profiles(db, user.id)

async def save_profile_photo(
    db: AsyncSession, user: User, file_bytes: bytes, filename: str
) -> User:
    storage_dir = os.path.join(os.getcwd(), "storage", "profiles")
    os.makedirs(storage_dir, exist_ok=True)

    ext = os.path.splitext(filename)[1].lower() or ".jpg"
    saved_name = f"{user.id}_{uuid.uuid4().hex[:8]}{ext}"
    full_path = os.path.join(storage_dir, saved_name)

    with open(full_path, "wb") as f:
        f.write(file_bytes)

    user.avatar_url = f"/storage/profiles/{saved_name}"
    await db.commit()
    return await get_user_with_profiles(db, user.id)

# --- ADMIN USER MANAGEMENT (M2) ---

async def list_users_for_admin(
    db: AsyncSession,
    role: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None
) -> List[User]:
    query = select(User).options(
        selectinload(User.student_profile),
        selectinload(User.admin_profile)
    )

    if role:
        query = query.where(User.role == role.lower())

    if is_active is not None:
        query = query.where(User.is_active == is_active)

    if search:
        term = f"%{search.lower()}%"
        query = query.where(
            or_(User.email.ilike(term), User.full_name.ilike(term))
        )

    query = query.order_by(User.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

async def toggle_user_status(db: AsyncSession, user_id: str, is_active: bool) -> User:
    user = await get_user_with_profiles(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found.")

    user.is_active = is_active
    await db.commit()
    return user

async def get_user_with_profiles(db: AsyncSession, user_id: str) -> Optional[User]:
    result = await db.execute(
        select(User)
        .options(selectinload(User.student_profile), selectinload(User.admin_profile))
        .where(User.id == user_id)
    )
    return result.scalars().first()


async def seed_demo_accounts_if_empty(db: AsyncSession) -> None:
    """Auto-seed demo student and demo admin accounts for instant testing."""
    # 1. Student account: student@example.com / student123
    student_res = await db.execute(select(User).where(User.email == "student@example.com"))
    if not student_res.scalars().first():
        demo_student = User(
            id="demo-student-01",
            email="student@example.com",
            password_hash=get_password_hash("student123"),
            full_name="Alex Johnson",
            role="student",
            is_active=True,
            is_verified=True,
        )
        db.add(demo_student)
        await db.flush()

        student_profile = Student(
            id=demo_student.id,
            student_id_number="CS2026-042",
            department="Computer Science & Engineering",
            academic_year=3,
        )
        db.add(student_profile)
        print("[SEEDED] Demo student account created: student@example.com / student123")

    # 2. Admin account: admin@example.com / admin123
    admin_res = await db.execute(select(User).where(User.email == "admin@example.com"))
    if not admin_res.scalars().first():
        demo_admin = User(
            id="demo-admin-01",
            email="admin@example.com",
            password_hash=get_password_hash("admin123"),
            full_name="Dr. Sarah Vance",
            role="admin",
            is_active=True,
            is_verified=True,
        )
        db.add(demo_admin)
        await db.flush()

        admin_profile = Administrator(
            id=demo_admin.id,
            employee_code="ADM-904",
            admin_level="Chief Proctor",
        )
        db.add(admin_profile)
        print("[SEEDED] Demo admin account created: admin@example.com / admin123")

    await db.commit()

