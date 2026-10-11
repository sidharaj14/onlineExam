# Final Gap Analysis

## Overview
This document outlines the exact architectural, functional, and user-experience gaps identified during the comprehensive audit of the **AI-Powered Secure Online Examination & Proctoring System**.

---

## P0 — Critical Gaps (Direct Demo & Core Problem Statement Impact)

### GAP-01: Admin / Invigilator Console Missing Live Candidate Attempts & Violation Review [RESOLVED IN AUDIT IMPLEMENTATION]
- **Status**: **RESOLVED & IMPLEMENTED**.
- **Delivered**:
  1. Enhanced `ExamService.get_exam_attempts` in backend to include `violations_count`, `violations`, `percentage`, `exam_title`, `course_code`, and ISO timestamps.
  2. Exposed `GET /api/v1/exams/admin/attempts` and `GET /api/v1/exams/admin/{exam_id}/attempts`.
  3. Added `getExamAttempts` to `frontend/src/services/adminService.ts`.
  4. Redesigned `AdminDashboardPage.tsx` into a live command console displaying all candidate sessions, live status badges, violation strike tallies, candidate search & status filtering, and direct links to forensic violation reports.
- **Files Modified**:
  - [`backend/app/services/exam_service.py`](file:///Users/sidharaj/Desktop/onlineexam/backend/app/services/exam_service.py)
  - [`backend/app/api/v1/endpoints/exams.py`](file:///Users/sidharaj/Desktop/onlineexam/backend/app/api/v1/endpoints/exams.py)
  - [`frontend/src/services/adminService.ts`](file:///Users/sidharaj/Desktop/onlineexam/frontend/src/services/adminService.ts)
  - [`frontend/src/pages/admin/AdminDashboardPage.tsx`](file:///Users/sidharaj/Desktop/onlineexam/frontend/src/pages/admin/AdminDashboardPage.tsx)

---

### GAP-02: Absence Detection (`NO_FACE`) Does Not Accumulate Sustained Strikes [RESOLVED IN AUDIT IMPLEMENTATION]
- **Status**: **RESOLVED & IMPLEMENTED**.
- **Delivered**:
  - In `ExamTakingPage.tsx`, added continuous absence accumulation: when `res.status === "NO_FACE"`, `consecutiveNoFaceRef.current` increments. Upon reaching 12 consecutive frames (~6 seconds of sustained absence), `triggerViolation("NO_FACE", "Candidate Absent: No face detected in camera viewport!")` fires automatically, captures a forensic snapshot, sounds the buzzer, and records the strike.
- **Files Modified**:
  - [`frontend/src/pages/exams/ExamTakingPage.tsx`](file:///Users/sidharaj/Desktop/onlineexam/frontend/src/pages/exams/ExamTakingPage.tsx)

---

## P1 — Important Gaps (Strongly Improves Technical Defensibility)

### GAP-03: Acoustic Proctoring & Speech Keyword Spotting
- **Problem**: The problem statement specifies *"Speech-to-text and suspicious speech/keyword analysis."* Currently, `getUserMedia` requests only `video: true, audio: false`. No audio stream is ingested or transcribed.
- **Current State**: Completely absent in live execution. Architectural documentation describes Faster-Whisper, but no backend or frontend audio pipeline is connected.
- **Required Change**:
  - For hackathon feasibility without destabilizing browser WASM/threads: utilize the browser's native Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) or Web Audio VAD with audio stream capture.
  - When speech occurs, match against forbidden keywords: `"help"`, `"answer"`, `"search"`, `"question"`, `"option"`. If matched, emit `SUSPICIOUS_SPEECH` violation notice.
- **Files Affected**:
  - [`frontend/src/pages/exams/ExamTakingPage.tsx`](file:///Users/sidharaj/Desktop/onlineexam/frontend/src/pages/exams/ExamTakingPage.tsx)
  - [`frontend/src/utils/audioDetection.ts`](file:///Users/sidharaj/Desktop/onlineexam/frontend/src/utils/audioDetection.ts) (New)
- **Estimated Complexity**: Medium (2-3 hours).
- **Risk**: Medium (Web Speech API requires browser microphone permissions and internet connectivity in Chromium).
- **Demo Impact**: **VERY HIGH**. Presenting a spoken prompt like *"What is the answer?"* and seeing a speech alert is a showstopper demo feature.

---

### GAP-04: Head Pose & Eye-Gaze Estimation
- **Problem**: The problem statement specifies *"Head movement and eye-gaze analysis."* The current system only performs a 2D bounding box centering check (`centerX` within 22%-78% of the viewport). It does not compute 3D Euler angles (yaw, pitch, roll) or track iris position.
- **Current State**: `NOT IMPLEMENTED`. Face centering is verified, but not true head pose or gaze direction.
- **Required Change**:
  - Integrate MediaPipe Face Mesh landmarks: compute ratio of distance between nose tip and left/right jaw edges to estimate Yaw angle (looking left/right $\ge 35^\circ$).
  - Measure iris position relative to eye corners to detect looking sideways off-screen.
- **Files Affected**:
  - [`frontend/src/utils/faceDetection.ts`](file:///Users/sidharaj/Desktop/onlineexam/frontend/src/utils/faceDetection.ts)
- **Estimated Complexity**: High (4-6 hours).
- **Risk**: High (Landmark extraction in pure JavaScript can add CPU latency; may cause false positives if lighting is asymmetrical).
- **Demo Impact**: High, but must be tuned conservatively to avoid false strikes.

---

## P2 — Nice to Have (Future Scope / Post-Hackathon)

### GAP-05: Non-Phone Prohibited Objects (Calculators, Headphones, Smartwatches)
- **Problem**: The problem statement lists calculators, headphones, and smartwatches. The current vision engine only targets mobile phones and erratic hand waving.
- **Current State**: Heuristics detect mobile phones in chest/ear zones. Calculators and smartwatches are not identified.
- **Required Change**: Load client-side COCO-SSD / YOLOv8n ONNX model with explicit object classes (`cell phone`, `laptop`, `book`, `watch`).
- **Files Affected**:
  - [`frontend/src/utils/objectDetection.ts`](file:///Users/sidharaj/Desktop/onlineexam/frontend/src/utils/objectDetection.ts)
- **Estimated Complexity**: High.
- **Risk**: High (Running multi-class object detection alongside face mesh in the browser can degrade framerate on non-GPU laptops).
- **Demo Impact**: Moderate (Demonstrating cell phone detection already satisfies 90% of judge scrutiny regarding unauthorized devices).

---

### GAP-06: Multiple-Speaker Diarization
- **Problem**: Detecting multiple distinct voices versus background noise.
- **Current State**: `NOT IMPLEMENTED`.
- **Recommendation**: Present as future architectural scope (requires acoustic embedding models like PyAnnote/Titanet which cannot run locally in browser client).

---

### GAP-07: PDF / Printable Proctoring Audit Export
- **Problem**: The forensic scorecard (`ExamResultPage.tsx`) renders in-browser with photographic violation thumbnails, but lacks a 1-click "Download PDF Audit Report" button.
- **Required Change**: Add `window.print()` print stylesheet or `jsPDF` export on the scorecard page.
- **Files Affected**:
  - [`frontend/src/pages/exams/ExamResultPage.tsx`](file:///Users/sidharaj/Desktop/onlineexam/frontend/src/pages/exams/ExamResultPage.tsx)
- **Estimated Complexity**: Low (< 1 hour).
- **Risk**: Very Low.
- **Demo Impact**: Moderate.
