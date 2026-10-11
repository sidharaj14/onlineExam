# ExamGuard AI — REST API Documentation

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/register`
- **Description**: Registers a new candidate account and dispatches a 6-digit numeric OTP to the provided email address via SMTP.
- **Request Body**:
  ```json
  {
    "email": "candidate@institution.edu",
    "password": "SecurePassword123",
    "full_name": "Jane Doe",
    "role": "student"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "Verification OTP sent to candidate@institution.edu",
    "email": "candidate@institution.edu"
  }
  ```

### `POST /api/v1/auth/verify-otp`
- **Description**: Verifies candidate email OTP code and activates account.
- **Request Body**:
  ```json
  {
    "email": "candidate@institution.edu",
    "otp_code": "849201"
  }
  ```

### `POST /api/v1/auth/login`
- **Description**: Authenticates user credentials and issues a JWT access token.
- **Request Body**: Form-data or JSON with `username` (email) and `password`.
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "candidate@institution.edu",
      "full_name": "Jane Doe",
      "role": "student"
    }
  }
  ```

---

## 2. Exam Lifecycle Endpoints (`/api/v1/exams`)

### `GET /api/v1/exams`
- **Description**: Retrieves catalog of active examinations available to the student.
- **Auth**: Optional / Student.

### `POST /api/v1/exams/{exam_id}/start`
- **Description**: Begins an exam session. Records `EXAM_START` audit log, establishes attempt baseline, initializes `integrity_score = 100.0`.
- **Auth**: Student / Bearer Token.

### `POST /api/v1/exams/attempts/{attempt_id}/answers`
- **Description**: Autosaves answer selection for a specific question. Upserts into `attempt_answers`.
- **Request Body**:
  ```json
  {
    "question_id": 4,
    "selected_option": "B"
  }
  ```

### `POST /api/v1/exams/attempts/{attempt_id}/violations`
- **Description**: Incurs a proctoring violation strike, recalculates integrity score, and persists incident with snapshot.
- **Request Body**:
  ```json
  {
    "violation_type": "MULTIPLE_FACES",
    "message": "Secondary face detected in camera viewport.",
    "snapshot_base64": "data:image/jpeg;base64,..."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "violations_count": 1,
    "is_terminated": false,
    "integrity_score": 80.0
  }
  ```

### `POST /api/v1/exams/attempts/{attempt_id}/submit`
- **Description**: Grades all answers against question keys, transitions status to `"submitted"`, records submission audit log.

### `GET /api/v1/exams/attempts/{attempt_id}/result`
- **Description**: Returns graded score, percentage, integrity score, and breakdown.
- **Security**: Verifies candidate ownership; returns `403 Forbidden` if another student attempts access.

---

## 3. Administrative Console Endpoints (`/api/v1/exams/admin/*`)

### `GET /api/v1/exams/admin/attempts`
- **Description**: Chief Invigilator roster of all student attempts across all assessments.
- **Authorization**: `require_role(["admin", "super_admin"])`. Rejects students with `403 Forbidden`.

### `POST /api/v1/exams/admin/create`
- **Description**: Creates a new exam with attached question bank.
- **Authorization**: `require_role(["admin", "super_admin"])`.
