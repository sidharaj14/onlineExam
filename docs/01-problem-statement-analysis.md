# 01 — Problem Statement Analysis: AI-Powered Secure Online Examination & Proctoring System

## 1. Executive Summary & Problem Overview

Higher education institutions, certification bodies, and competitive testing agencies have increasingly migrated toward online examination formats to expand geographic accessibility and optimize administrative logistics. However, conducting examinations remotely fundamentally compromises the traditional physical invigilation model. In unproctored or weakly monitored remote environments, academic dishonesty proliferates via multiple attack vectors: unauthorized physical aids (smartphones, calculators, notes), proxy test-takers, external human assistance, and out-of-frame collaboration.

Traditional remote exam platforms rely on either:
1. **Passive Screen Recording / Lockdown Browsers**: Easily bypassed via secondary physical devices (such as a smartphone resting just below the screen or off-camera display mirroring).
2. **Synchronous Human Invigilation (1:N Zoom/WebRTC monitoring)**: Prohibitively expensive, prone to human cognitive fatigue, unable to maintain continuous vigilance across dozens of video tiles simultaneously, and susceptible to subjective, inconsistent enforcement.

This project addresses this critical trust gap by designing and architecting an **AI-Powered Secure Online Examination & Proctoring System**. The system introduces an automated, continuous, multimodal invigilation pipeline that runs concurrently with exam delivery. It ingests continuous visual and acoustic signals, detects suspicious anomalies, validates them against temporal and contextual persistence heuristics, logs cryptographic evidence, escalates graduated warnings to candidates, and delivers an auditable dashboard and post-examination forensic report for institutional administrators.

---

## 2. Current Challenges in Remote Examination

| Challenge Domain | Real-World Attack Vector / Weakness | Failure of Existing Solutions |
| :--- | :--- | :--- |
| **Identity Fraud** | Candidate authenticates at login, then swaps seats with an expert surrogate test-taker. | Lockdown browsers only verify at login; periodic manual photo checks are easily skipped or delayed. |
| **Secondary Device Usage** | Smartphones, smartwatches, or programmable calculators positioned outside the web browser viewport. | Browser locks restrict Alt-Tab and OS shortcuts but cannot detect physical external hardware in the room. |
| **Unauthorized Collaboration** | A collaborator sits out of frame whisper-prompting answers or signaling from behind the webcam. | Single-frame image snapshots miss subtle whisper audio and fleeting second persons entering the frame. |
| **Gaze / Visual Evasion** | Candidate constantly reads cheat sheets taped adjacent to or behind the laptop monitor. | Simple presence detectors treat any detected face as compliant, failing to track eye-gaze vectors and head pose angles. |
| **False Positive Fatigue** | Innocent movements (scratching nose, momentary cough, shifting posture) trigger immediate disqualifications. | Rigid rule systems punish students without temporal validation, causing immense student anxiety and high dispute volumes. |
| **Auditability & Disputability** | Accused students dispute decisions without verifiable forensic timestamps or media proof. | Systems log abstract "cheating detected" flags without synchronized frame capture, cryptographic hashes, or exact audio snippets. |

---

## 3. Target Users & Stakeholders

```
+-------------------------------------------------------------------------------+
|                               INSTITUTION                                     |
+-------------------------------------------------------------------------------+
       |                                                               |
       v                                                               v
+----------------------+                                     +--------------------+
|  Student / Candidate |                                     | Exam Administrator |
| - Alex (Undergrad)   |                                     | - Dr. Rao (Dean)   |
| - Authenticates      |                                     | - Schedules Exams  |
| - Takes Exam         |                                     | - Live Monitoring  |
| - Receives Warnings  |                                     | - Reviews Evidence |
+----------------------+                                     +--------------------+
       |                                                               |
       +-------------------------------+-------------------------------+
                                       |
                                       v
                        +------------------------------+
                        | Academic Integrity Board /   |
                        | Institutional Auditor        |
                        | - Audits flagged violations  |
                        | - Inspects forensic evidence |
                        +------------------------------+
```

1. **Student / Candidate (Test-Taker)**:
   - Needs a seamless, transparent onboarding and pre-flight system check.
   - Demands fair, deterministic, non-arbitrary proctoring that gives clear feedback/warnings if their face is temporarily obscured or out of frame.
   - Must be protected against wrongful disqualification caused by momentary hardware glitches or transient background movements.

