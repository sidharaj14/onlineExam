from fastapi import APIRouter
from app.api.v1.endpoints import admin, auth, users, exams

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & OTP"])
api_router.include_router(users.router, prefix="/users", tags=["Users & Profile"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin Operations"])
api_router.include_router(exams.router, prefix="/exams", tags=["Examinations & Taking Engine"])
