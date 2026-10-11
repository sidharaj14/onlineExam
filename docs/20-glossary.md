# 20 — Project Glossary & Domain Terminology

This document establishes the official definitions, terminology, mathematical parameters, and acronyms used across the proctoring platform documentation and codebase.

---

## 1. Domain Concepts & Definitions

### 1.1. Proctoring (Invigilation)
The continuous monitoring and supervision of an examination candidate to deter, detect, and document academic dishonesty, unauthorized collaboration, or the use of illicit aids during test administration.

### 1.2. AI Event (Telemetry Signal)
A raw, probabilistic data packet emitted by a computer vision or acoustic model indicating an observed anomaly (e.g. `HEAD_POSE_ANOMALY` with Yaw $= 32^\circ$, Confidence $= 0.85$). An AI event is **not** a confirmed violation until validated by the Violation Engine.

### 1.3. Suspicious Event (Candidate Anomaly)
An AI event whose confidence exceeds the minimum detection threshold, temporarily retained in an in-memory accumulator to verify whether the anomaly persists over time.

### 1.4. Confirmed Violation
An actionable, validated breach of exam conduct confirmed by the Violation Engine after satisfying minimum confidence, temporal persistence, and cooldown requirements. Formally logged in the database with assigned strike points.

### 1.5. Violation Severity
A categorical ranking determining the gravity and point weight of a violation:
- **LOW**: Minor or ambiguous movement (10 points, e.g. looking away).
- **MEDIUM**: Clear breach of testing environment conduct (25 points, e.g. face absence, tab switch).
- **HIGH**: Active cheating attempt (50 points, e.g. cell phone in hand, unauthorized person, spoken question).
- **CRITICAL**: Identity fraud or surrogate test-taker (100 points, e.g. biometric identity mismatch).

### 1.6. Strike Points
A numerical penalty assigned to a confirmed violation. Cumulative strike points dictate status transitions:
- $0 - 29\text{ Points}$: `COMPLIANT` / `AT_RISK`
- $30 - 59\text{ Points}$: `WARNING_1`
- $60 - 99\text{ Points}$: `WARNING_2`
- $\ge 100\text{ Points}$: `DISQUALIFIED`

### 1.7. Warning
An on-screen intervention presented to the candidate. Requires explicit acknowledgment to resume test interaction, ensuring the candidate is fully informed of detected infractions before further penalties accumulate.

### 1.8. Automatic Disqualification
The irreversible termination of an active examination attempt triggered when a candidate accumulates $\ge 100$ strike points or receives 3 unheeded warnings. Freezes inputs and finalizes current responses for administrative audit.

### 1.9. Evidence Record
A cryptographically hashed (SHA-256), timestamped media asset (watermarked JPEG screenshot or WAV audio snippet) linked to a confirmed violation to provide non-repudiation during academic review.

### 1.10. Face Detection vs. Face Verification
- **Face Detection**: Localizing the 2D/3D coordinates of human faces within a video frame (e.g. "Is there a face present? How many?").
- **Face Verification**: Deep metric comparison confirming whether a detected face belongs to a specific enrolled identity via vector embedding distance.

### 1.11. Head Pose (Pitch, Yaw, Roll)
The 3D orientation of the candidate's head relative to the camera frame, expressed in Euler angles:
- **Yaw ($\theta_y$)**: Turning head horizontally Left or Right.
- **Pitch ($\theta_x$)**: Tilting head vertically Up (ceiling) or Down (lap/desk).
- **Roll ($\theta_z$)**: Tilting head sideways toward shoulders.

### 1.12. Eye Gaze Tracking
Computing the vector direction of the candidate's pupils/irises relative to eye corners to determine if the candidate is looking away from the display even while their head remains centered.

### 1.13. Prohibited Object Detection
The computer vision pipeline (YOLOv8-nano) identifying physical contraband within the camera frame, including smartphones, secondary laptops, and textbooks.

### 1.14. Speaker & Speech Detection
The acoustic pipeline utilizing Voice Activity Detection (VAD) to isolate vocal sound and Faster-Whisper to transcribe speech and spot forbidden keywords.

### 1.15. Temporal Persistence
The minimum continuous duration (in seconds or consecutive video frames) an anomaly must remain active before it can be classified as a violation (e.g. phone visible for $> 1.5\text{s}$, head turned for $> 2.5\text{s}$).

### 1.16. Cooldown Window
A temporal lock period initiated immediately after a violation is confirmed, preventing redundant penalties from firing repeatedly for a single continuous infraction.

### 1.17. Integrity Trust Score
A percentage index ($0\% - 100\%$) representing the candidate's overall adherence to examination integrity, calculated as $\max(0, 100 - \sum \text{StrikePoints})$.

### 1.18. Exam Attempt
An instance of a student undertaking a scheduled examination, tracking start time, submitted answers, completion time, and final status.

### 1.19. Proctoring Session
The real-time operational envelope monitoring an exam attempt, tracking the active WebSocket connection, telemetry heartbeats, accumulated strikes, and live status.

### 1.20. Audit Log
An append-only, tamper-evident chronological ledger recording all security events, authentication attempts, warnings, and administrative overrides.

---

## 2. Acronyms & Standards

| Acronym | Definition |
| :--- | :--- |
| **API** | Application Programming Interface |
| **BBox** | Bounding Box (Coordinates $x_{\min}, y_{\min}, x_{\max}, y_{\max}$) |
| **EMA** | Exponential Moving Average (Temporal smoothing filter) |
| **FERPA** | Family Educational Rights and Privacy Act |
| **FPS** | Frames Per Second |
| **HMR** | Hot Module Replacement (Vite development server) |
| **JWT** | JSON Web Token (RFC 7519) |
| **MCQ** | Multiple Choice Question |
| **PnP** | Perspective-n-Point (3D-to-2D pose estimation) |
| **RBAC** | Role-Based Access Control |
| **RMS** | Root Mean Square (Acoustic signal energy calculation) |
| **SPA** | Single Page Application |
| **STT** | Speech-to-Text |
| **TTL** | Time-To-Live |
| **VAD** | Voice Activity Detection |
| **Wasm** | WebAssembly |
| **WSS** | WebSocket Secure (Encrypted WebSocket) |
