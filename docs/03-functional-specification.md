# 03 — Functional Specification: AI-Powered Secure Online Examination & Proctoring System

This document specifies the technical execution details, state machines, algorithmic steps, data transformations, and input/output contracts for every major subsystem.

---

## 1. Authentication & Identity Verification

### 1.1. Student & Administrator Authentication
- **Purpose**: Authenticate users securely into the system, establish cryptographic sessions via JWT, and enforce role-based access control (RBAC).
- **Inputs**: Email/Username, Password string, Role (`student` | `admin`).
- **Processing**:
  1. Validate payload structure using Pydantic schema.
  2. Query database for user record by email.
  3. Verify password hash using `bcrypt.checkpw(password, user.password_hash)`.
  4. Generate signed JWT containing `sub` (User UUID), `role`, `iat`, and `exp` (120 minutes TTL).
- **Outputs**: HTTP 200 with JWT access token and user profile object; HTTP 401 for invalid credentials.
- **User Interaction**: Clean modal login form with input validation, password reveal toggle, and clear error banners.
- **Backend Behavior**: Atomic query execution; logs successful logins and increments failed attempt counters in `AuditLog`.
- **Failure Conditions**: Database unreachable, invalid credentials, rate limit exceeded (> 5 failed attempts per minute locks IP for 5 minutes).
- **Acceptance Criteria**: Valid credentials generate standard RFC 7519 JWT; invalid credentials fail with 401 Unauthorized; token expires after configured TTL.

---

### 1.2. Pre-Exam Facial Biometric Verification
- **Purpose**: Ensure that the candidate in front of the camera matches the registered institutional face profile before granting access to exam questions.
- **Inputs**: Live webcam still image (Base64 JPEG), Candidate ID, Exam ID.
- **Processing**:
  1. Extract 128-d or 512-d facial embedding from the live capture using FaceNet / InsightFace.
  2. Retrieve the candidate's reference biometric embedding stored in `FaceProfile`.
  3. Compute Cosine Distance:
     $$D_{\text{cosine}}(A, B) = 1 - \frac{A \cdot B}{\|A\|_2 \|B\|_2}$$
  4. Evaluate similarity: If Similarity $\ge 0.75$, mark verification as `SUCCESS`; if between $0.60$ and $0.74$, prompt candidate to adjust lighting and retry; if $< 0.60$, reject.
- **Outputs**: JSON `{ "verified": true, "similarity_score": 0.89, "session_token": "..." }`.
- **User Interaction**: Candidate aligns their face inside a target oval on screen. System displays real-time alignment feedback ("Hold still...", "Move closer", "Lighting too dark").
- **Backend Behavior**: Executes image decoding in memory; logs verification score into `proctoring_sessions`.
- **AI Behavior**: Face detector locates face ROI; fails if 0 faces or $>1$ face is present in the frame.
- **Failure Conditions**: No webcam stream detected, low resolution ($< 480\text{p}$), excessive glare, no face found.
- **Acceptance Criteria**: Live image matching profile with similarity $\ge 0.75$ unlocks the exam within 1.5 seconds; non-matching faces are blocked.

---

## 2. Examination Management & Delivery

### 2.1. Exam Authoring & Scheduling (Admin)
- **Purpose**: Enable administrators to configure exam parameters, duration, question pools, and proctoring sensitivity thresholds.
- **Inputs**: Exam Title, Description, Duration (minutes), Start Time, End Time, Passing Score, Questions Array (Question text, 4 options, correct answer index, points), Proctoring Settings (enable/disable specific detectors, strike points).
- **Processing**: Validate start/end times ($End > Start$); serialize question bank; persist in `exams` and `questions` tables in a single transaction.
- **Outputs**: HTTP 201 Created with Exam ID.
- **Acceptance Criteria**: Created exam appears in Admin schedule and becomes accessible to enrolled students only within the scheduled window.

---

### 2.2. Student Examination Interface & State Persistence
- **Purpose**: Render examination questions, handle response selections, track time remaining, and protect against data loss.
- **Inputs**: Student clicks option selection (radio button A, B, C, or D).
- **Processing**:
  1. Optimistically update local React state.
  2. Asynchronously transmit `PATCH /api/attempts/{attempt_id}/answers` with `{ "question_id": "...", "selected_option_id": "..." }`.
  3. Backend updates `student_answers` table with upsert semantics (`ON CONFLICT DO UPDATE`).