2. **Exam Administrator / Chief Invigilator**:
   - Creates, schedules, and configures exams (duration, question banks, prohibited objects, violation thresholds).
   - Monitors live cohorts through a high-level status grid highlighting at-risk or escalated candidates.
   - Inspects auto-generated incident reports with timeline markers, visual bounding boxes, and audio transcripts.

3. **Academic Integrity Reviewer / Auditor**:
   - Reviews contested disqualifications using tamper-evident, timestamped screenshot and audio evidence.
   - Requires transparent confidence scores, persistent duration logs, and clear algorithmic rationales rather than black-box verdicts.

---

## 4. Requirements Breakdown

### 4.1. Explicit Requirements
- **FR-01**: Student authentication and initial facial identity verification matching an enrolled profile.
- **FR-02**: Continuous student face detection and presence monitoring throughout the exam lifecycle.
- **FR-03**: Absence detection triggering alerts when the candidate leaves the frame.
- **FR-04**: Multiple-face detection identifying unauthorized individuals within camera view.
- **FR-05**: Continuous 3D head pose tracking (Pitch, Yaw, Roll) to spot abnormal persistent turning.
- **FR-06**: Eye-gaze tracking to identify continuous glances away from the screen.
- **FR-07**: Prohibited-object detection (mobile phones, calculators, headphones, smartwatches, notes).
- **FR-08**: Additional-person detection (differentiating between background furniture/posters and actual human bodies).
- **FR-09**: Continuous acoustic analysis with Speech-to-Text (STT) transcription.
- **FR-10**: Suspicious speech/keyword analysis (e.g., "help me", "question number", "search for", "option B").
- **FR-11**: Multiple-speaker and conversational detection distinguishing solitary verbalization from interactive dialogue.
- **FR-12**: Background conversation detection filtering ambient static noise from human vocal chatter.
- **FR-13**: Automated graduated warning modal generation to alert the student in real time.
- **FR-14**: Configurable strike and score system leading to automated candidate disqualification upon repeated violations.
- **FR-15**: Timestamped screenshot and audio clip evidence capture tied to confirmed violation records.
- **FR-16**: Complete examination management (CRUD for exams, question authoring, scheduling, attempt tracking).
- **FR-17**: Secure exam submission with automated state finalization.
- **FR-18**: Administrator dashboard featuring real-time candidate status and violation telemetry.
- **FR-19**: Incident review console with media playback, bounding box overlays, and reviewer confirmation.
- **FR-20**: Comprehensive post-examination integrity reports summarizing trust scores and violation timelines.

### 4.2. Implicit Requirements
- **Fault-Tolerant Network Resilience**: Brief network disconnections must not erase local exam state or crash proctoring sessions; unsent telemetry should buffer and sync on reconnect.
- **Zero-Latency In-Exam Experience**: Real-time AI computation must not cause keyboard lag or exam interface freezing on standard consumer laptops.
- **Data Minimization & Privacy Protection**: Audio and video should not be permanently stored in raw 1080p full-duration format; only targeted, evidence-relevant snapshots and snippets associated with confirmed violations should be archived.
- **Tamper Resistance**: Client-side tampering (e.g., disabling the webcam stream via DevTools, manipulating JavaScript variables) must be caught by server-side heartbeat verification and liveness checks.
- **Graceful Hardware Degradation**: Clear user feedback during onboarding if camera resolution, microphone input, or browser compatibility falls below minimum operating thresholds.

---

## 5. Constraints & Assumptions

### 5.1. Technical & Environmental Constraints
1. **Client Hardware Heterogeneity**: Test-takers utilize diverse commodity hardware (integrated 720p webcams, built-in laptop microphones, varying ambient lighting).
2. **Compute Envelope**: Heavy deep learning models cannot be executed entirely client-side without overheating student laptops or inducing frame drops; similarly, streaming raw 30 FPS video from 100 students to a centralized hackathon server would saturate bandwidth and exhaust GPU compute.
3. **Network Constraints**: Typical student upstream bandwidth varies from 1 Mbps to 50 Mbps; the architecture must transmit structured telemetry JSON rather than continuous raw video feeds.
4. **Browser Sandbox**: Browser security prohibits raw OS kernel-level inspection; lockdown capabilities are limited to standard Web APIs (Fullscreen API, Page Visibility API, Blur/Focus events).

### 5.2. Core Working Assumptions
1. Candidates possess a standard web browser (Google Chrome or Chromium-based preferred) supporting `MediaDevices.getUserMedia`, WebSockets, and WebGL/WebAssembly.
2. The student's face is initially registered into the institutional database via an identity photo or pre-exam selfie.
3. The testing environment has reasonable ambient illumination allowing facial landmarks to be resolved.
4. An institutional administrator is available asynchronously to review flagged edge-case disqualifications.

