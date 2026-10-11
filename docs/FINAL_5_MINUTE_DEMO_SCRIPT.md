# 5-Minute Hackathon Final Presentation & Demo Script

**Project**: AI-Powered Secure Online Examination & Proctoring System  
**Presentation Target Time**: 5 Minutes Total  
**Audience**: Technical Judges, Hackathon Evaluators, Invigilation Faculty  

---

## Demo Timeline & Click Path Overview

```text
 0:00 ─── 0:30  │ Problem & System Overview (Slide / Intro)
 0:30 ─── 1:00  │ Role-Based Auth & Student Portal
 1:00 ─── 1:30  │ Examination Launch & Camera Stream Initialization
 1:30 ─── 2:15  │ Live AI Proctoring (Face Presence & HUD)
 2:15 ─── 2:45  │ Real-Time Mobile Phone Detection (YOLOv4-tiny)
 2:45 ─── 3:15  │ Browser Tab-Switch Detection (Page Visibility API)
 3:15 ─── 3:45  │ 3-Strike Disqualification & Evidence Capture
 3:45 ─── 4:15  │ Candidate Result Scorecard & Breakdown
 4:15 ─── 5:00  │ Invigilator Audit Console & Conclusion
```

---

## Detailed Minute-by-Minute Script

### 🕒 Section 1: Problem Statement & Solution Intro (0:00 – 0:30)

- **What to Display**: Title Slide or Application Login Screen (`http://localhost:5173/login`).
- **Presenter Voiceover**:
  > "Respected Judges and Faculty, traditional online exams face two massive flaws: widespread remote cheating using mobile devices and laggy, easily bypassed browser security.
  > Today, we present the **AI-Powered Secure Online Examination & Proctoring System** — a production-ready, full-stack platform combining real-time OpenCV computer vision, YOLOv4-tiny deep learning object detection, and zero-latency browser visibility enforcement to eliminate exam malpractice while preserving candidate privacy."
- **Technical Feature Highlighted**: Full-stack architecture integration (FastAPI + OpenCV + Darknet YOLO + React).

---

### 🕒 Section 2: Student Login & Role Isolation (0:30 – 1:00)

- **What to Click**:
  1. Select **Student Role** on the login page.
  2. Enter student email (`student@example.com`) and password (`student123`).
  3. Click **Sign In**.
- **What Audience Sees**: Smooth transition directly to the **Student Dashboard**, showing enrolled courses, exam history, average score (e.g. `85%`), and integrity score (`100%`).
- **Presenter Voiceover**:
  > "Notice how our role-based authentication instantly routes students exclusively to their personalized portal. Students can never access faculty invigilation controls. Here, candidates can view available exams, historical performance analytics, and overall academic integrity scores."
- **Technical Feature Highlighted**: JWT authentication, BCrypt hashing, and strict Role-Based Access Control (RBAC).
- **Backup Plan**: If network lags, use pre-seeded demo login button.

---

### 🕒 Section 3: Exam Launch & AI Camera Setup (1:00 – 1:30)

- **What to Click**:
  1. Click **Start Exam** on "Advanced Computer Science Midterm".
  2. Read instructions, check integrity agreement checkbox, click **Proceed to Examination**.
- **What Audience Sees**: The high-security examination interface loads. The top bar displays candidate name, exam timer countdown (`60:00`), and live warning counter (`Warnings: 0 / 3`). The webcam feed activates with a green badge: `"AI Proctoring Active"`.
- **Presenter Voiceover**:
  > "Upon entering the exam, candidate authorization and camera feed stream automatically initialize. The candidate sees a distraction-free interface with question navigation, timer countdown, and an active AI monitoring indicator."
- **Technical Feature Highlighted**: Async WebRTC stream binding, offscreen canvas sampling (320x240 @ 500ms).

---

### 🕒 Section 4: Live Computer Vision & Face Verification (1:30 – 2:15)

- **What to Click**: Click options on Question 1 and Question 2.
- **What Audience Sees**: Answers update instantly with save status (`"Saved"`). Camera HUD displays `"Candidate Centered | Face Verified"`.
- **Presenter Voiceover**:
  > "As the student answers questions, responses are autosaved to the backend database. Concurrently, every 500 milliseconds, frame snapshots are processed by our backend OpenCV engine to continuously verify face presence, lighting contrast, and single-candidate attendance."
- **Technical Feature Highlighted**: Async frame sampling, Haar Cascade face detection, histogram equalization.

---

