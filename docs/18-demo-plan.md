# 18 — Hackathon Demonstration Plan: Live Presentation Script

This document details the minute-by-minute live presentation script, hardware configuration, controlled scenario triggers, and judge evaluation narrative for an impressive 7-minute hackathon demonstration.

---

## 1. Demo Objectives & High-Impact Narrative

1. **The Hook (First 60s)**: Demonstrate that remote exams without proctoring fail trivially (hold up phone, turn head), but existing lockdown browsers only punish innocent mistakes.
2. **The Solution (Next 4 mins)**: Show an intelligent, respectful, dual-screen system running live:
   - Screen A: Student taking an exam with in-browser AI monitoring.
   - Screen B: Chief Invigilator watching live risk telemetry over WebSockets.
3. **The Proof (Final 2 mins)**: Show that every single action generated watermarked, tamper-proof forensic evidence and produced a complete post-exam integrity audit report.

---

## 2. Hardware & Environment Setup

- **Presenter Setup**:
  - Laptop 1 (or Left Browser Window): Student Examination Portal (`http://localhost:5173`).
  - Laptop 2 / External Monitor (or Right Browser Window): Admin Command Center (`http://localhost:5173/admin/live/ex-demo`).
- **Physical Props**:
  - 1 Smartphone (for prohibited object trigger).
  - 1 Volunteer teammate (to lean in as "second person").
- **Database State**: Pre-seeded with:
  - Admin account: `admin@university.edu` / `AdminPass123!`
  - Student account: `alex@university.edu` / `StudentPass123!` (with pre-enrolled face profile).
  - Exam: "CS101: Data Structures & Algorithms Final".

---

## 3. Minute-by-Minute Live Demo Script (7 Minutes)

### [00:00 - 01:00] Introduction & Pre-Flight System Check
- **Action**: Presenter introduces the problem and logs in as student Alex Chen.
- **On Screen**:
  - Opens Pre-Flight Check page.
  - Live webcam preview initializes instantly; microphone audio bar moves as presenter speaks.
  - Ambient lighting indicator shows "Optimal Lighting".
  - Clicks `[Proceed to Verification]`.
- **Narration**: *"Notice how clean and zero-install this is. There are no kernel drivers or intrusive downloads. The entire vision engine is initialized in-browser using WebAssembly."*

### [01:00 - 02:00] Facial Biometric Verification & Exam Launch
- **Action**:
  - Presenter centers face in the oval frame and clicks `[Verify Identity]`.
  - In $< 1.0\text{s}$, system matches live selfie against reference photo (Similarity: $0.88$).
  - Green checkmark animates; exam instructions unlock.
  - Presenter enters Fullscreen; questions load; countdown timer starts at `45:00`.
- **Narration**: *"Our deep metric verification confirms Alex's identity before questions are ever displayed. Now the active exam session begins."*

### [02:00 - 03:00] Controlled Trigger 1: Head Pose & Eye Gaze Anomaly
- **Action**:
  - Presenter answers Question 1 normally.
  - Presenter turns head $35^\circ$ to the right to simulate reading taped notes on the wall.
  - Holds position for 3 seconds.
- **System Reaction**:
  - HUD webcam indicator turns amber; telemetry event `HEAD_POSE_ANOMALY` emits.
  - On Admin Screen: Alex Chen's status card pulses yellow: `AT_RISK` (10 strike points).
  - Subtle toast appears on Alex's screen: *"Please keep your focus on the exam screen."*
- **Narration**: *"Notice that Alex was NOT immediately disqualified. A momentary glance was permitted, but a sustained 3-second turn incurred a minor 10-point caution."*

### [03:00 - 04:15] Controlled Trigger 2: Prohibited Object & Graduated Warning
- **Action**:
  - Presenter holds a smartphone up in view of the webcam for 2 seconds.
- **System Reaction**:
  - Server-side YOLOv8n identifies `cell phone` (Conf: 0.89).
  - Violation Engine evaluates high severity (+50 points). Cumulative score = 60 points.
  - Warning 1 threshold is crossed!
  - Student Screen: An official **Warning Modal** freezes the exam:
    *"Warning 1 of 3: Prohibited device (cell phone) detected. Acknowledge to continue."*
  - Admin Screen: Loud alert tone; Alex's card turns orange: `WARNING_1 (60 Points)`.
- **Narration**: *"The system immediately captured a watermarked screenshot with a bounding box around the phone, pushed an instant alert to the invigilator, and warned the student."*
- **Action**: Presenter clicks `[I Understand & Agree]` to dismiss modal.

### [04:15 - 05:15] Controlled Trigger 3: Acoustic Intelligence & Keyword Spotting
- **Action**:
  - Presenter reads aloud into the microphone: *"Can you tell me the answer to question number two?"*
- **System Reaction**:
  - Web Audio VAD detects speech; Faster-Whisper transcribes text.
  - Keyword engine flags `"tell me the answer"` and `"question number"`.
  - Severity: HIGH (+50 points). Cumulative score = 110 points ($> 100$ threshold)!
  - Third strike condition met $\rightarrow$ **Automatic Disqualification Triggered!**
  - Student Screen: Red Disqualification Screen appears:
    *"Examination Terminated: Disqualified due to repeated violations. Responses have been archived for administrative review."*
- **Narration**: *"Because the candidate repeatedly violated academic integrity rules across vision, objects, and acoustic channels, the system automatically finalized their attempt."*

### [05:15 - 06:15] Administrator Live Console & Forensic Evidence Review
- **Action**:
  - Presenter switches to the Admin Window.
  - Clicks on Alex Chen's card in the Live Roster.
  - Opens the **Forensic Incident Review Modal**.
- **On Screen**:
  - Reviewer inspects the watermarked screenshot of the smartphone with the red bounding box and exact UTC timestamp.
  - Reviewer clicks `[Play Audio]` to hear the 4-second clip of the spoken question, synchronized with the text transcript.
  - Reviewer verifies the cryptographic SHA-256 integrity checksum.
- **Narration**: *"This is what makes the system indisputable. Administrators are not given a black-box percentage; they are given hard, timestamped visual and acoustic evidence."*

### [06:15 - 07:00] Post-Exam Integrity Report & Wrap-Up
- **Action**:
  - Admin clicks `[Generate Integrity Audit Report]`.
  - System renders the full audit report: Candidate Score (40%), Integrity Trust Score (0%), Chronological Violation Timeline, and Evidence Manifest.
  - Presenter summarizes the technical achievements:
    1. Edge-server hybrid architecture.
    2. Real-time multi-modal AI (FaceMesh + YOLOv8 + Whisper).
    3. Multi-stage violation filtering preventing false positives.
- **Call to Action**: Q&A with Hackathon Judges.