---

## 6. Expected Outcomes & Success Criteria

### 6.1. Functional Success Criteria
- [x] Initial face verification matches registered profile with $\ge 90\%$ accuracy under normal indoor lighting.
- [x] Continuous face presence, head pose, and gaze tracking updates at $\ge 15\text{ FPS}$ on the client without UI stutter.
- [x] Prohibited objects (smartphones, headphones) detected within 2.0 seconds of entering frame with $>0.70$ model confidence.
- [x] Suspicious vocalizations transcribed and evaluated against keyword registries within 3.0 seconds of utterance.
- [x] Violation engine successfully suppresses transient anomalies ($<1.5\text{s}$) while escalating sustained offenses.
- [x] Admin dashboard receives live alerts within 1.0 second of violation confirmation over WebSocket.
- [x] End-to-end exam flow operates reliably: Login $\rightarrow$ Verification $\rightarrow$ Test Taking $\rightarrow$ Proctoring $\rightarrow$ Submission $\rightarrow$ Report Generation.

### 6.2. Hackathon Evaluation Alignment
- **Technical Innovation & Depth**: Implementation of a hybrid edge-server architecture combining in-browser MediaPipe Face Mesh with server-side YOLOv8 object detection and Whisper acoustic processing.
- **Completeness & Realism**: Fully realized dual interfaces (Student Exam Portal + Admin Invigilator Console) backed by a relational database, REST APIs, and WebSockets.
- **Product Design & Usability**: Clean, distraction-free student exam interface with subtle proctoring status; high-density, professional command center for administrators.
- **Architectural Soundness**: A multi-stage violation pipeline preventing false positives, paired with cryptographic evidence auditing.

---

## 7. Scope Definition: MVP vs. Advanced

```
+--------------------------------------------------------------------------+
|                             SYSTEM SCOPE                                 |
+--------------------------------------------------------------------------+
|  MVP SCOPE (Hackathon Deliverable)                                       |
|  - Student & Admin Authentication (JWT)                                  |
|  - Single Pre-Exam Face Biometric Verification                           |
|  - Client-Side Face Presence & Absence Detection                         |
|  - Client-Side Multi-Face Detection                                      |
|  - Client-Side 3D Head Pose (Pitch/Yaw/Roll) Tracking                    |
|  - Client-Side Eye Gaze Away Detection                                   |
|  - Server-Side Prohibited Object Detection (Phones, Books, Laptops)      |
|  - Server-Side Speech-to-Text & Suspicious Keyword Spotting              |
|  - 8-Stage Violation Scoring & Graduated Warning Engine                  |
|  - Automatic Disqualification at Threshold (e.g. 3 Warnings / 100 Pts)   |
|  - Evidence Capture (Watermarked Screenshots + Timestamped Records)      |
|  - Complete Exam Interface (MCQs, Timer, Navigation, Auto-save)          |
|  - Admin Live Dashboard & Detailed Forensic Report                       |
+--------------------------------------------------------------------------+
|  ADVANCED SCOPE (Post-Hackathon Roadmap)                                 |
|  - Custom YOLO Fine-Tuning for Ultra-Compact Smartwatches & Earbuds      |
|  - Deep Diarization (PyAnnote Voice Biometrics for Multi-Speaker)        |
|  - Continuous Background Identity Verification Embedding Checks          |
|  - Dual-Camera Mobile Mirror Feed (Side-Angle Room Coverage)             |
|  - Hardware-Level OS Lockdown Kiosk Application                          |
|  - Blockchain-Anchored Evidence Timestamps                               |
+--------------------------------------------------------------------------+
|  OUT OF SCOPE (Explicitly Excluded)                                      |
|  - Biometric Keystroke Dynamics Analysis                                 |
|  - EEG or Thermal Stress Detection                                       |
|  - Automated Essay Grading & Semantic Answer Evaluation                  |
+--------------------------------------------------------------------------+
```

---

## 8. Summary of Non-Goals
1. **Not a General Surveillance Suite**: The system does not record continuous 24/7 video or inspect personal filesystem directories.
2. **Not an Infallible Judge**: AI predictions are treated as **probabilistic signals**, never judge-jury-and-executioner. All automated disqualifications generate an unalterable evidence audit package for institutional human review.
3. **Not a Native Desktop Kernel Rootkit**: The project is engineered purely using modern Web standards (WebAssembly, WebGL, WebRTC, Web Audio API), ensuring zero required client software installations.
