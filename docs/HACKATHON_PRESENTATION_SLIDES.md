# Hackathon Final Presentation Slide Deck Content

**Project Title**: AI-Powered Secure Online Examination & Proctoring System  
**Presentation Track**: AI / Computer Vision & Educational Technology  

---

## Slide 1: Title Slide
- **Title**: AI-Powered Secure Online Examination & Proctoring System
- **Subtitle**: Real-Time Computer Vision & Zero-Latency Browser Security Platform
- **Presenter Team**: Computer Science & Engineering Department
- **Tagline**: Automated, Privacy-Preserving, Uncheatable Online Assessment Engine

---

## Slide 2: Problem Statement
- **Remote Exam Vulnerabilities**:
  - High prevalence of unmonitored smartphone usage during online exams.
  - Standard browser locks are easily bypassed via tab switching, second screens, or external windows.
  - Manual human invigilation is expensive, non-scalable, and prone to oversight.
- **The Core Challenge**: How to deliver automated, real-time proctoring with sub-second violation response while running on affordable, standard webcam hardware.

---

## Slide 3: The Proposed Solution
- **Multi-Layered AI Proctoring Engine**:
  - **Vision Engine**: Real-time OpenCV + Darknet YOLOv4-tiny neural network for mobile phone detection.
  - **Presence Engine**: Haar Cascade classifier for continuous candidate presence (detecting absence or second person).
  - **Browser Security**: HTML5 Page Visibility API integration for sub-50ms tab switch detection.
  - **Integrity Scorecard**: Automated 3-strike disqualification system with high-resolution evidence snapshots.

---

## Slide 4: System Architecture & Data Flow
- **Decoupled 3-Tier Architecture**:
  - **Frontend**: React 18, TypeScript, Vite, Tailwind CSS.
  - **Backend**: Python 3.14, FastAPI Async, SQLAlchemy ORM.
  - **AI Engine**: OpenCV `cv2.dnn` reading Darknet YOLOv4-tiny weights trained on COCO (80 classes).
  - **Database**: Relational DB persisting users, attempts, answers, violations, and security audit logs.

---

## Slide 5: Key Technical Innovations
1. **YOLOv4-tiny Object Detection**: Real-time cell phone classification (COCO Class 67) with Non-Maximum Suppression (NMS) and spatial context filtering to eliminate hand false positives.
2. **Instant Event-Driven Visibility API**: Zero-latency tab switch detection bypassing traditional laggy video frame sampling.
3. **Temporal Persistence & Cooldown Engine**: 1.5-second persistence filtering ensures zero false strikes from brief movements.
4. **Relational Evidence Audit Trail**: Automatic evidence snapshot archiving linked directly to candidate scorecards.

---

## Slide 6: System Live Demonstration
*(Refer to 5-Minute Demo Script: Login → Exam Launch → Live Monitoring → Phone Detection → Tab Switch → 3-Strike Disqualification → Scorecard & Invigilator Console)*

---

## Slide 7: Verification & Impact
- **Automated Test Coverage**: 24 / 24 backend pytest cases passing.
- **Production Build**: 0 TypeScript compilation errors.
- **Real-World Verification**: Verified under real webcam testing with zero false strikes on hand gestures.
- **Scalability**: Asynchronous Python API supports concurrent candidate sampling with minimal server CPU overhead.

---

## Slide 8: Future Roadmap & Conclusion
- **Future Enhancements**:
  - WebAssembly (WASM) client-side vision execution for edge device scaling.
  - Gaze tracking & head posture estimation via MediaPipe.
  - Audio anomaly detection for background speech detection.
- **Closing**: Thank you! Open for Questions & Evaluation.
