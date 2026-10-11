# 19 — Feature Prioritization Matrix: MVP vs. Advanced

This document provides an objective prioritization framework, separating the core hackathon demonstration deliverables (MVP) from post-hackathon enterprise enhancements (Advanced), scored across feasibility, complexity, and visual demo impact.

---

## 1. Prioritization Framework & Criteria

Features are ranked across four dimensions to maximize hackathon scoring:
1. **Technical Feasibility**: Can it run locally on standard hardware without complex external cloud infrastructure?
2. **Reliability**: Will it execute deterministically during a high-stakes live judging demonstration?
3. **Visual & Emotional Impact**: Does the feature immediately impress judges visually on screen?
4. **Engineering Complexity**: Estimated development effort relative to a 24–48 hour build timeline.

---

## 2. Feature Prioritization Matrix

| Feature Domain | Feature Description | Scope | Priority | Complexity | Demo Value | Rationale & Trade-Off |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication** | JWT Email/Password Login + RBAC | **MVP** | P0 | Low | High | Essential baseline for student and admin isolation. |
| **Biometrics** | Pre-Exam Face Biometric Verification | **MVP** | P0 | Medium | Very High | Visually impressive pre-flight gate proving identity. |
| **Biometrics** | Periodic Background Face Re-Verification | **Advanced**| P2 | High | Medium | Adds CPU overhead; can be simulated via periodic check. |
| **Exam Engine** | MCQ Question Delivery, Timer & Auto-Save | **MVP** | P0 | Low | High | Core functional requirement for any examination system. |
| **Exam Engine** | Fullscreen & Tab Switch Detection | **MVP** | P0 | Low | High | Instant demonstration of anti-cheat browser lockdown. |
| **Vision AI** | Face Presence & Absence Counter | **MVP** | P0 | Low | High | MediaPipe native capability; easy to demo by ducking. |
| **Vision AI** | Multiple Face Detection | **MVP** | P0 | Medium | High | Instantly triggers when teammate leans into frame. |
| **Vision AI** | 3D Head Pose (Pitch, Yaw, Roll) | **MVP** | P0 | Medium | Very High | 3D wireframe and Euler angles show high technical depth. |
| **Vision AI** | Eye Gaze Tracking (Looking Away) | **MVP** | P0 | Medium | Very High | Detects cheating without moving head; high novelty. |
| **Object Detection**| YOLOv8n Phone, Laptop, Book Detection | **MVP** | P0 | Medium | Very High | Instant visual hook: holding up a phone flags in red. |
| **Object Detection**| Custom YOLO for Smartwatch & Earbuds | **Advanced**| P2 | High | Medium | Requires custom labeled dataset and fine-tuning. |
| **Audio AI** | Web Audio VAD & RMS Energy Meter | **MVP** | P0 | Low | Medium | Visual audio bar reacts immediately to speaking. |
| **Audio AI** | Faster-Whisper Speech-to-Text | **MVP** | P1 | Medium | Very High | Transcribes spoken words into live text transcript. |
| **Audio AI** | Suspicious Keyword Spotting Engine | **MVP** | P1 | Low | High | Flags exam-specific keywords ("answer for question"). |
| **Audio AI** | Deep Speaker Diarization (PyAnnote) | **Advanced**| P3 | Very High | Medium | Heavy model, slow inference on CPU; high demo risk. |
| **Violation Engine**| Temporal Anomaly Validation Window | **MVP** | P0 | Medium | High | Eliminates false positives; proves architectural maturity. |
| **Violation Engine**| Strike Points & Graduated Warnings | **MVP** | P0 | Medium | Very High | Visual warning modals prevent instant disqualification. |
| **Violation Engine**| Automatic Disqualification State Machine| **MVP** | P0 | Low | High | Freezes exam deterministically at 100 points. |
| **Evidence** | Watermarked Screenshot with Bounding Box | **MVP** | P0 | Medium | Very High | Indisputable proof shown in admin review console. |
| **Evidence** | 4-Second WAV Audio Snippet Archival | **MVP** | P1 | Medium | High | Allows admin to listen to the exact spoken cheat phrase. |
| **Evidence** | SHA-256 Cryptographic Media Checksum | **MVP** | P1 | Low | High | Proves non-repudiation and security consciousness. |
| **Admin Console** | Real-Time WebSocket Roster & Alerts | **MVP** | P0 | Medium | Very High | Enables dynamic two-screen live demonstration. |
| **Admin Console** | Forensic Incident Review & Override | **MVP** | P0 | Medium | Very High | Admin can inspect evidence and dismiss false positives. |
| **Reporting** | Integrity Trust Score & Incident Timeline| **MVP** | P0 | Low | High | Comprehensive post-exam summary for universities. |
| **Infrastructure** | SQLite Embedded Database (SQLAlchemy) | **MVP** | P0 | Low | High | Zero-install portability; runs on any laptop. |
| **Infrastructure** | PostgreSQL + S3 Object Storage Cloud | **Advanced**| P3 | High | Low | Enterprise setup, unnecessary complexity for hackathon. |

---

## 3. Scope Boundary Summary

### What MUST Be in the Hackathon MVP:
1. Complete student exam taking flow (Auth $\rightarrow$ Face Verification $\rightarrow$ Questions $\rightarrow$ Submission).
2. Live client-side vision telemetry (Face Presence, Head Pose, Eye Gaze).
3. Server-side object detection (Cell Phone) and speech-to-text with keyword matching.
4. The 8-stage violation engine with temporal filtering, strike points, and warning modals.
5. Automated watermarked screenshot capture with SHA-256 checksums.
6. Real-time WebSocket-powered Admin Command Center with live alert updates and incident review.
7. Candidate integrity trust scorecard generation.

### What is Explicitly Deferred to Advanced Roadmap:
1. Fine-tuning custom neural networks for micro-wearables (earbuds, smartwatches).
2. Heavy multi-speaker acoustic clustering / PyAnnote voice embeddings.
3. Multi-camera secondary mobile phone streaming (side-angle video).
4. Native desktop OS-level kernel lockdowns (e.g. Electron / C++ rootkit).
