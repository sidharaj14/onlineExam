# 14 — Testing Strategy & Quality Assurance Plan

This document establishes the test automation framework, verification tiers, AI model evaluation benchmarks, and 20 exhaustive proctoring scenario test scripts.

---

## 1. Testing Pyramid & Verification Tiers

```
           / \
          /   \     E2E / Scenario Tests (Playwright & Mock Cameras)
         /-----\
        / Integ \    API Integration & WebSocket Gateway Tests (Pytest-Asyncio)
       /---------\
      /   Unit    \   Component, Service & Math Helper Tests (Vitest & Pytest)
     /-------------\
```

1. **Unit Testing**:
   - **Frontend (Vitest)**: Tests React hooks (`useExamTimer`, `useWebcam`), state reducers, question navigation logic, and Euler angle conversion helpers.
   - **Backend (Pytest)**: Tests Pydantic schemas, password hashing, JWT token generation/validation, and mathematical calculations in the Violation Engine.
2. **Integration & API Testing**:
   - Tests REST endpoints with SQLite memory databases.
   - Tests WebSocket connection lifecycles, authentication handshakes, and broadcast routing.
3. **AI / Model Performance Testing**:
   - Evaluates false-positive rejection rates against synthetic video loops (lighting shifts, natural blinking).
   - Validates YOLOv8n object detection latency on CPU.
4. **Performance & Stress Testing (Locust)**:
   - Simulates 50 concurrent students streaming WebSocket telemetry heartbeats every 1.0 second.

---

## 2. Exhaustive Proctoring Scenario Test Matrix (20 Scenarios)

