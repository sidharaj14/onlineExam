# 10 — API Specification: REST Endpoints & WebSocket Protocols

This document specifies the RESTful endpoints, WebSocket protocols, authentication requirements, JSON schemas, status codes, and error models for the proctoring platform.

---

## 1. Global API Standards

- **Base URL**: `/api/v1`
- **Protocol**: HTTP/1.1 and HTTP/2 over TLS 1.3
- **Authentication**: Bearer Token in `Authorization: Bearer <JWT>` header
- **Standard Error Response**:
  ```json
  {
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "Exam with ID 'ex-123' does not exist.",
      "details": {}
    }
  }
  ```

---

## 2. Authentication Endpoints (`/auth`)

### 2.1. User Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Auth**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "student@university.edu",
    "password": "SecurePassword123!",
    "role": "student"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "token_type": "bearer",
    "expires_in": 7200,
    "user": {
      "id": "usr-8829-uuid",
      "email": "student@university.edu",
      "full_name": "Alex Chen",
      "role": "student"
    }
  }
  ```
- **Errors**: `400 Bad Request`, `401 Unauthorized` (Invalid credentials), `429 Too Many Requests`.

---

## 3. Student & Profile Endpoints (`/students`)

### 3.1. Enroll Biometric Reference Face
- **Endpoint**: `POST /api/v1/students/enroll-face`
- **Auth**: Bearer (Student or Admin)
- **Request Body** (`multipart/form-data`):
  - `file`: Image file (JPEG/PNG, min $480 \times 480$, max 5MB)
- **Response (201 Created)**:
  ```json
  {
    "profile_id": "prof-9912-uuid",
    "user_id": "usr-8829-uuid",
    "enrolled_at": "2026-09-11T05:00:00Z",
    "status": "ENROLLED"
  }
  ```
- **Errors**: `400 Bad Request` (No face detected or multiple faces in reference image).

---

## 4. Exam Management Endpoints (`/exams`)

### 4.1. List Available Exams (Student View)
- **Endpoint**: `GET /api/v1/exams`
- **Auth**: Bearer (Student or Admin)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "ex-cs101-uuid",
      "title": "CS101: Introduction to Algorithms",
      "description": "Midterm Examination",
      "duration_minutes": 60,
      "total_marks": 50,
      "start_window": "2026-09-11T05:00:00Z",
      "end_window": "2026-09-11T08:00:00Z",
      "status": "ACTIVE"
    }
  ]
  ```

### 4.2. Create Examination (Admin)
- **Endpoint**: `POST /api/v1/exams`
- **Auth**: Bearer (Admin role required)
- **Request Body**:
  ```json
  {
    "title": "CS101: Midterm Examination",
    "description": "Comprehensive evaluation covering sorting, graph theory, and dynamic programming.",
    "duration_minutes": 60,
    "total_marks": 50,
    "passing_marks": 20,
    "start_window": "2026-09-11T05:00:00Z",
    "end_window": "2026-09-11T08:00:00Z",
    "proctoring_rules": {
      "gaze_tracking": true,
      "object_detection": true,
      "speech_detection": true,
      "disqualification_threshold": 100
    },
    "is_published": true
  }
  ```
- **Response (201 Created)**: Returns created exam object with UUID.

---

## 5. Question Endpoints (`/exams/{id}/questions`)

### 5.1. Add Questions to Exam (Admin)
- **Endpoint**: `POST /api/v1/exams/{exam_id}/questions`
- **Auth**: Bearer (Admin)
- **Request Body**:
  ```json
  {
    "question_text": "What is the worst-case time complexity of QuickSort?",
    "points": 2,
    "sequence_order": 1,
    "options": [
      { "option_text": "O(N log N)", "is_correct": false, "option_index": 0 },
      { "option_text": "O(N^2)", "is_correct": true, "option_index": 1 },
      { "option_text": "O(N)", "is_correct": false, "option_index": 2 },
      { "option_text": "O(log N)", "is_correct": false, "option_index": 3 }
    ]
  }
  ```