- **Outputs**: HTTP 200 OK with server timestamp.
- **Edge Cases**: Network disconnection: UI flags question as "Saved locally"; retries queue when network connectivity restores.
- **Acceptance Criteria**: Answers persist instantly; page refresh reloads exact previously selected choices and remaining time.

---

### 2.3. Fullscreen & Tab Switch Enforcement
- **Purpose**: Detect attempts by the student to navigate away from the exam window or access local applications.
- **Inputs**: Browser DOM events: `visibilitychange`, `blur`, `fullscreenchange`.
- **Processing**:
  1. If `document.hidden === true` or window loses focus (`blur`), increment tab-switch counter.
  2. Dispatch telemetry event `TAB_SWITCH_OR_BLUR` over WebSocket.
  3. Violation engine triggers an instant medium-severity violation (25 points).
- **Outputs**: Fullscreen warning modal: "Warning: You left the examination screen. Continued focus loss will result in disqualification."
- **Acceptance Criteria**: Any tab switch or window blur is logged with timestamp within 500ms.

---

## 3. Continuous Vision Proctoring

### 3.1. Face Presence & Absence Detection
- **Purpose**: Continuously ensure the verified test-taker remains seated in front of the testing workstation.
- **Inputs**: Video stream frames processed at 15-30 FPS via MediaPipe Face Mesh.
- **Processing**:
  1. Face detector returns array of bounding boxes: `faces = detector.detect(frame)`.
  2. If `faces.length === 0`, start/increment `absence_timer`.
  3. If `absence_timer >= 2.0 seconds`:
     - Emit candidate anomaly `FACE_ABSENT` with start timestamp and duration.
- **Outputs**: Real-time telemetry message sent to backend WebSocket.
- **User Interaction**: Subtle UI toast indicator: "Face not detected. Please return to frame."
- **Acceptance Criteria**: Candidate ducking under desk or walking away triggers `FACE_ABSENT` violation within 2.5 seconds.

---

### 3.2. Multiple Face & Additional Person Detection
- **Purpose**: Identify unauthorized helpers or bystanders in the testing environment.
- **Inputs**: Video stream frames.
- **Processing**:
  1. `faces = detector.detect(frame)`.
  2. If `faces.length >= 2`, start `multi_face_timer`.
  3. If `multi_face_timer >= 1.0 second`:
     - Classify anomaly as `MULTIPLE_FACES`.
     - Capture frame with bounding boxes surrounding all detected faces.
- **Outputs**: Confirmed violation `MULTIPLE_FACES` (Severity: HIGH, 50 points).
- **Acceptance Criteria**: Second person leaning into frame for $> 1.0$ second triggers violation and records screenshot.

---

### 3.3. 3D Head Pose Estimation (Pitch, Yaw, Roll)
- **Purpose**: Detect candidates continuously turning their head to read notes or look at secondary monitors.
- **Inputs**: 468 3D facial landmarks from MediaPipe Face Mesh.
- **Processing**:
  1. Select 6 canonical facial keypoints: Nose tip (landmark 1), Chin (landmark 199), Left eye outer corner (landmark 33), Right eye outer corner (landmark 263), Left mouth corner (landmark 61), Right mouth corner (landmark 291).
  2. Use Perspective-n-Point (`solvePnP`) with a generic 3D human head model to compute rotation vector $R$ and translation vector $T$.
  3. Convert rotation vector to Euler angles: Pitch ($\theta_x$), Yaw ($\theta_y$), Roll ($\theta_z$).
  4. Evaluate thresholds:
     - Yaw: Head turned Left/Right $> 28^\circ$.
     - Pitch: Head turned Up/Down $> 22^\circ$.
  5. If deviation persists continuously for $> 2.5\text{ seconds}$, emit `HEAD_POSE_ANOMALY`.
- **Acceptance Criteria**: Sustained head turn to the side for 3 seconds triggers violation; momentary glances ($<2\text{s}$) are suppressed.

---

### 3.4. Eye Gaze Direction & Looking Away
- **Purpose**: Detect subtle visual tracking where the head remains relatively still, but the eyes continuously focus away from the screen.
- **Inputs**: MediaPipe Iris landmarks (Landmarks 468–477).
- **Processing**:
  1. Compute the center of the iris relative to the inner and outer canthus of both eyes:
     $$\text{GazeRatio}_{\text{horizontal}} = \frac{x_{\text{iris}} - x_{\text{inner\_corner}}}{x_{\text{outer\_corner}} - x_{\text{inner\_corner}}}$$
  2. Normalize horizontal gaze ratio (0.5 represents straight-ahead central focus).
  3. Detect looking left ($< 0.35$), looking right ($> 0.65$), or looking down ($> 0.70$ vertical).
  4. If out-of-center gaze persists for $> 3.0\text{ seconds}$, emit `LOOKING_AWAY`.
