# 02 — Product Requirements Document (PRD): AI-Powered Secure Online Examination & Proctoring System

## 1. Product Vision & Goals

### 1.1. Product Vision
To provide educational institutions and certifying bodies with an intelligent, equitable, and transparent remote proctoring platform that guarantees academic integrity while safeguarding student dignity, minimizing false positives through temporal intelligence, and generating indisputable forensic evidence for institutional audits.

### 1.2. Strategic Goals
1. **Deter & Detect Dishonesty**: Automate the real-time identification of unauthorized physical aids, identity fraud, visual evasion, and acoustic collaboration during online exams.
2. **Minimize Cognitive Invigilator Load**: Reduce human invigilator cognitive load by over 80% via automated algorithmic filtering, anomaly scoring, and prioritization.
3. **Eliminate False Positive Punishments**: Require temporal persistence, multi-frame agreement, and configurable confidence thresholds before escalating any detection into an actionable violation.
4. **Ensure Total Auditability**: Guarantee that every automated warning and disqualification is backed by cryptographically verifiable, timestamped media evidence.
5. **Demonstrable Hackathon Feasibility**: Deliver a fully operational, responsive, zero-setup web application that can be showcased live on standard laptops without cloud GPU dependencies.

---

## 2. User Personas

### Persona 1: The Student / Candidate
- **Name**: Alex Chen
- **Role**: 3rd-year Computer Science Undergraduate
- **Context**: Taking a high-stakes semester final exam remotely from his bedroom.
- **Pain Points**:
  - Paralyzing anxiety that shifting position or sneezing might trigger an automatic failure.
  - Frustrated by cumbersome proprietary lockdown software requiring OS kernel permissions.
  - Wants clear, unobtrusive, immediate feedback if his face is accidentally drifting out of frame before an issue becomes serious.
- **Needs**:
  - Clear pre-flight hardware checks (camera, microphone, lighting).
  - Calm, transparent warning overlays with strike counters.
  - Responsive, distraction-free examination taking environment.

### Persona 2: The Exam Administrator / Invigilator
- **Name**: Dr. Nalini Rao
- **Role**: Head of Department & Chief Examiner
- **Context**: Responsible for overseeing an exam cohort of 120 students concurrently.
- **Pain Points**:
  - Staring at 120 small webcam feeds across multiple screens is mentally exhausting and ineffective.
  - Lacks concrete evidence when students contest accusations of cheating.
  - Needs a centralized command center that automatically surfaces high-risk students and flags critical incidents.
- **Needs**:
  - Live proctoring dashboard sorting candidates by Integrity Risk Score.
  - Instant alert notifications with direct deep-links to captured screenshot and audio evidence.
  - One-click PDF/Web forensic integrity reports detailing student activity logs.

---

## 3. End-to-End User Workflows

### 3.1. Student Workflow

```
[Login Screen]
      |
      v
[System Pre-Flight Check]
  - Camera & Mic Permission Grant
  - Network Speed Check
  - Ambient Lighting & Audio Level Test
      |
      v
[Biometric Identity Verification]
  - Capture Live Selfie
  - Facial Embedding Extracted
  - Compared with Enrolled Profile Image
      |
      v
[Exam Instructions & Code of Conduct]
  - Rules acceptance & Fullscreen trigger
      |
      v
[Live Exam & Active Proctoring Interface]
  - Answer Questions (MCQ / Short Text)
  - Continuous Edge Vision & Audio Monitoring
  - Receive Graduated Warning Modals if Violations Persist
      |
      v
[Exam Submission & Finalization]
  - Confirmation Modal & Auto-save
  - Immediate Session Termination & Camera Release
      |
      v
[Completion Confirmation Screen]
```

### 3.2. Administrator Workflow

