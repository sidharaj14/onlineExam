# ExamGuard AI — Hackathon Demonstration Guide

## 1. Quick Start / Environment Setup

### 1.1 Backend
```bash
cd /Users/sidharaj/Desktop/onlineexam/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 1.2 Frontend
```bash
cd /Users/sidharaj/Desktop/onlineexam/frontend
npm run dev
# Portal accessible at http://localhost:5173
```

---

## 2. Recommended Live Demonstration Script (5 Minutes)

### Phase 1: Authentication & Institutional Branding (1 Minute)
1. Open `http://localhost:5173/login`.
2. Highlight the clean academic design, absence of distracting AI gradients, and clear university portal branding.
3. Click **"Candidate Student Demo"** (`student@example.com` / `student123`) or enter your own registered credentials.
4. Show OTP email delivery (if testing new registration) with a professional subject line.

### Phase 2: Candidate Dashboard & Exam Preparation (1 Minute)
1. Showcase the student dashboard:
   - High-level metric cards: Total Exams Taken, Average Score, High Score, Clean Integrity Sessions.
   - Comprehensive Performance Trends chart and historical attempt list with Integrity Score badges.
2. Select the flagship assessment: **"Advanced AI & Machine Learning Certification"** and click **"Start Assessment"**.
3. Point out the streamlined pre-flight hardware flow:
   - User lands on `/exams/:examId/instructions`.
   - Real-time webcam hardware preview and audio visualizer.
   - Institutional code of conduct checklist.
   - Camera permission check without redundant face calibration roadblocks.

### Phase 3: Live Exam Taking & Continuous AI Proctoring (2 Minutes)
1. Check "I have read and agree to follow all examination rules" and click **"Proceed to Secure Examination"**.
2. Point out:
   - Clean examination canvas with full-screen prompt and sidebar proctoring box.
   - Live AI status badges: `● AI Monitoring Active`, `Camera Connected`, `Microphone Connected`.
   - Dynamic integrity reticle tracking candidate face and orientation.
3. **Demonstrate AI Fairness**:
   - Natural head tilts, reading questions, blinking do **NOT** trigger strikes.
4. **Demonstrate Proctoring Detections**:
   - Turn away from camera for $>6$s $\rightarrow$ `NO_FACE` warning strike.
   - Introduce a 2nd person $\rightarrow$ `MULTIPLE_FACES` warning strike.
   - Switch browser tab for $>1.5$s $\rightarrow$ `TAB_SWITCH` warning strike.
   - Show how each strike incurs an audible alert, red banner, and adjusts the integrity meter ($100\% \rightarrow 80\% \rightarrow 60\% \rightarrow 40\%$).
5. Demonstrate question answering and autosave indicator ("All changes saved to database").
6. Click **"Submit Assessment"** $\rightarrow$ land on the detailed result scorecard.

### Phase 4: Chief Invigilator Console (1 Minute)
1. Log out or navigate to `/login`, then select **"Invigilator Admin Demo"** (`admin@example.com` / `admin123`).
2. Demonstrate Chief Invigilator Console (`/admin/dashboard`):
   - Real-time roster of all student attempts.
   - Filter by status (Submitted, Disqualified, In Progress).
   - Drill down into candidate attempts to inspect proctoring violations and audit logs.
3. Demonstrate Role Separation:
   - Log back in as student $\rightarrow$ attempting to access `/admin/dashboard` automatically redirects to `/student/dashboard`.
