# 04 — System Architecture: AI-Powered Secure Online Examination & Proctoring System

This document outlines the end-to-end multi-tier architecture, data flows, subsystem boundaries, network communication protocols, and processing pipelines.

---

## 1. High-Level Architecture Overview

The system employs a **Hybrid Edge-Server Architecture**. High-frequency facial geometry tracking (468-point Face Mesh, 3D Head Pose, Eye Gaze, and Face Presence) is executed client-side directly in the candidate's browser via WebAssembly/WebGL to ensure zero network latency, zero video bandwidth saturation, and absolute privacy during normal operation. 

Server-side services handle heavy biometric embeddings (FaceNet / InsightFace for identity verification), sampled-frame deep learning object detection (YOLOv8-nano), speech-to-text processing (Faster-Whisper), relational transaction management, violation rule evaluation, and real-time WebSocket telemetry distribution to invigilators.

---

## 2. Mermaid Architecture Diagrams

### 2.1. System Architecture Diagram

```mermaid
graph TB
    subgraph ClientTier ["Client Tier (Student & Admin Browsers)"]
        subgraph StudentApp ["Student Examination App (React + Vite)"]
            UI["Exam UI & State Manager"]
            EdgeVision["In-Browser Edge AI (MediaPipe Face Mesh)"]
            AudioCapture["Web Audio API & VAD"]
            WSClient["WebSocket Telemetry Client"]
            MediaCapture["Offscreen Canvas Evidence Generator"]
        end
        subgraph AdminApp ["Admin Invigilation Console (React + Vite)"]
            AdminUI["Live Cohort Dashboard & Report Viewer"]
            AdminWS["Real-Time Alert Subscriber"]
        end
    end

    subgraph NetworkGateway ["Network & Gateway Tier"]
        ReverseProxy["Reverse Proxy / TLS 1.3"]
        REST_GW["REST API Gateway (/api/v1)"]
        WS_GW["WebSocket Gateway (/ws)"]
    end

    subgraph BackendTier ["Backend Application Tier (FastAPI Async)"]
        AuthService["Auth & RBAC Service (JWT)"]
        ExamService["Exam & Question Delivery Engine"]
        ViolationEngine["Proctoring & Violation Rules Engine"]
        EvidenceService["Evidence & Watermarking Service"]
        AuditService["Audit Log & Reporting Service"]
        WSManager["WebSocket Connection Manager"]
    end

    subgraph AIWorkerTier ["AI/ML Subsystem Tier"]
        FaceVerifyWorker["FaceNet / InsightFace Biometric Verification"]
        YoloWorker["YOLOv8-nano Prohibited Object Detector"]
        WhisperWorker["Faster-Whisper STT & Keyword Matcher"]
    end

    subgraph PersistenceTier ["Persistence & Storage Tier"]
        DB[(SQLite / PostgreSQL DB - SQLAlchemy)]
        EvidenceStore["Encrypted Evidence Media Store (/storage/evidence)"]
    end

    UI --> WSClient
    EdgeVision --> UI
    AudioCapture --> UI
    MediaCapture --> REST_GW
    WSClient --> WS_GW
    AdminWS --> WS_GW
    AdminUI --> REST_GW

    WS_GW --> WSManager
    REST_GW --> AuthService
    REST_GW --> ExamService
    REST_GW --> EvidenceService
    REST_GW --> AuditService

    WSManager --> ViolationEngine
    ViolationEngine --> DB
    ViolationEngine --> EvidenceService
    ViolationEngine --> WSManager

    EvidenceService --> EvidenceStore
    EvidenceService --> DB

    AuthService --> DB
    AuthService --> FaceVerifyWorker
    ExamService --> DB
    AuditService --> DB

    ViolationEngine --> YoloWorker
    ViolationEngine --> WhisperWorker
```

---

