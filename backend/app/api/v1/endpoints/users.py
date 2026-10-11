from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.auth import UserResponse
from app.schemas.profile import (
    ChangePasswordRequest,
    MessageResponse,
    UpdateProfileRequest,
)
from app.services.auth_service import (
    change_user_password,
    save_profile_photo,
    update_user_profile,
)

router = APIRouter()

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile"
)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile information"
)
async def update_my_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    updated = await update_user_profile(db, current_user, req)
    return UserResponse.model_validate(updated)

@router.post(
    "/me/photo",
    response_model=UserResponse,
    summary="Upload reference profile photo / avatar"
)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a valid image (JPEG, PNG, WebP)."
        )

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum 5MB limit."
        )

    updated = await save_profile_photo(db, current_user, content, file.filename or "photo.jpg")
    return UserResponse.model_validate(updated)

@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change user password with current password verification"
)
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await change_user_password(db, current_user, req.current_password, req.new_password)