- **Acceptance Criteria**: Glancing down at lap or sideways at desk for $>3\text{ seconds}$ generates a `LOOKING_AWAY` event.

---

### 3.5. Prohibited Object Detection
- **Purpose**: Detect smartphones, unauthorized laptops, and physical books within the camera frame.
- **Inputs**: Sampled video frame snapshots transmitted to backend YOLOv8n inference pipeline (or WebAssembly ONNX runtime in browser).
- **Processing**:
  1. Preprocess frame: resize to $640 \times 640$, normalize pixels to $[0, 1]$.
  2. Run inference: extract bounding boxes, class labels, and confidence scores.
  3. Filter target classes:
     - `cell phone` (Class ID 67)
     - `laptop` (Class ID 63)
     - `book` (Class ID 73)
  4. Check confidence: if $\text{Confidence} \ge 0.65$ across 2 consecutive sampled frames ($1.5\text{s}$ interval), confirm `PROHIBITED_OBJECT`.
- **Outputs**: Confirmed violation `PROHIBITED_OBJECT` (Severity: HIGH, 50 points), stores frame with object bounding box highlighted in red.
- **Acceptance Criteria**: Holding up a smartphone in front of webcam for $\ge 2$ seconds triggers violation and captures screenshot.

---

## 4. Acoustic Proctoring & Speech Analysis

### 4.1. Voice Activity Detection (VAD) & Audio Capture
- **Purpose**: Continuously monitor environmental audio without streaming heavy silence or static background noise.
- **Inputs**: Audio stream from `navigator.mediaDevices.getUserMedia({ audio: true })`.
- **Processing**:
  1. Pass audio through `AudioContext` with `ScriptProcessorNode` / `AudioWorklet`.
  2. Calculate Root Mean Square (RMS) energy per 100ms window:
     $$\text{RMS} = \sqrt{\frac{1}{N}\sum_{i=1}^N x_i^2}$$
  3. If $\text{RMS} > \text{Threshold}_{\text{voice}}$ for $> 500\text{ms}$, activate voice chunk buffer.
  4. Record 4-second audio slice (16kHz mono WAV format).
- **Outputs**: Encoded audio chunk passed to STT worker.
- **Acceptance Criteria**: Whispers or speech above ambient noise trigger transcription; continuous AC hum or fan noise is ignored.

---

### 4.2. Speech-to-Text & Suspicious Keyword Spotting
- **Purpose**: Determine if the student is reading questions aloud, asking for assistance, or receiving verbal answers.
- **Inputs**: 4-second audio chunk.
- **Processing**:
  1. Transcribe audio using Faster-Whisper (`model="tiny.en"`, beam size 1).
  2. Normalize text: lowercase, remove punctuation.
  3. Match against Suspicious Keyword Registry:
     - Direct questions: `["what is the answer", "question number", "help me", "solve this", "option a", "option b"]`
     - Collaboration queries: `["search for", "google", "look up", "tell me", "repeat"]`
  4. If match score $\ge 1$, emit `SUSPICIOUS_SPEECH` with transcript snippet.
- **Outputs**: Confirmed violation `SUSPICIOUS_SPEECH` (Severity: HIGH, 50 points), saves audio snippet file.
- **Acceptance Criteria**: Speaking "Tell me the answer to question three" is transcribed, flagged, and saved as an audio evidence file.

---

## 5. Violation Engine & Disqualification

### 5.1. Multi-Stage Pipeline Execution
The violation engine adheres to an 8-stage verification pipeline:

```
[1. Raw AI Detection] (e.g. MediaPipe detects Yaw = 35 deg)
         |
         v
[2. Confidence Filtering] (Confidence score >= 0.70 required)
         |
         v
[3. Temporal Persistence] (Duration >= 2.5s sustained in time window)
         |
         v
[4. Rule Evaluation] (Check active cooldowns and strike history)
         |
         v
[5. Violation Classification] (Map to severity: LOW / MED / HIGH / CRITICAL)
         |
         v
[6. Evidence Capture] (Capture watermarked screenshot and/or audio clip)
         |
         v
[7. Warning Escalation] (Calculate cumulative strike points; issue Warning 1 / 2)
         |
         v
[8. Auto-Disqualification] (If Points >= 100 or Warnings >= 3, finalize attempt)
```