### 2.2. Student Examination Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (Browser)
    participant UI as Exam Interface
    participant Edge as MediaPipe Edge AI
    participant API as FastAPI Backend
    participant WS as WebSocket Hub
    participant DB as Relational DB

    Student->>UI: Login with Credentials
    UI->>API: POST /api/v1/auth/login
    API-->>UI: 200 OK (JWT Token + Profile)
    
    Student->>UI: Launch Pre-Exam System Check
    UI->>Edge: Initialize Camera & Mic
    Edge-->>UI: Hardware Verified
    
    Student->>UI: Capture Live Identity Selfie
    UI->>API: POST /api/v1/proctoring/verify-face (Image)
    API->>DB: Fetch Reference Embedding
    API-->>UI: 200 OK (Similarity >= 0.75 - Verified)
    
    UI->>API: POST /api/v1/attempts/start (Exam ID)
    API->>DB: Initialize ExamAttempt Record
    API-->>UI: Attempt Created + Question Set
    
    UI->>WS: Connect WebSocket (Token + Attempt ID)
    WS-->>UI: 101 Switching Protocols (Connected)
    
    loop Active Examination Session (30 FPS Edge Loop)
        Edge->>UI: Head Pose (Pitch/Yaw/Roll), Gaze, Presence
        UI->>WS: Send Periodic Telemetry JSON
        Student->>UI: Select Question Answers
        UI->>API: PATCH /api/v1/attempts/{id}/answers (Auto-save)
    end
    
    Student->>UI: Click Submit Exam
    UI->>API: POST /api/v1/attempts/{id}/submit
    API->>DB: Finalize Attempt (Status: SUBMITTED)
    API-->>UI: 200 OK (Submission Confirmed)
    UI->>Student: Display Completion Screen & Free Camera
```

---

### 2.3. AI Proctoring Pipeline

```mermaid
flowchart TD
    RawVideo[Raw Camera Stream 720p @ 30 FPS] --> ClientCanvas[HTML5 Canvas]
    RawAudio[Microphone Stream 16kHz Mono] --> AudioWorklet[Web Audio Worklet]

    subgraph ClientEdgeAI ["Client-Side Edge AI (In-Browser MediaPipe)"]
        ClientCanvas --> FaceMesh[MediaPipe Face Mesh 468 Keypoints]
        FaceMesh --> HeadPose[3D solvePnP: Pitch, Yaw, Roll]
        FaceMesh --> EyeGaze[Iris Landmark Offset Vector]
        FaceMesh --> FaceCount[Face Bounding Box Counter]
        
        HeadPose --> HeuristicCheck{Anomaly Detected?}
        EyeGaze --> HeuristicCheck
        FaceCount --> HeuristicCheck
        
        HeuristicCheck -- Yes --> AnomalyBuffer[Temporal Window Filter: 1.5s - 3.0s]
        AnomalyBuffer -- Sustained --> ClientTelemetry[Emit AI Event JSON]
    end

    subgraph ServerAI ["Server-Side AI Pipeline (FastAPI Asynchronous)"]
        ClientCanvas -. Sampled Frame (Every 3s or Trigger) .-> YOLOV8[YOLOv8-nano Inference]
        YOLOV8 --> ObjectCheck{Prohibited Object Conf >= 0.65?}
        ObjectCheck -- Yes --> ServerTelemetry[Emit PROHIBITED_OBJECT Event]

        AudioWorklet --> VAD[WebRTC Voice Activity Detector]
        VAD -- Speech Detected --> Whisper[Faster-Whisper tiny.en STT]
        Whisper --> KeywordMatcher{Suspicious Keyword Matched?}
        KeywordMatcher -- Yes --> AudioTelemetry[Emit SUSPICIOUS_SPEECH Event]
    end

    ClientTelemetry --> ViolationEngine[Central Violation Engine]
    ServerTelemetry --> ViolationEngine
    AudioTelemetry --> ViolationEngine
```

---

### 2.4. Violation Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DetectionSignal: AI Event Received
    DetectionSignal --> ConfidenceCheck: Evaluate Model Confidence
    ConfidenceCheck --> TemporalFilter: Confidence >= Threshold
    ConfidenceCheck --> [*]: Confidence < Threshold (Discard)

    TemporalFilter --> CooldownCheck: Sustained >= Time Window
    TemporalFilter --> [*]: Transient Spike (Ignore)

    CooldownCheck --> RuleEvaluator: Cooldown Expired
    CooldownCheck --> [*]: In Cooldown Window (Suppress duplicate)

    RuleEvaluator --> EvidenceTrigger: Map Severity (Low/Med/High/Critical)
    EvidenceTrigger --> CalculatePoints: Trigger Screenshot / Audio Capture
    CalculatePoints --> WarningCheck: Cumulative Points Updated

    WarningCheck --> WarningIssued: Points >= 30 or 60
    WarningCheck --> Disqualification: Points >= 100 or 3 Warnings
    WarningCheck --> SilentAudit: Points < 30

    WarningIssued --> ClientModal: Push Alert over WebSocket
    ClientModal --> WarningCheck: Candidate Acknowledges Warning
    Disqualification --> ExamLocked: Auto-Submit & Lock Interface
    ExamLocked --> [*]
```

---