```
[Admin Login]
      |
      v
[Exam Management Portal]
  - Create/Schedule Examination
  - Upload Question Bank & Scoring Rules
  - Configure Proctoring Sensitivity & Thresholds
      |
      v
[Live Invigilation Command Center]
  - Cohort Overview: Active, Disqualified, Warning States
  - Real-time Alert Feed (WebSocket push)
  - Click on Candidate: Inspect Live Stream Snapshot & Telemetry
      |
      v
[Forensic Incident Review Console]
  - Inspect Flagged Violations
  - Review Timestamped Watermarked Screenshots & Audio Clips
  - Confirm / Dismiss Violations
      |
      v
[Post-Exam Integrity & Audit Reporting]
  - Export Candidate Trust Scores & Chronological Timeline
```

---

## 4. Feature Catalogue: MVP vs. Advanced

| Category | Feature Description | Status | Priority |
| :--- | :--- | :--- | :--- |
| **Auth & Profile** | JWT-based Student and Admin authentication with RBAC | MVP | P0 |
| **Auth & Profile** | Pre-exam biometric face verification against profile image | MVP | P0 |
| **Vision AI** | Continuous face presence and absence tracking | MVP | P0 |
| **Vision AI** | Multiple faces detected in frame simultaneously | MVP | P0 |
| **Vision AI** | 3D Head Pose tracking (Pitch, Yaw, Roll) via Face Mesh | MVP | P0 |
| **Vision AI** | Eye gaze direction and "looking away" tracking | MVP | P0 |
| **Vision AI** | Prohibited object detection (smartphones, laptops, books) | MVP | P0 |
| **Vision AI** | Specialized object detection (calculators, smartwatches, earbuds) | Advanced | P2 |
| **Vision AI** | Periodic background face re-verification (anti-proxy) | Advanced | P1 |
| **Audio AI** | Speech detection via Web Audio API & VAD | MVP | P0 |
| **Audio AI** | Automated Speech-to-Text (STT) transcription | MVP | P1 |
| **Audio AI** | Suspicious keyword matching ("help", "google", "answer") | MVP | P1 |
| **Audio AI** | Multi-speaker acoustic diarization | Advanced | P2 |
| **Proctoring Engine** | Temporal anomaly validation (suppressing transient glitches) | MVP | P0 |
| **Proctoring Engine** | Multi-tiered strike & points escalation model | MVP | P0 |
| **Proctoring Engine** | Real-time warning modal broadcast to candidate | MVP | P0 |
| **Proctoring Engine** | Automated disqualification after repeated strikes | MVP | P0 |
| **Evidence & Audit**| Timestamped screenshot capture with metadata overlay | MVP | P0 |
| **Evidence & Audit**| Synchronized audio clip snippet extraction (3s - 5s) | MVP | P1 |
| **Evidence & Audit**| SHA-256 cryptographic media hashing for non-repudiation | MVP | P1 |
| **Exam Engine** | Question delivery, option shuffling, timer, auto-saving | MVP | P0 |
| **Exam Engine** | Fullscreen enforcement & browser tab switch detection | MVP | P0 |
| **Admin Console** | Real-time WebSocket-powered cohort grid | MVP | P0 |
| **Admin Console** | Individual candidate telemetry inspector | MVP | P0 |
| **Admin Console** | Incident review console with media viewer | MVP | P0 |
| **Reporting** | Comprehensive PDF/Web integrity scorecard & event timeline | MVP | P0 |

---

## 5. Functional Requirements (FR)

### 5.1. Authentication & Identity (`FR-AUTH`)
- **FR-AUTH-001**: The system shall provide secure JWT authentication for Students and Administrators with role-based access control.
- **FR-AUTH-002**: The system shall allow an initial student onboarding step where a clean reference face photo is uploaded or captured to generate an identity embedding.
- **FR-AUTH-003**: The system shall execute pre-exam facial verification comparing a live selfie against the reference embedding using cosine distance; entry shall be rejected if cosine similarity is $< 0.75$.
- **FR-AUTH-004**: The system shall execute a pre-flight system check verifying camera feed, microphone input volume, and browser fullscreen capabilities.