- **Response (201 Created)**: Returns question object with option IDs.

---

## 6. Examination Attempt & Delivery Endpoints (`/attempts`)

### 6.1. Start Examination Attempt
- **Endpoint**: `POST /api/v1/attempts/start`
- **Auth**: Bearer (Student)
- **Request Body**:
  ```json
  {
    "exam_id": "ex-cs101-uuid"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "attempt_id": "att-7721-uuid",
    "exam_id": "ex-cs101-uuid",
    "started_at": "2026-09-11T05:15:00Z",
    "duration_minutes": 60,
    "questions": [
      {
        "id": "q-1-uuid",
        "question_text": "What is the worst-case time complexity of QuickSort?",
        "points": 2,
        "sequence_order": 1,
        "options": [
          { "id": "opt-1-uuid", "option_text": "O(N log N)", "option_index": 0 },
          { "id": "opt-2-uuid", "option_text": "O(N^2)", "option_index": 1 },
          { "id": "opt-3-uuid", "option_text": "O(N)", "option_index": 2 },
          { "id": "opt-4-uuid", "option_text": "O(log N)", "option_index": 3 }
        ]
      }
    ]
  }
  ```

### 6.2. Auto-Save Student Answer
- **Endpoint**: `PATCH /api/v1/attempts/{attempt_id}/answers`
- **Auth**: Bearer (Student)
- **Request Body**:
  ```json
  {
    "question_id": "q-1-uuid",
    "selected_option_id": "opt-2-uuid"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "SAVED",
    "answered_at": "2026-09-11T05:16:42Z"
  }
  ```

### 6.3. Submit Final Examination
- **Endpoint**: `POST /api/v1/attempts/{attempt_id}/submit`
- **Auth**: Bearer (Student)
- **Response (200 OK)**:
  ```json
  {
    "attempt_id": "att-7721-uuid",
    "status": "SUBMITTED",
    "submitted_at": "2026-09-11T06:14:50Z",
    "score": 42,
    "total_marks": 50
  }
  ```

---

## 7. Proctoring & Biometrics Endpoints (`/proctoring`)

### 7.1. Pre-Exam Facial Identity Verification
- **Endpoint**: `POST /api/v1/proctoring/verify-face`
- **Auth**: Bearer (Student)
- **Request Body**:
  ```json
  {
    "exam_id": "ex-cs101-uuid",
    "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "verified": true,
    "similarity_score": 0.892,
    "threshold": 0.750,
    "message": "Biometric face verification successful."
  }
  ```
- **Response (403 Forbidden - Mismatch)**:
  ```json
  {
    "verified": false,
    "similarity_score": 0.412,
    "threshold": 0.750,
    "error": "Face does not match registered profile."
  }
  ```

### 7.2. Acknowledge Warning Modal
- **Endpoint**: `POST /api/v1/proctoring/warnings/{warning_id}/acknowledge`
- **Auth**: Bearer (Student)
- **Response (200 OK)**:
  ```json
  {
    "warning_id": "warn-101-uuid",
    "acknowledged_at": "2026-09-11T05:32:00Z"
  }
  ```

---

## 8. Evidence Upload & Retrieval Endpoints (`/evidence`)

### 8.1. Upload Watermarked Evidence Asset
- **Endpoint**: `POST /api/v1/evidence/upload`
- **Auth**: Bearer (Student/Internal)
- **Request Body** (`multipart/form-data`):
  - `violation_id`: UUID
  - `media_type`: `"IMAGE_JPEG"` | `"AUDIO_WAV"`
  - `file`: Binary file
- **Response (201 Created)**:
  ```json
  {
    "evidence_id": "ev-5512-uuid",
    "violation_id": "viol-9011-uuid",
    "sha256_hash": "4e7b3a9c9f1a238e83...",
    "captured_at": "2026-09-11T05:22:15Z"
  }
  ```