### 🕒 Section 5: Real-World Mobile Phone Detection (2:15 – 2:45)

- **What to Click / Demonstrate**:
  1. Hold a real smartphone up to the webcam in view of the camera.
  2. Keep phone visible for 1.5 seconds.
- **What Audience Sees**:
  - The HUD immediately updates with a red flashing alert.
  - Audible alert buzzer sounds (`playWarningBuzzer`).
  - Warning modal pops up: **`STRIKE 1: MOBILE PHONE / DEVICE IN RADAR`**.
  - Warning counter increments to `Warnings: 1 / 3`.
- **Presenter Voiceover**:
  > "Now watch what happens if a candidate attempts to use a smartphone. Our backend OpenCV engine passes the frame blob to a Darknet YOLOv4-tiny neural network trained on COCO Class 67 (cell phone). Within 1.5 seconds of temporal persistence, the system detects the device, triggers an audible warning, records a high-resolution evidence snapshot, and issues Strike 1."
- **Technical Feature Highlighted**: YOLOv4-tiny object detection, COCO class mapping (Class 67), Non-Maximum Suppression (NMS), temporal persistence.
- **Backup Plan**: If phone is angled poorly, align phone vertically 30cm from camera lens.

---

### 🕒 Section 6: Immediate Tab-Switch Detection (2:45 – 3:15)

- **What to Click / Demonstrate**:
  1. Click **Acknowledge Warning** to clear Strike 1 modal.
  2. Open a new browser tab (or press `Cmd+T` / `Ctrl+T` or switch to another window).
  3. Immediately switch back to the exam tab.
- **What Audience Sees**:
  - The instant the exam tab is hidden, the browser Page Visibility API fires.
  - Upon return, Strike 2 modal is already displayed: **`STRIKE 2: TAB SWITCH DETECTED`**.
  - Warning counter updates to `Warnings: 2 / 3 (FINAL)`.
- **Presenter Voiceover**:
  > "Next, let's test browser security. If a candidate attempts to switch browser tabs to search for answers, our Page Visibility API event listener detects `document.visibilityState === 'hidden'` in under 50 milliseconds. Unlike laggy polling solutions, our system immediately posts a TAB_SWITCH violation to the backend database, issuing Strike 2."
- **Technical Feature Highlighted**: HTML5 Page Visibility API, instant frontend event listener, `lastTabSwitchTimeRef` duplicate prevention.

---

### 🕒 Section 7: Strike 3 Disqualification & Result Scorecard (3:15 – 4:15)

- **What to Click / Demonstrate**:
  1. Acknowledge Strike 2.
  2. Switch tabs once more to trigger Strike 3.
- **What Audience Sees**:
  - Strike 3 is triggered: **`EXAMINATION TERMINATED (3 OF 3 STRIKES)`**.
  - Exam interface locks down; webcam turns off.
  - Auto-redirects after 3.5 seconds to the **Exam Result Scorecard**.
  - Scorecard shows `Status: DISQUALIFIED`, Final Score, Time Spent, detailed Question Breakdown, and exact timeline of all 3 recorded infractions with evidence snapshots.
- **Presenter Voiceover**:
  > "Upon receiving the 3rd strike, the system enforces automatic disqualification. The session locks down, camera stream closes, and saved answers up to that moment are finalized. The candidate receives an itemized audit scorecard documenting their score, pass/fail status, and timestamped infraction logs."
- **Technical Feature Highlighted**: 3-strike auto-termination, automatic score grading, integrity score calculation.

---

### 🕒 Section 8: Invigilator Monitoring Console & Conclusion (4:15 – 5:00)

- **What to Click**:
  1. Click **Logout**.
  2. Login as Teacher (`teacher@example.com` / `admin123`).
  3. Open **Invigilator Monitoring Dashboard**.
- **What Audience Sees**: Invigilator dashboard displays the live candidate attempt list. The candidate's attempt is flagged in red as `TERMINATED_VIOLATION` with `Integrity Score: 40%`, 3 Recorded Violations, and clickable evidence audit logs.
- **Presenter Voiceover**:
  > "Finally, logging in as an Invigilator, faculty can audit all candidate submissions across the university in real time. Faculty can inspect violation evidence snapshots, verify AI confidence scores, and ensure complete academic integrity.
  > In conclusion, our system bridges real-world computer vision, instant browser security, and complete database auditability into a unified, production-ready examination engine. Thank you!"
- **Technical Feature Highlighted**: Faculty invigilation analytics, evidence thumbnail verification, complete data persistence audit trail.