### 5.2. Examination Management & Delivery (`FR-EXAM`)
- **FR-EXAM-001**: Administrators shall be able to create, edit, schedule, and configure exams, setting title, duration (minutes), passing score, and proctoring threshold parameters.
- **FR-EXAM-002**: Administrators shall be able to author questions (Multiple Choice Questions with 4 options and single correct answer) and organize them into exams.
- **FR-EXAM-003**: The student exam interface shall display the current question, response options, a question navigation palette, and an unalterable countdown timer synchronized with the backend.
- **FR-EXAM-004**: The exam interface shall automatically persist student answers upon selection to prevent data loss on network refresh.
- **FR-EXAM-005**: The exam interface shall enforce fullscreen mode; leaving fullscreen or switching browser tabs shall trigger an immediate `TAB_SWITCH_OR_BLUR` violation.
- **FR-EXAM-006**: The system shall automatically submit the examination when the countdown timer reaches zero, finalizing the attempt.

### 5.3. Real-Time AI Proctoring (`FR-PROCTOR`)
- **FR-PROCTOR-001**: The client-side vision pipeline shall analyze the camera stream at a minimum of 15 FPS using MediaPipe Face Mesh.
- **FR-PROCTOR-002**: The system shall emit a `FACE_ABSENT` signal if no facial landmarks are detected within the video frame for longer than 2.0 consecutive seconds.
- **FR-PROCTOR-003**: The system shall emit a `MULTIPLE_FACES` signal if two or more distinct facial landmark bounding boxes are detected within the frame for longer than 1.0 second.
- **FR-PROCTOR-004**: The system shall compute 3D Head Pose (Pitch, Yaw, Roll) from 2D-3D landmark correspondences; if $|Yaw| > 28^\circ$ or $|Pitch| > 22^\circ$ for longer than 2.5 consecutive seconds, a `HEAD_POSE_ANOMALY` signal shall be emitted.
- **FR-PROCTOR-005**: The system shall calculate relative iris-to-eye-corner gaze vectors; if gaze deviates from center screen boundaries for $> 3.0$ consecutive seconds, a `LOOKING_AWAY` signal shall be emitted.
- **FR-PROCTOR-006**: The system shall sample video frames and run object detection using YOLOv8n; detection of prohibited classes (`cell phone`, `laptop`, `book`) with confidence $> 0.65$ persisting for $> 1.5$ seconds shall emit a `PROHIBITED_OBJECT` signal.
- **FR-PROCTOR-007**: The client audio pipeline shall capture audio via the Web Audio API, compute RMS energy, and trigger Voice Activity Detection (VAD).
- **FR-PROCTOR-008**: Audio chunks with detected speech shall be transcribed via Faster-Whisper and parsed for registered suspicious keywords, emitting a `SUSPICIOUS_SPEECH` signal upon match.

### 5.4. Violation Engine & Disqualification (`FR-VIOLATION`)
- **FR-VIOLATION-001**: The violation engine shall process raw AI detection signals through a temporal filter requiring sustained anomalies before classification.
- **FR-VIOLATION-002**: Confirmed violations shall be mapped to severity tiers (LOW, MEDIUM, HIGH, CRITICAL) and allocated weighted strike points (10, 25, 50, 100).
- **FR-VIOLATION-003**: An enforcement cooldown period (e.g., 8 seconds) shall be applied after a confirmed violation to avoid spamming multiple identical violations for a single prolonged movement.
- **FR-VIOLATION-004**: When accumulated violation points cross warning thresholds (e.g., 30 points for Warning 1, 60 points for Warning 2), the system shall display a modal warning overlay on the student's screen requiring acknowledgment.
- **FR-VIOLATION-005**: The system shall automatically disqualify the candidate if accumulated points reach 100 OR if 3 active warnings are issued; disqualification immediately locks the exam and submits current progress.

### 5.5. Evidence Capture & Auditability (`FR-EVIDENCE`)
- **FR-EVIDENCE-001**: Every confirmed violation shall trigger the automatic capture of a high-resolution camera screenshot with a visual bounding box overlay.
- **FR-EVIDENCE-002**: Every acoustic violation shall trigger the storage of a 4-second audio snippet (WAV/WebM) surrounding the anomalous vocalization.
- **FR-EVIDENCE-003**: Evidence assets shall be permanently watermarked with candidate ID, exam ID, and UTC ISO 8601 timestamp.
- **FR-EVIDENCE-004**: The system shall calculate a SHA-256 cryptographic checksum of each evidence file upon creation and store it in the database to guarantee immutability.
- **FR-EVIDENCE-005**: An unalterable append-only `AuditLog` shall record all system actions, warnings, acknowledgments, and state transitions.