### 8.2. Stream Evidence Asset (Admin Review)
- **Endpoint**: `GET /api/v1/evidence/{evidence_id}`
- **Auth**: Bearer (Admin)
- **Response (200 OK)**: Binary media stream (`image/jpeg` or `audio/wav`) with header `X-SHA256-Checksum: 4e7b3a9c...`.

---

## 9. Admin & Reporting Endpoints (`/admin` & `/reports`)

### 9.1. Get Live Examination Cohort Status
- **Endpoint**: `GET /api/v1/admin/exams/{exam_id}/live-roster`
- **Auth**: Bearer (Admin)
- **Response (200 OK)**:
  ```json
  [
    {
      "candidate_id": "usr-8829-uuid",
      "full_name": "Alex Chen",
      "attempt_id": "att-7721-uuid",
      "status": "WARNING_1",
      "cumulative_points": 50,
      "warning_count": 1,
      "last_heartbeat": "2026-09-11T05:35:10Z",
      "active_violations": [
        {
          "id": "viol-9011-uuid",
          "code": "PROHIBITED_OBJECT",
          "severity": "HIGH",
          "timestamp": "2026-09-11T05:22:15Z",
          "evidence_id": "ev-5512-uuid"
        }
      ]
    }
  ]
  ```

### 9.2. Review / Override Violation Disposition
- **Endpoint**: `POST /api/v1/admin/violations/{violation_id}/review`
- **Auth**: Bearer (Admin)
- **Request Body**:
  ```json
  {
    "action": "DISMISS",
    "reviewer_notes": "Candidate was reaching for prescribed inhaler."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "violation_id": "viol-9011-uuid",
    "reviewer_status": "DISMISSED",
    "updated_cumulative_points": 0
  }
  ```

### 9.3. Get Comprehensive Proctoring Report
- **Endpoint**: `GET /api/v1/reports/{attempt_id}`
- **Auth**: Bearer (Admin or Attempt Owner)
- **Response (200 OK)**:
  ```json
  {
    "report_id": "rep-3310-uuid",
    "attempt_id": "att-7721-uuid",
    "candidate_name": "Alex Chen",
    "exam_title": "CS101: Midterm Examination",
    "exam_score": 42,
    "total_marks": 50,
    "integrity_trust_score": 80,
    "total_violations": 2,
    "warnings_issued": 1,
    "final_disposition": "COMPLETED_WITH_WARNINGS",
    "incident_timeline": [
      {
        "timestamp": "2026-09-11T05:22:15Z",
        "violation_code": "LOOKING_AWAY",
        "severity": "LOW",
        "duration_seconds": 3.2,
        "evidence_url": "/api/v1/evidence/ev-5512-uuid"
      }
    ]
  }
  ```

---

## 10. WebSocket Telemetry Protocol (`/ws`)

### 10.1. Connection Handshake
- **URL**: `ws://localhost:8000/ws/proctoring/{attempt_id}?token=<JWT>`
- **Protocol**: Raw JSON frames over WebSocket

### 10.2. Client-to-Server Telemetry Frames
The client streams telemetry packets every $1.0\text{ second}$:

```json
{
  "type": "TELEMETRY_HEARTBEAT",
  "timestamp": "2026-09-11T05:20:00.100Z",
  "client_fps": 28.5,
  "head_pose": {
    "pitch": -4.2,
    "yaw": 8.1,
    "roll": 1.2
  },
  "eye_gaze": {
    "horizontal_ratio": 0.51,
    "is_looking_away": false
  },
  "face_count": 1,
  "mic_rms_energy": 0.012
}
```

### 10.3. Server-to-Client Warning Broadcast
When a violation escalates to a warning or disqualification:

```json
{
  "type": "VIOLATION_ESCALATION",
  "action": "ISSUE_WARNING_1",
  "warning_id": "warn-101-uuid",
  "warning_level": 1,
  "strike_points": 50,
  "violation_code": "PROHIBITED_OBJECT",
  "message": "Warning 1: Prohibited device (cell phone) detected in your workspace."
}
```
