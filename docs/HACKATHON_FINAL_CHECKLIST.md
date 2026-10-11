# Hackathon Pre-Demo Verification Checklist

**Project Title**: AI-Powered Secure Online Examination & Proctoring System  
**Audit Date**: October 3, 2026  

---

## Pre-Presentation Readiness Checklist

| Checklist Item | Description | Status | Verification Method |
| :--- | :--- | :---: | :--- |
| **1. Backend Server** | FastAPI server running on port 8000 | ✅ READY | `curl http://localhost:8000/api/v1/health` returns status OK |
| **2. Frontend App** | Vite React app running on port 5173 | ✅ READY | App loads smoothly at `http://localhost:5173` |
| **3. Automated Tests** | Backend Pytest suite 24/24 passing | ✅ READY | `PYTHONPATH=backend backend/venv/bin/pytest backend/tests -v` |
| **4. Production Build** | TypeScript build compiles cleanly | ✅ READY | `npm --prefix frontend run build` exits code 0 |
| **5. Model Weights** | `yolov4-tiny.weights` cached in backend | ✅ READY | Located at `backend/app/proctoring/models/yolov4-tiny.weights` |
| **6. Demo Credentials** | Student & Teacher credentials verified | ✅ READY | Student: `student@example.com` / `student123`<br>Teacher: `teacher@example.com` / `admin123` |
| **7. Phone Detection** | Real webcam cell phone detection working | ✅ READY | Tested with real smartphone; triggers Strike 1 |
| **8. Tab-Switching** | Immediate tab switch detection working | ✅ READY | Tested via `document.visibilityState`; triggers immediate strike |
| **9. Evidence Storage** | Evidence snapshots persisting to disk | ✅ READY | Located at `backend/app/storage/violations/` |
| **10. Scorecard & Audit**| Result page displaying score & strikes | ✅ READY | Scorecard shows answers, time spent, and violation evidence |
| **11. Role Isolation** | Students blocked from invigilator view | ✅ READY | ProtectedRoute redirects non-admin users to `/student/dashboard` |
| **12. Presentation Deck**| Slide content & 5-minute script ready | ✅ READY | Located at `docs/FINAL_5_MINUTE_DEMO_SCRIPT.md` |
