import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(20), nullable=False, default="student")  # 'student', 'teacher', 'admin', 'super_admin'
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    # Relationships
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    admin_profile = relationship("Administrator", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    student_id_number = Column(String(50), unique=True, index=True, nullable=True)
    department = Column(String(100), nullable=True)
    course = Column(String(100), nullable=True)
    semester = Column(Integer, nullable=True, default=1)
    academic_year = Column(Integer, nullable=True, default=1)

    user = relationship("User", back_populates="student_profile")

class Administrator(Base):
    __tablename__ = "administrators"

    id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    employee_code = Column(String(50), unique=True, index=True, nullable=True)
    admin_level = Column(String(30), default="invigilator", nullable=False)

    user = relationship("User", back_populates="admin_profile")

class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), index=True, nullable=False)
    otp_code = Column(String(6), nullable=False)
    action_type = Column(String(30), default="REGISTRATION", nullable=False)  # 'REGISTRATION' | 'PASSWORD_RESET'
    registration_payload = Column(Text, nullable=False, default="{}")  # JSON-encoded payload
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
