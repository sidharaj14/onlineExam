# Technical Documentation & Developer Setup Guide

**Project Title**: AI-Powered Secure Online Examination & Proctoring System  
**Repository**: `/Users/sidharaj/Desktop/onlineexam`  

---

## 1. Local Environment Setup

### Prerequisites
- Python 3.10+ (Python 3.14 verified)
- Node.js 18+ & npm 9+
- OpenCV 4.14+
- Git

### 1.1 Backend Installation & Startup
```bash
# Navigate to repository root
cd /Users/sidharaj/Desktop/onlineexam

# Activate Python Virtual Environment
source backend/venv/bin/activate

# Install Dependencies
pip install -r backend/requirements.txt

# Run FastApi Development Server
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend Swagger API Docs will be available at: `http://localhost:8000/docs`

---

### 1.2 Frontend Installation & Startup
```bash
# Navigate to frontend directory
cd /Users/sidharaj/Desktop/onlineexam/frontend

# Install Dependencies
npm install

# Run Vite Development Server
npm run dev
```

Frontend application will be available at: `http://localhost:5173`

---

## 2. API Endpoint Reference Manual

### 2.1 Authentication & Profile
- `POST /api/v1/auth/register` — Candidate / Faculty registration.
- `POST /api/v1/auth/login` — Identity authentication & JWT token generation.
- `POST /api/v1/auth/send-otp` — Generates 6-digit numeric OTP.
- `POST /api/v1/auth/verify-otp` — Verifies candidate OTP code.
- `GET /api/v1/users/profile` — Retrieves authenticated profile.
- `PUT /api/v1/users/profile` — Updates full name, course, or semester.

### 2.2 Examination Lifecycle & Proctoring
- `GET /api/v1/exams` — Retrieves available exams.
- `POST /api/v1/exams/{exam_id}/start` — Initializes candidate exam attempt.
- `GET /api/v1/exams/attempts/{attempt_id}` — Retrieves attempt questions & saved answers.
- `POST /api/v1/exams/attempts/{attempt_id}/save-answer` — Autosaves question response.
- `POST /api/v1/exams/attempts/{attempt_id}/process-frame` — Processes Base64 JPEG frame via OpenCV & YOLOv4-tiny.
- `POST /api/v1/exams/attempts/{attempt_id}/violation` — Directly records infraction strike.
- `POST /api/v1/exams/attempts/{attempt_id}/submit` — Submits exam & calculates auto-grading score.
- `GET /api/v1/exams/attempts/{attempt_id}/result` — Retrieves detailed candidate scorecard.

---

## 3. Automated Testing Guide

### Running Backend Pytest Suite
```bash
PYTHONPATH=backend backend/venv/bin/pytest backend/tests -v
```

### Running Frontend Production Build & Type Checking
```bash
npm --prefix frontend run build
```
