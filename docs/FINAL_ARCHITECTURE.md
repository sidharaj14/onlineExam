# ExamGuard AI — Final System Architecture

## 1. System Overview
**ExamGuard AI** is a dual-tier, real-time proctoring and secure assessment engine designed for high-stakes institutional examinations. The platform couples client-side continuous vision analysis with asynchronous server-side verification and SQLite relational persistence.

```mermaid
graph TD
    subgraph Client [Browser Client (React 19 + TypeScript + Tailwind)]
        UI[Candidate Examination UI]
        Cam[MediaStream WebCam & Mic]
        Face[Face & Gaze Analysis Engine]
        Obj[Device & Secondary Person Classifier]
        Vis[Page Visibility & Fullscreen Guard]
    end

    subgraph Backend [FastAPI Backend Server]
        Auth[Auth & JWT Verification Service]
        ExamSvc[Exam Lifecycle Service]
        Audit[Security Audit Logger]
        Viol[Violation & Strike Arbitrator]
        Mail[Gmail SMTP Dispatcher]
    end

    subgraph Storage [Relational Persistence (SQLite)]
        DB[(onlineexam.db)]
        T_Users[users]
        T_Exams[exams & questions]
        T_Attempts[exam_attempts]
        T_Answers[attempt_answers]
        T_Violations[proctoring_violations]
        T_Audit[security_audit_logs]
    end

    Cam --> Face
    Cam --> Obj
    UI --> Vis
    Face --> UI
    Obj --> UI
    Vis --> UI
    UI -- REST API (HTTPS/Bearer) --> Backend
    Backend --> Storage
```

## 2. Component Architecture
### 2.1 Candidate Frontend
- **Framework**: React 19, TypeScript, Tailwind CSS, Vite.
- **State Management**: Zustand store (`useAuthStore`) with role-based routing guards.
- **Routing**: React Router DOM v7 with strict `<ProtectedRoute allowedRoles={["admin", "super_admin"]}>` isolation.
- **Hardware Integration**: WebRTC `navigator.mediaDevices.getUserMedia` pipeline, persisting hardware permissions across pre-flight hardware checks and the active examination canvas.

### 2.2 Proctoring Pipeline
- **Continuous Edge Inference**: Analyzes live video frames at 2 FPS using canvas-based color histogram, optical variance, and bounding reticles to identify candidate absence, secondary individuals in camera radar, and mobile devices.
- **Debounced Escalation**: Client enforces debouncing windows ($\ge 6$s) and frame stability checks (4–6s) before dispatching violations to prevent false-positive penalties from natural head tilts or lighting changes.

### 2.3 Backend API Layer
- **Engine**: FastAPI, Pydantic v2, SQLAlchemy 2.0.
- **Security & Authorization**: RBAC via dependency injection (`require_role`), JWT bearer tokens, SHA-256 salted password hashing (`passlib[bcrypt]`).
- **Integrity Calculation**: Dynamic grading of attempt integrity ($100 - \text{strikes} \times 20$), persisted directly into relational SQLite tables.

### 2.4 Persistence Layer
- **Single Source of Truth**: `/onlineexam.db`.
- **Relational Tables**: `users`, `exams`, `questions`, `exam_attempts`, `attempt_answers`, `proctoring_violations`, `security_audit_logs`.
