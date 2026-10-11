# Final Demo Readiness Checklist

## 1. Pre-Demo System Verification (30 Minutes Before Presentation)

### Infrastructure & Services
- [ ] **Backend Server Active**: Confirm FastAPI is listening on port `8000`:
  ```bash
  curl -s http://localhost:8000/api/v1/exams
  ```
- [ ] **Frontend Server Active**: Confirm Vite dev server is listening on port `5173`:
  ```bash
  curl -s http://localhost:5173
  ```
- [ ] **Database Intact**: Verify single unified SQLite database [`onlineexam.db`](file:///Users/sidharaj/Desktop/onlineexam/onlineexam.db) exists and has default exam seeded.
- [ ] **SMTP Credentials Configured**: Confirm [`backend/.env`](file:///Users/sidharaj/Desktop/onlineexam/backend/.env) contains valid `SMTP_USER` and `SMTP_PASSWORD` for live email OTP delivery.
- [ ] **Browser Hardware Permissions**: Ensure Google Chrome has granted Camera permissions for `http://localhost:5173`.
- [ ] **Storage Directories Writable**: Confirm `backend/storage/verifications` and `backend/storage/violations` exist.

---

## 2. Step-by-Step Live Demo Script (5-Minute Winning Pitch)

### Step 1: Authentication & Real Email OTP (60 Seconds)
1. Navigate to `http://localhost:5173/login`.
2. Point out that the system supports real institutional verification.
3. Click **"Register with Email OTP"** $\rightarrow$ enter student details $\rightarrow$ click **"Send Verification OTP"**.
4. Show the real email received in Gmail inbox with the university template.
5. Enter the 6-digit code $\rightarrow$ account is authenticated and routes to the Student Dashboard.
   *(Shortcut Option: If internet/SMTP latency is a concern during stage time, use the 1-Click "Demo Student" bypass button on `/login` to enter instantaneously.)*

### Step 2: Student Dashboard & Performance Analytics (45 Seconds)
1. Highlight the Executive KPI cards: **Tests Completed**, **Average Score %**, **Pass Rate %**, and **AI Integrity Score (99.2% High Trust)**.
2. Show the **"Recent Score Trajectory"** visual progress bars and **"Subject Competency"** breakdown.
3. Scroll to the active examination card: **"CS301: Advanced Data Structures & Algorithms"** and click **"Give Test Now (Camera Verification)"**.

### Step 3: Biometric Identity Calibration (45 Seconds)
1. Webcam stream initializes with live facial oval overlay.
2. Point out the live telemetry: biometric landmarks acquired $\rightarrow$ measuring facial coordinates $\rightarrow$ calibrating candidate baseline.
3. Show that background room lights or light bulbs do NOT interfere with calibration.
4. Auto-redirects to the secure examination workspace.

### Step 4: Live AI Proctoring & Violation Escalation (90 Seconds)
1. **Fullscreen & Tab Switch Detection**:
   - Switch browser tabs or press Cmd+Tab.
   - Immediate audio buzzer plays, warning modal flashes: **"STRIKE 1: TAB SWITCH DETECTED"**, snapshot captured.
2. **Mobile Phone Detection**:
   - Hold a smartphone in front of the camera or to the ear.
   - AI detects the phone edges/body: **"STRIKE 2: MOBILE PHONE / DEVICE IN RADAR"**.
3. **Disqualification (Strike 3)**:
   - Switch tabs one more time or bring a secondary face into camera view.
   - System triggers **"EXAMINATION TERMINATED (3 OF 3 STRIKES)"**, instantly disables camera, locks answering, and auto-submits.

### Step 5: Post-Exam Forensic Audit Report (30 Seconds)
1. Shows the candidate scorecard: **DISQUALIFIED (3 Strikes)**.
2. Scroll to the **"Proctoring Infractions & Warning Audit Log"**:
   - Inspect every strike timestamp, violation classification, and photographic proof thumbnail.
3. Click a thumbnail to show the judges the photographic evidence captured by the AI.

### Step 6: Invigilator / Chief Proctor Console (30 Seconds)
1. In top navbar, toggle role to **"Invigilator"** $\rightarrow$ navigates to `/admin/dashboard`.
2. Show the live candidate roster, real-time attempt statuses (`TERMINATED_VIOLATION`, `SUBMITTED`), and click **"Review Forensic Report"** to inspect candidate proof from the administrative console.

---

## 3. Contingency & Backup Protocols

| Potential Failure | Root Cause | Immediate Backup Action |
| :--- | :--- | :--- |
| **Stage Wi-Fi Fails** | Hotel/Auditorium internet disconnects. | 1. Use the **1-Click Demo Accounts** on `/login` (zero network dependency).<br>2. Localhost runs 100% offline for exam taking and AI detection once loaded. |
| **Webcam Permission Blocked** | Browser permissions prompt dismissed. | Click the camera icon in Chrome URL address bar $\rightarrow$ select "Always allow" $\rightarrow$ refresh page. |
| **Backend Crashes** | Unhandled exception or terminal closed. | In terminal: `cd /Users/sidharaj/Desktop/onlineexam/backend && venv/bin/uvicorn app.main:app --port 8000 &` |
| **SMTP Rejection** | Google rate-limits rapid registration testing. | Use pre-seeded student account: `student@example.com` / `student123` or click **"Demo Student"**. |
| **Camera Glare** | Overhead spotlights in auditorium. | Our $YC_bC_r$ skin-chrominance filter rejects incandescent bulbs. If spotlights cause glare, tilt laptop screen slightly downward. |
