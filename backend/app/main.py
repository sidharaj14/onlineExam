import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import Base, engine, AsyncSessionLocal
from app.services.exam_service import ExamService
from app.services.auth_service import seed_demo_accounts_if_empty

def check_and_migrate_db(connection):
    try:
        raw_conn = connection.connection
        cursor = raw_conn.cursor()
        cursor.execute("PRAGMA table_info(exam_attempts);")
        cols = [r[1] for r in cursor.fetchall()]
        if cols:
            if "integrity_score" not in cols:
                cursor.execute("ALTER TABLE exam_attempts ADD COLUMN integrity_score FLOAT DEFAULT 100.0;")
                raw_conn.commit()
                print("[MIGRATION] Added integrity_score column to exam_attempts table.")
            if "attempt_number" not in cols:
                cursor.execute("ALTER TABLE exam_attempts ADD COLUMN attempt_number INTEGER DEFAULT 1;")
                raw_conn.commit()
                print("[MIGRATION] Added attempt_number column to exam_attempts table.")
            if "last_activity_at" not in cols:
                cursor.execute("ALTER TABLE exam_attempts ADD COLUMN last_activity_at DATETIME;")
                raw_conn.commit()
                print("[MIGRATION] Added last_activity_at column to exam_attempts table.")
            if "percentage" not in cols:
                cursor.execute("ALTER TABLE exam_attempts ADD COLUMN percentage FLOAT;")
                raw_conn.commit()
                print("[MIGRATION] Added percentage column to exam_attempts table.")
            if "grading_status" not in cols:
                cursor.execute("ALTER TABLE exam_attempts ADD COLUMN grading_status VARCHAR(30) DEFAULT 'AUTO_GRADED';")
                raw_conn.commit()
                print("[MIGRATION] Added grading_status column to exam_attempts table.")
            if "termination_reason" not in cols:
                cursor.execute("ALTER TABLE exam_attempts ADD COLUMN termination_reason VARCHAR(255);")
                raw_conn.commit()
                print("[MIGRATION] Added termination_reason column to exam_attempts table.")

            # Backfill percentage where score and total_marks exist
            cursor.execute("UPDATE exam_attempts SET percentage = ROUND((score / total_marks) * 100, 2) WHERE percentage IS NULL AND total_marks > 0 AND score IS NOT NULL;")
            # Backfill user_id from users table matching candidate_email
            cursor.execute("UPDATE exam_attempts SET user_id = (SELECT id FROM users WHERE LOWER(users.email) = LOWER(exam_attempts.candidate_email) LIMIT 1) WHERE user_id IS NULL;")
            raw_conn.commit()

        cursor.execute("PRAGMA table_info(students);")
        student_cols = [r[1] for r in cursor.fetchall()]
        if student_cols:
            if "course" not in student_cols:
                cursor.execute("ALTER TABLE students ADD COLUMN course VARCHAR(100);")
                raw_conn.commit()
                print("[MIGRATION] Added course column to students table.")
            if "semester" not in student_cols:
                cursor.execute("ALTER TABLE students ADD COLUMN semester INTEGER DEFAULT 1;")
                raw_conn.commit()
                print("[MIGRATION] Added semester column to students table.")

        cursor.execute("PRAGMA table_info(exams);")
        exam_cols = [r[1] for r in cursor.fetchall()]
        if exam_cols:
            if "status" not in exam_cols:
                cursor.execute("ALTER TABLE exams ADD COLUMN status VARCHAR(30) DEFAULT 'PUBLISHED';")
                raw_conn.commit()
                print("[MIGRATION] Added status column to exams table.")
            if "start_time" not in exam_cols:
                cursor.execute("ALTER TABLE exams ADD COLUMN start_time DATETIME;")
                raw_conn.commit()
                print("[MIGRATION] Added start_time column to exams table.")
            if "end_time" not in exam_cols:
                cursor.execute("ALTER TABLE exams ADD COLUMN end_time DATETIME;")
                raw_conn.commit()
                print("[MIGRATION] Added end_time column to exams table.")

            # Assign unassigned default exams to demo teacher
            cursor.execute("UPDATE exams SET created_by_id = 'demo-teacher-01' WHERE created_by_id IS NULL;")
            raw_conn.commit()
    except Exception as e:
        print(f"[MIGRATION WARNING] {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create all database tables on application startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(check_and_migrate_db)
    print("[SERVER LIFESPAN] Database tables initialized successfully.")

    # Seed default demo accounts and exam
    async with AsyncSessionLocal() as db:
        await seed_demo_accounts_if_empty(db)
        await ExamService.seed_default_exam_if_empty(db)

    yield
    # Cleanup on shutdown
    await engine.dispose()
    print("[SERVER LIFESPAN] Database connections closed.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API with Email OTP Verification, User Profiles, Proctoring & Exam Engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure storage directories exist and mount static files
profiles_dir = os.path.join(os.getcwd(), "storage", "profiles")
os.makedirs(profiles_dir, exist_ok=True)
app.mount("/storage/profiles", StaticFiles(directory=profiles_dir), name="profiles")

verifications_dir = os.path.join(os.getcwd(), "storage", "verifications")
os.makedirs(verifications_dir, exist_ok=True)
app.mount("/storage/verifications", StaticFiles(directory=verifications_dir), name="verifications")

violations_dir = os.path.join(os.getcwd(), "storage", "violations")
os.makedirs(violations_dir, exist_ok=True)
app.mount("/storage/violations", StaticFiles(directory=violations_dir), name="violations")

# Include v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Health"])
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "status": "online",
        "api_docs": "/docs",
        "v1_base": settings.API_V1_STR
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
