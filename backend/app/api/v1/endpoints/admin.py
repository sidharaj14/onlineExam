from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.auth import UserResponse
from app.schemas.profile import ToggleStatusRequest, UserListResponse
from app.services.auth_service import list_users_for_admin, toggle_user_status

router = APIRouter()

@router.get(
    "/users",
    response_model=UserListResponse,
    summary="List all users with filtering (Admin only)"
)
async def get_all_users(
    role: Optional[str] = Query(None, description="Filter by role: student, admin"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_admin: User = Depends(require_role(["admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    users = await list_users_for_admin(db, role=role, search=search, is_active=is_active)
    return UserListResponse(
        total=len(users),
        users=[UserResponse.model_validate(u) for u in users]
    )

@router.patch(
    "/users/{user_id}/status",
    response_model=UserResponse,
    summary="Activate or suspend a user account (Admin only)"
)
async def change_user_active_status(
    user_id: str,
    req: ToggleStatusRequest,
    current_admin: User = Depends(require_role(["admin", "super_admin"])),
    db: AsyncSession = Depends(get_db)
):
    user = await toggle_user_status(db, user_id, req.is_active)
    return UserResponse.model_validate(user)