### 2.5. Evidence Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant VE as Violation Engine
    participant Client as Student Browser Canvas
    participant Backend as Evidence Handler
    participant Disk as Local File Storage
    participant DB as SQLite / PostgreSQL
    participant Admin as Admin Reviewer

    VE->>Client: Request Evidence Capture (Triggered by Rule)
    Client->>Client: Render Frame to Offscreen Canvas
    Client->>Client: Draw Anomaly Bounding Box & Metadata Watermark
    Client->>Backend: POST /api/v1/evidence/upload (JPEG Image + Metadata)
    
    Backend->>Backend: Compute SHA-256 Hash
    Backend->>Disk: Write File to /storage/evidence/{exam_id}/{cand_id}/{uuid}.jpg
    Backend->>DB: INSERT INTO evidence_records (uuid, violation_id, file_path, sha256_hash, timestamp)
    Backend-->>VE: Evidence Record Created (ID: uuid)
    
    Note over DB,Admin: Post-Exam or Live Review
    Admin->>Backend: GET /api/v1/evidence/{uuid}
    Backend->>DB: Verify Admin JWT & Fetch Record
    Backend->>Disk: Read File & Verify SHA-256 Checksum
    Backend-->>Admin: Stream Media Stream with Verified Stamp
```

---

### 2.6. Admin Monitoring Flow

```mermaid
flowchart LR
    subgraph CandidatePool ["Active Examination Candidates (1..N)"]
        CandA[Student A: Compliant]
        CandB[Student B: Warning 1]
        CandC[Student C: Disqualified]
    end

    subgraph WSServer ["WebSocket Event Gateway"]
        Broker[Broadcast Broker & Topic Multiplexer]
    end

    subgraph AdminConsole ["Admin Live Invigilation Center"]
        AlertFeed[Live Alert Notification Stream]
        CandidateGrid[Candidate Risk Matrix Grid]
        DetailModal[Forensic Evidence Inspector]
    end

    CandA -. Heartbeat JSON .-> Broker
    CandB -. Violation Event .-> Broker
    CandC -. Disqualification Event .-> Broker

    Broker ==> AlertFeed
    Broker ==> CandidateGrid

    CandidateGrid -->|Click Candidate Card| DetailModal
    DetailModal -->|Action: Dismiss False Positive| Broker
    DetailModal -->|Action: Confirm / Manual Disqualify| Broker
```

---

## 3. Subsystem Breakdown

### 3.1. Frontend Tier (React + Vite)
- **Framework**: React 18 / 19 using TypeScript for strict type guarantees across API and telemetry payloads.
- **Routing**: Client-side declarative routing (`react-router-dom`) with authenticated Route Guards separating Student and Admin workspaces.
- **UI & Design**: Tailwind CSS utility framework coupled with Lucide React iconography for responsive, lightweight, accessible UI styling.
- **State Management**: Zustand / React Context for lean, global, synchronous state tracking (exam questions, current selected answers, remaining timer seconds, real-time proctoring status).
- **Edge Vision Engine**: MediaPipe Face Mesh JavaScript/Wasm package executing on an unrendered HTML5 `<video>` element, mapping 468 landmark coordinates at 30 FPS.

### 3.2. Backend Application Tier (Python FastAPI)
- **Framework**: FastAPI running under Uvicorn with `asyncio` event loops for high-concurrency non-blocking I/O.
- **API Protocol**: RESTful JSON endpoints complying with OpenAPI 3.0 standards.
- **Real-Time Gateway**: WebSockets (`FastAPI.WebSocket`) handling persistent bidirectional channels with heartbeat pings and group broadcasts.
- **Data Validation**: Pydantic v2 schemas providing automatic data validation, error serialization, and typed request bodies.

### 3.3. Artificial Intelligence & Computer Vision Tier
- **Facial Landmark & Pose**: MediaPipe Face Mesh Wasm runtime (client) computing Euler angles via 3D keypoint Perspective-n-Point estimation.
- **Facial Verification**: Python `face_recognition` / `InsightFace` generating 128-dimensional L2-normalized feature vectors for cosine similarity distance checks.
- **Object Detection**: Ultralytics `YOLOv8-nano` PyTorch/ONNX model trained on COCO dataset, running on 640x640 resolution sampled frames.
- **Speech Intelligence**: `Faster-Whisper` running quantized `tiny.en` CTranslate2 models for low-latency acoustic transcription on standard CPU cores.

### 3.4. Persistence & Storage Tier
- **Relational Database**: SQLite with WAL (Write-Ahead Logging) mode enabled for zero-config hackathon execution, abstracted via SQLAlchemy 2.0 Async ORM (allowing seamless migration to PostgreSQL without code refactoring).
- **Evidence Storage**: Structured filesystem storage under `/storage/evidence/{exam_id}/{candidate_id}/` indexed by UUIDv4 with strict Unix permissions (0600) and SHA-256 verification.