### 5.6. Administrator Console & Monitoring (`FR-ADMIN`)
- **FR-ADMIN-001**: The administrator dashboard shall display a live roster of all students in an active examination session with real-time status indicators (Compliant, Warning, Escalated, Disqualified).
- **FR-ADMIN-002**: The admin console shall receive real-time violation alerts via WebSocket within 1.0 second of rule engine evaluation.
- **FR-ADMIN-003**: The admin shall be able to click on any candidate to inspect their live telemetry stream, current strike points, and historical violation log.
- **FR-ADMIN-004**: The admin shall have access to an Incident Review modal to inspect watermarked screenshots and play back audio evidence.
- **FR-ADMIN-005**: The admin shall possess the authority to manually override an automated disqualification or issue an administrative disqualification with written justification.

### 5.7. Reporting & Analytics (`FR-REPORT`)
- **FR-REPORT-001**: Upon completion of an exam attempt, the system shall generate an automated Proctoring Integrity Report.
- **FR-REPORT-002**: The report shall compute an overall **Integrity Trust Score** (0% to 100%) based on cumulative violation points and adherence duration.
- **FR-REPORT-003**: The report shall present a chronological event timeline detailing every incident, confidence score, duration, and corresponding evidence links.
- **FR-REPORT-004**: The administrator shall be able to export the comprehensive report as a printable/PDF-compatible document.

---

## 6. Non-Functional Requirements (NFR)

### 6.1. Performance & Latency (`NFR-PERF`)
- **NFR-PERF-001**: In-browser face landmark and head pose tracking shall maintain $\ge 15\text{ FPS}$ on standard quad-core consumer laptops with $\le 20\%$ CPU utilization.
- **NFR-PERF-002**: Client-to-server telemetry transmission shall have an average payload size of $< 2\text{ KB}$ per message and round-trip latency $< 250\text{ ms}$.
- **NFR-PERF-003**: Server-side object detection (YOLOv8n) on sampled frames shall execute in $\le 120\text{ ms}$ on CPU.
- **NFR-PERF-004**: Real-time alert push to the administrator dashboard shall complete within $1.0\text{ second}$ of violation confirmation.

### 6.2. Security & Data Protection (`NFR-SEC`)
- **NFR-SEC-001**: All communication channels (HTTPS and WSS) shall use TLS 1.3 encryption in transit.
- **NFR-SEC-002**: Passwords shall be salted and hashed using `bcrypt` (work factor $\ge 12$).
- **NFR-SEC-003**: Evidence media files shall be accessible only via authenticated endpoints with strict role-based authorization; direct unauthenticated public bucket/directory access is prohibited.
- **NFR-SEC-004**: Biometric embeddings shall be stored as mathematical vectors; raw baseline identity photographs shall be encrypted at rest.

### 6.3. Reliability & Resilience (`NFR-RELIAB`)
- **NFR-RELIAB-001**: If client internet drops for $< 60\text{ seconds}$, the exam interface shall buffer responses and proctoring telemetry locally in `IndexedDB`/memory and automatically flush upon reconnection.
- **NFR-RELIAB-002**: Unhandled exceptions in the client-side AI detection loop shall not crash or freeze the exam question presentation UI.
- **NFR-RELIAB-003**: The backend shall persist database transactions atomically to avoid orphaned violation records without corresponding evidence IDs.

### 6.4. Usability & Accessibility (`NFR-A11Y`)
- **NFR-A11Y-001**: The student interface shall comply with WCAG 2.1 Level AA standards for color contrast, typography, and keyboard navigation.
- **NFR-A11Y-002**: Proctoring status indicators shall be non-intrusive (e.g., small status pill: "Monitoring Active") to prevent undue exam stress.
- **NFR-A11Y-003**: Warning notifications shall offer clear visual alerts and distinct audible chimes (with opt-out for hearing-impaired accessibility).