### 5.2. Strike & Disqualification State Machine

| State | Entry Condition | System Action | Next State |
| :--- | :--- | :--- | :--- |
| **COMPLIANT** | Session begins or zero active strikes. | Green monitoring badge. | AT_RISK (on minor strike) |
| **AT_RISK** | Cumulative points $10 - 29$. | Toast notification to student; yellow status in Admin console. | WARNING_1 |
| **WARNING_1** | Cumulative points $30 - 59$. | Pop-up modal: "Warning 1 of 3: Unfair practice detected." Must click 'I Understand' to dismiss. | WARNING_2 |
| **WARNING_2** | Cumulative points $60 - 99$. | Red persistent banner; loud chime; Admin alert triggered. | DISQUALIFIED |
| **DISQUALIFIED** | Cumulative points $\ge 100$ OR Warnings $\ge 3$. | Freeze exam inputs; display disqualification screen; auto-submit; log status. | FINALIZED |

- **Acceptance Criteria**: Accumulating 100 points or receiving 3 consecutive warnings terminates the exam session cleanly without losing already submitted answers.

---

## 6. Evidence Collection & Auditability

### 6.1. Screenshot Capture & Watermarking
- **Inputs**: Current `<video>` element canvas stream.
- **Processing**:
  1. Render video frame to off-screen `<canvas>` at full camera resolution ($1280 \times 720$).
  2. Draw red bounding box around detected anomaly (face, cell phone, etc.).
  3. Stamp immutable watermark banner along top edge:
     `Candidate: {student_id} | Exam: {exam_id} | UTC: {iso_timestamp} | Event: {event_type} | Conf: {conf}`
  4. Compress to JPEG quality 80%.
  5. Compute SHA-256 hash: `hash = sha256(image_bytes)`.
  6. Store file at `/storage/evidence/{exam_id}/{candidate_id}/{evidence_id}.jpg`.
- **Outputs**: Database record in `evidence_records` with path and hash.
- **Acceptance Criteria**: Watermarked screenshot accurately displays anomaly and timestamp; hash matches file contents exactly.

---

### 6.2. Audio Evidence Clipping
- **Inputs**: Web Audio ring buffer of last 4 seconds.
- **Processing**:
  1. Export PCM audio to 16-bit Mono WAV.
  2. Compute SHA-256 hash of WAV file.
  3. Persist to `/storage/evidence/{exam_id}/{candidate_id}/{evidence_id}.wav`.
- **Outputs**: Evidence record linked to the `SUSPICIOUS_SPEECH` violation.

---

## 7. Administrator Real-Time Console & Reporting

### 7.1. Live Cohort Monitoring Grid
- **Purpose**: Give the exam supervisor instant situational awareness across all active candidates.
- **Features**:
  - Live grid cards for every student showing: Candidate Name, Photo, Status Badge (Compliant/Warning/Disqualified), Current Strike Points, and Last Seen Heartbeat.
  - Sorting: Auto-sort candidates with highest strike points to the top left.
  - WebSocket updates: Status badges pulse red when a new violation arrives.
- **Acceptance Criteria**: State change from candidate warning updates on admin dashboard within 1.0 second.

---

### 7.2. Incident Review & Evidence Modal
- **Purpose**: Enable invigilators to inspect and audit flagged violations.
- **Features**:
  - Side-by-side view: Watermarked screenshot with bounding box + Audio player for acoustic evidence + Transcript text.
  - Action buttons: `[Confirm Violation]` | `[Dismiss False Positive]` | `[Manual Disqualification]`.
  - Writing an override note updates `audit_logs` and recalculates candidate trust score.
- **Acceptance Criteria**: Admin can dismiss a false positive; strike points recalculate immediately in the candidate record.

---

### 7.3. Post-Exam Integrity Report Generation
- **Purpose**: Provide permanent documentation for university examination boards.
- **Outputs**:
  - Web view & Printable format (`window.print()` / PDF export).
  - Metrics: Final Exam Score, Integrity Trust Score ($100 - \text{Total Violations Weight}$), Total Warnings Issued, Final Disposition (Passed / Disqualified).
  - Chronological Incident Table: Timestamp, Violation Type, Duration, Severity, Evidence Thumbnail, Status.