| ID | Test Scenario | Stimulus / Test Action | Expected Pipeline Behavior | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | **Normal Examination** | Candidate sits upright, answers questions, glances naturally within screen boundaries. | Face detected at 30 FPS; Yaw/Pitch within safe zone; zero candidate anomalies buffered. | Status remains `COMPLIANT`; 0 strike points accrued; exam submits cleanly. |
| **TC-02** | **Face Disappears** | Candidate ducks under desk or steps out of camera view for 3.5 seconds. | `absence_timer` exceeds $2.0\text{s}$ threshold; emits `FACE_ABSENT`; Severity MEDIUM (25 pts). | Watermarked screenshot of empty room saved; status changes to `AT_RISK` (25 pts). |
| **TC-03** | **Multiple Faces** | A second individual steps behind the candidate and leans into camera view for 2.0 seconds. | MediaPipe detects 2 face bounding boxes for $> 1.0\text{s}$; emits `MULTIPLE_FACES` (50 pts). | Bounding boxes drawn on both faces; screenshot stored; status escalates to `WARNING_1`. |
| **TC-04** | **Identity Mismatch** | A surrogate test-taker replaces the student during pre-exam selfie check. | InsightFace calculates cosine similarity ($0.42 < 0.75$); rejects biometric verification. | `403 Forbidden` returned; exam entry blocked; incident logged in `audit_logs`. |
| **TC-05** | **Looking Away Briefly** | Candidate glances toward ceiling for 1.2 seconds, then resumes looking at monitor. | MediaPipe detects Pitch anomaly, but temporal duration ($1.2\text{s} < 2.5\text{s}$) does not meet threshold. | Buffer resets to 0; **zero violation recorded**; no penalty applied. |
| **TC-06** | **Looking Away Repeatedly** | Candidate turns head $35^\circ$ to the right to read notes for 4.0 seconds. | EMA-smoothed Yaw exceeds $28^\circ$ for $> 2.5\text{s}$; emits `HEAD_POSE_ANOMALY` (10 pts). | Screenshot saved; cumulative score reaches 10 points; status remains `AT_RISK`. |
| **TC-07** | **Phone Detected** | Candidate raises a smartphone in front of webcam to photograph question for 2.5 seconds. | YOLOv8n detects `cell phone` (Conf: 0.88) across 2 consecutive frames; emits `PROHIBITED_OBJECT` (50 pts). | Red bounding box on phone captured; status escalates to `WARNING_1` (50 pts). |
| **TC-08** | **Calculator Detected** | Candidate places unauthorized programmable calculator on desk in view for 3.0 seconds. | Heuristic/YOLO detector identifies contraband device; emits `PROHIBITED_OBJECT`. | Screenshot captured with bounding box; 50 strike points assigned. |
| **TC-09** | **Headphones Detected** | Candidate wears over-ear headphones covering both ears during exam. | Heuristic head-side bounding box flags obstruction; emits `PROHIBITED_OBJECT` (50 pts). | Visual evidence captured; student alerted via Warning modal to remove headphones. |
| **TC-10** | **Smartwatch Detected** | Candidate repeatedly checks wrist smartwatch held directly in camera frame for 4.0 seconds. | Gaze down + hand-held object detection flags repeated wrist checking; emits anomaly. | Event logged with bounding box snapshot; warning issued. |
| **TC-11** | **Additional Person** | Bystander walks across background behind candidate without looking at screen. | Person detector flags secondary human body outline in background for $> 1.5\text{s}$. | Emits `ADDITIONAL_PERSON` (50 pts); captures evidence frame for admin review. |
| **TC-12** | **Speech Detected** | Candidate mutters non-keyword words or hums to themselves quietly. | Web Audio VAD detects sound; Faster-Whisper transcribes speech; no suspicious keywords matched. | Low-severity acoustic notice or silent audit log; no high strike points accrued. |
| **TC-13** | **Suspicious Keyword** | Candidate clearly asks aloud: "What is the answer for question number three?" | Faster-Whisper transcribes phrase; regex matches `"what is the answer"`; emits `SUSPICIOUS_SPEECH` (50 pts). | 4-second WAV snippet and transcript saved; cumulative points increase by 50. |
| **TC-14** | **Multiple Speakers** | Candidate whispers question and a second distinct voice whispers back an answer. | Acoustic energy shifts indicate conversational dialogue; emits `MULTIPLE_SPEAKERS` (50 pts). | Audio snippet saved; immediate warning dispatched to candidate screen. |
| **TC-15** | **Repeated Violations** | Candidate accrues 25 pts (absence) + 50 pts (phone) + 25 pts (tab switch) over 10 minutes. | Cumulative points reach $100\text{ points}$; threshold trigger fires. | Session status transitions to `DISQUALIFIED`; interface locks immediately. |
| **TC-16** | **Auto Disqualification** | Candidate receives Warning 1 (30 pts), Warning 2 (60 pts), then commits a 3rd high violation. | Third warning condition met; Disqualification State Machine locks exam. | Auto-submits exam; displays disqualification screen; pushes alert to Admin console. |
| **TC-17** | **Network Interruption** | Wi-Fi drops for 25 seconds while candidate is answering question 7. | React store buffers answers locally in memory; WebSocket reconnects with exponential backoff. | Reconnection successful; buffered answers synced; zero data lost; session continues. |
| **TC-18** | **Camera Denied** | Candidate clicks "Block" on browser camera permission prompt. | `navigator.mediaDevices.getUserMedia` throws `NotAllowedError`. | Exam entry blocked; renders guided troubleshooting modal to re-enable camera in browser. |
| **TC-19** | **Mic Denied** | Candidate denies microphone permission during pre-flight check. | System pre-flight check identifies missing audio track. | `[Start Exam]` button remains disabled with warning: "Microphone access is required." |
| **TC-20** | **Exam Submission** | Candidate completes all questions and clicks [Submit Exam] confirming prompt. | State changes to `SUBMITTED`; camera/mic streams released; attempts table finalized. | Candidate redirected to completion screen; integrity report generated on backend. |

---

## 3. Automated Test Execution Commands

```bash
# Backend Unit & Integration Tests
pytest tests/ -v --cov=app --cov-report=term-missing

# Frontend Component & Hook Tests
npm run test:unit

# End-to-End Headless Browser Tests
npx playwright test tests/e2e/exam-flow.spec.ts

# WebSocket Telemetry Stress Test (Locust)
locust -f tests/stress/locustfile.py --headless -u 50 -r 5 --run-time 2m --host http://localhost:8000
```
