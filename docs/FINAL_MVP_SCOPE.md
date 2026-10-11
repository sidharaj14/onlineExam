# Final Hackathon MVP Scope & Strategy

## Strategic Philosophy
For a high-stakes hackathon or institutional jury evaluation, **a rock-solid, demonstrable, and regression-free workflow is vastly superior to fragile, half-working advanced features**. 

Judges reward systems that execute flawlessly in front of their eyes:
1. Candidate logs in & verifies identity.
2. Biometric calibration locks candidate in place.
3. Exam starts with zero false alarms from ambient lights.
4. Candidate answers questions while AI continuously monitors.
5. Incurring controlled violations (secondary face, phone, tab switch) produces real photographic evidence, progressive audio/visual warnings, and auto-disqualification upon 3 strikes.
6. Invigilator dashboard displays real-time candidate roster, violation tallies, and photographic proof.
7. Final proctoring audit scorecard renders with verified integrity verdicts.

Attempting to force heavy PyTorch models, multi-speaker diarization, or complex iris gaze tracking on the live judging laptop introduces severe CPU bottlenecks, browser crashes, and catastrophic demo failures.

---

## 1. Hackathon MVP In-Scope Features (Demonstrated Live)

| Category | MVP Capability | Implementation Architecture | Demo Proof Point |
| :--- | :--- | :--- | :--- |
| **Authentication** | Student Registration & Real OTP | FastAPI + Python `smtplib` + Gmail App Password + bcrypt + JWT | Real 6-digit OTP delivered to candidate Gmail inbox. |
| **Identity Verification** | Pre-Exam Biometric Calibration | BlazeFace + Spatial Coordinate Baseline | 3-second face alignment oval, reference snapshot saved. |
| **Multi-Face Detection** | 2nd Person in Desk Radar | BlazeFace + Chromium FaceDetector + $YC_bC_r$ Skin Locus | A second person entering frame triggers Strike 1 warning. |
| **Bulb / Glare Immunity** | Ambient Light Filter | Direct-photon radiation filter + skin chrominance test | Room bulbs and lamps do NOT trigger false 2nd face strikes. |
| **Device Detection** | Mobile Phone Detection | Edge gradient analysis in Ear Zone and Chest/Screen Zone | Raising a smartphone to ear or chest triggers Device Strike. |
| **Lockdown** | Tab Switching Detection | HTML5 Page Visibility API + Fullscreen change listener | Switching browser tabs triggers Tab Switch strike immediately. |
| **Violation Engine** | 3-Strike Escalation Policy | Progressive strikes, audible Web Audio buzzer, auto-termination | 3 strikes lock the exam and auto-submit candidate for disqualification. |
| **Evidence Collection** | Photographic Snapshot Trail | Automated canvas capture $\rightarrow$ base64 JPEG $\rightarrow$ SQLite DB | Every strike captures a high-resolution snapshot with timestamp. |
| **Exam Engine** | MCQ Answering & Auto-Scoring | React state + real-time answer autosave + SQLite auto-grading | Instant scoring, percentage, passing criteria, and breakdown. |
| **Student Analytics** | Executive Performance Dashboard | React Tailwind UI + FastAPI aggregation | KPI cards, score trajectories, subject competency, audit table. |
| **Invigilator Console** | Live Candidate & Violation Roster | Admin console hooked to backend attempts API | Real-time candidate status, violation count badges, evidence view. |
| **Forensic Report** | Proctoring Audit Scorecard | Forensic report with violation thumbnails and answer review | Complete post-exam audit trail with photographic proof. |

---

## 2. Advanced Features Designated as Future Roadmap (Post-Hackathon)

The following advanced capabilities should be presented on architectural slides as **Milestone 2 (M2) Roadmap Enhancements**:

1. **Acoustic Diarization & Whisper STT**:
   - *Current Status*: Documented in technical specifications.
   - *Roadmap*: Server-side GPU worker pool transcribing 4-second audio chunks via Faster-Whisper `tiny.en` and clustering vocal embeddings via PyAnnote to distinguish candidate from background voices.
2. **3D Head Pose & Iris Gaze Vector Tracking**:
   - *Current Status*: Centroid 2D viewport bounding is active.
   - *Roadmap*: 468-point MediaPipe Face Mesh calculating pitch, yaw, and roll angles, combined with iris offset vectors to detect glancing at notes or secondary monitors.
3. **Multi-Class Prohibited Object Classification**:
   - *Current Status*: Mobile phones and erratic hand waving are detected.
   - *Roadmap*: Client-side YOLOv8-Nano / COCO-SSD ONNX model classifying calculators, smartwatches, and wireless earbuds.
4. **OS-Level Safe Exam Browser Integration**:
   - *Current Status*: Browser Page Visibility API and Fullscreen monitoring.
   - *Roadmap*: Electron desktop client packaging with locked window manager, disabling system hotkeys (Alt+Tab, Cmd+Space), and killing background virtual machines.

---

## 3. Defense Strategy for Judges
When asked by judges about features in the roadmap:
> *"In our architecture, proctoring is tiered into client-side edge monitoring and server-side forensic verification. For the live demonstration, we prioritized sub-second latency and zero-false-positive stability on edge computer vision: multi-face detection, ambient lighting immunity, smartphone detection, and browser lockdown. Advanced acoustic transcription and 3D gaze estimation are designed as asynchronous backend microservices, which we have architected in our engineering specifications."*
