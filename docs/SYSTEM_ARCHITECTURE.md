# Comprehensive System Architecture & Engineering Specifications

**Project Title**: AI-Powered Secure Online Examination & Proctoring System  
**System Class**: Production-Grade Full-Stack AI Proctoring Platform  
**Target Deployment**: Distributed Web Architecture  

---

## 1. High-Level Architectural Topology

The application utilizes a decoupled, three-tier architecture comprising a modern Single-Page Application (SPA) client, an asynchronous RESTful API gateway, an embedded Computer Vision Engine, and an Async Relational Database tier.

```mermaid
flowchart TD
    subgraph Client Layer ["Client Tier (React + TypeScript + Vite)"]
        UI[Student / Teacher SPA]
        WEBCAM[MediaDevices API / WebRTC]
        VIS[Page Visibility API Listener]
    end

    subgraph API Layer ["API Gateway Tier (FastAPI + Async Python)"]
        ROUTER[FastAPI Router & CORS]
        AUTH[JWT / BCrypt Auth Service]
        EXAM[Exam Lifecycle & Grading Service]
        PROC_EP[Process-Frame & Violation Endpoints]
    end

    subgraph Engine Layer ["Computer Vision & AI Tier (OpenCV + Darknet)"]
        PREPROC[Frame Equalization & Normalization]
        FACE[Haar Cascade Face Detector]
        YOLO[Darknet YOLOv4-tiny COCO Engine]
        TEMP[1.5s Temporal Persistence Engine]
    end

    subgraph Data Layer ["Persistence Tier (SQLAlchemy Async + Storage)"]
        DB[(PostgreSQL / SQLite Database)]
        STORAGE[Evidence Snapshot Directory]
    end

    UI -->|HTTPS REST API| ROUTER
    WEBCAM -->|Base64 JPEG @ 500ms| PROC_EP
    VIS -->|Immediate TAB_SWITCH Payload| PROC_EP

    ROUTER --> AUTH
    ROUTER --> EXAM
    PROC_EP --> PREPROC

    PREPROC --> FACE
    PREPROC --> YOLO
    FACE --> TEMP
    YOLO --> TEMP

    TEMP -->|Confirmed Strike| DB
    TEMP -->|Annotated JPG| STORAGE
    EXAM --> DB
    AUTH --> DB
```

---

## 2. Layer-by-Layer Technical Architecture

### 2.1 Presentation & Client Tier (`frontend/`)
- **Technology Stack**: React 18, TypeScript 5, Vite 8, Tailwind CSS 3, Zustand 4.
- **Client Responsibilities**:
  - Renders responsive candidate and invigilator dashboards.
  - Manages WebRTC webcam media streams (`navigator.mediaDevices.getUserMedia`).
  - Samples frame snapshots onto offscreen HTML5 `<canvas>` elements at 500ms intervals.
  - Intercepts system events (Page Visibility API, prohibited hotkeys, right-click, window blur).
  - Handles client-side state via Zustand (`useAuthStore`) with local storage token sync.

---

### 2.2 API & Business Logic Tier (`backend/app/api/`)
- **Technology Stack**: FastAPI, Uvicorn, Python 3.14, PyJWT, Passlib (BCrypt).
- **Core Endpoints**:
  - `POST /api/v1/auth/login`: Identity verification & JWT token issuing.
  - `POST /api/v1/auth/register`: Candidate registration & role assignment.
  - `GET /api/v1/exams/attempts/{attempt_id}`: Exam session state retrieval.
  - `POST /api/v1/exams/attempts/{attempt_id}/save-answer`: Real-time answer autosave.
  - `POST /api/v1/exams/attempts/{attempt_id}/process-frame`: Async computer vision frame processing.
  - `POST /api/v1/exams/attempts/{attempt_id}/violation`: Direct proctoring infraction recording.
  - `POST /api/v1/exams/attempts/{attempt_id}/submit`: Exam submission & auto-grading engine.

---

### 2.3 Computer Vision & AI Processing Pipeline (`backend/app/proctoring/`)

```mermaid
flowchart LR
    A[Base64 JPEG Frame] --> B[OpenCV Base64 Decoder]
    B --> C[L-Channel Equalization cv2.equalizeHist]
    C --> D{Face Presence Analysis}
    D -->|0 Faces| E[NO_FACE Detection]
    D -->|2+ Faces| F[MULTIPLE_FACES Detection]
    D -->|1 Face| G[Darknet YOLOv4-tiny Engine]
    G -->|Class 67 cell phone| H[Spatial Bounding Box Filter]
    H -->|Confidence >= 0.45| I[Non-Maximum Suppression NMS]
    I --> J{1.5s Temporal Persistence}
    J -->|Verified Persistence| K[Record Strike + Save Evidence JPG]
```

- **Face Detection Component**: Uses OpenCV Haar Cascade classifier (`haarcascade_frontalface_default.xml`) to evaluate face presence (`NO_FACE` or `MULTIPLE_FACES`).
- **Object Detection Component**: Integrates `YOLOv4-tiny` weights trained on COCO dataset (80 classes) running inside `cv2.dnn.readNetFromDarknet()`. Filters explicitly for COCO Class 67 (`cell phone`).
- **Spatial Context Filter**: Enforces bounding box area bounds ($0.5\% \le \text{area} \le 35\%$), aspect ratio limits ($0.3 \le AR \le 3.2$), and excludes face region overlaps ($<45\%$) to eliminate hand false positives.
- **Temporal Persistence Filter**: Requires consecutive positive detections across a 1.5-second time window before escalating an observation into an official strike.

---

### 2.4 Browser Visibility Security Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant Student as Candidate Browser
    participant API as FastAPI Backend
    participant DB as Relational Database

    Note over Student: Candidate actively taking examination
    Student->>Student: Candidate switches browser tab / window
    Student->>Student: Browser fires visibilitychange (document.hidden = true)
    Student->>Student: handleTabSwitchViolation() debounces via lastTabSwitchTimeRef (5s)
    Student->>API: POST /api/v1/exams/attempts/{attempt_id}/violation (TAB_SWITCH)
    API->>DB: Insert ProctoringViolation & increment violations_count
    API-->>Student: Return { violations_count: N, terminated: boolean }
    Note over Student: Update HUD, play buzzer, display Strike modal
    alt N >= 3
        Student->>API: POST /api/v1/exams/attempts/{attempt_id}/submit
        API->>DB: Update attempt.status = TERMINATED_VIOLATION
        Student->>Student: Redirect to /exams/{attempt_id}/result
    end
```

---

### 2.5 Data & Persistence Tier (`backend/app/db/`)
- **ORM & Driver**: Async SQLAlchemy with AsyncIO SQLite / PostgreSQL database pool.
- **Data Entities**:
  - `users`: Identity, BCrypt password hashes, role, profile details.
  - `exams`: Title, course code, duration, pass criteria.
  - `questions`: Question text, options JSON, correct answers JSON, marks.
  - `exam_attempts`: Attempt session state, timer, score, integrity score.
  - `attempt_answers`: Relational table tracking every option selected by candidates.
  - `proctoring_violations`: Relational strike logs containing event type, strike number, and evidence file URL.
  - `security_audit_logs`: Audit trail for compliance and invigilator review.
