import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.exam import StudentActivity, Exam, ExamAttempt
from app.db.models.user import User

logger = logging.getLogger(__name__)

class ActivityService:
    @staticmethod
    async def record_activity(
        db: AsyncSession,
        user_id: str,
        activity_type: str,
        title: str,
        description: Optional[str] = None,
        exam_id: Optional[str] = None,
        attempt_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        status: str = "INFO",
        commit: bool = True,
    ) -> Optional[StudentActivity]:
        """
        Records an authentic student lifecycle or examination activity.
        Safely strips secrets and serializes metadata.
        """
        if not user_id:
            return None

        # Clean details dictionary: never store passwords, OTPs, or tokens
        safe_details = {}
        if details and isinstance(details, dict):
            for k, v in details.items():
                if any(sec in k.lower() for sec in ["password", "otp", "token", "secret", "hash"]):
                    continue
                safe_details[k] = v

        try:
            activity = StudentActivity(
                user_id=user_id,
                activity_type=activity_type.upper(),
                title=title,
                description=description,
                exam_id=exam_id,
                attempt_id=attempt_id,
                details_json=json.dumps(safe_details),
                status=status.upper(),
                timestamp=datetime.now(timezone.utc),
            )
            db.add(activity)
            if commit:
                await db.commit()
                await db.refresh(activity)
            return activity
        except Exception as e:
            logger.error(f"Error recording student activity: {e}")
            if commit:
                await db.rollback()
            return None

    @staticmethod
    async def get_student_activities(
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Fetches chronological activity logs for the authenticated student.
        """
        stmt = (
            select(StudentActivity)
            .options(selectinload(StudentActivity.exam))
            .where(StudentActivity.user_id == user_id)
            .order_by(desc(StudentActivity.timestamp))
            .offset(offset)
            .limit(limit)
        )
        res = await db.execute(stmt)
        activities = res.scalars().all()

        results = []
        for a in activities:
            meta = {}
            if a.details_json:
                try:
                    meta = json.loads(a.details_json)
                except Exception:
                    pass

            results.append({
                "id": a.id,
                "activity_type": a.activity_type,
                "title": a.title,
                "description": a.description,
                "exam_id": a.exam_id,
                "exam_title": a.exam.title if a.exam else meta.get("exam_title"),
                "course_code": a.exam.course_code if a.exam else meta.get("course_code"),
                "attempt_id": a.attempt_id,
                "status": a.status,
                "details": meta,
                "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            })
        return results
