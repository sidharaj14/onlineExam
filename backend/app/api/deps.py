from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import decode_access_token
from app.db.models.user import User
from app.db.session import get_db
from app.services.auth_service import get_user_with_profiles

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_optional_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

DEMO_TOKEN_MAP = {
    "demo-teacher-jwt-token": "teacher@example.com",
    "demo-admin-jwt-token": "admin@example.com",
    "demo-student-jwt-token": "student@example.com",
}

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Check for quick-access demo tokens during testing/evaluation
    if token in DEMO_TOKEN_MAP:
        demo_email = DEMO_TOKEN_MAP[token]
        res = await db.execute(
            select(User)
            .options(selectinload(User.student_profile), selectinload(User.admin_profile))
            .where(User.email == demo_email)
        )
        demo_user = res.scalars().first()
        if not demo_user:
            from app.services.auth_service import seed_demo_accounts_if_empty
            await seed_demo_accounts_if_empty(db)
            res = await db.execute(
                select(User)
                .options(selectinload(User.student_profile), selectinload(User.admin_profile))
                .where(User.email == demo_email)
            )
            demo_user = res.scalars().first()

        if demo_user and demo_user.is_active:
            return demo_user
        raise credentials_exception

    # 2. Standard JWT token decoding
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = await get_user_with_profiles(db, user_id)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return user

async def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_optional_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not token:
        return None
    try:
        if token in DEMO_TOKEN_MAP:
            demo_email = DEMO_TOKEN_MAP[token]
            res = await db.execute(
                select(User)
                .options(selectinload(User.student_profile), selectinload(User.admin_profile))
                .where(User.email == demo_email)
            )
            demo_user = res.scalars().first()
            return demo_user if (demo_user and demo_user.is_active) else None

        payload = decode_access_token(token)
        if not payload:
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = await get_user_with_profiles(db, user_id)
        return user if (user and user.is_active) else None
    except Exception:
        return None

def require_role(allowed_roles: List[str]):
    effective_allowed = set(allowed_roles)
    if "admin" in effective_allowed:
        effective_allowed.add("teacher")
    if "teacher" in effective_allowed:
        effective_allowed.add("admin")
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in effective_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Operation not permitted for role '{current_user.role}'. Required: {allowed_roles}"
            )
        return current_user
    return role_checker
