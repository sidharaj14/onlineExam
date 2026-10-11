# 13 — Security, Privacy & Data Protection Architecture

This document establishes the security safeguards, threat models, privacy-preserving design principles, access control protocols, and retention policies.

---

## 1. Threat Model & Attack Vectors

| Threat Vector | Description | Proposed Mitigation Strategy |
| :--- | :--- | :--- |
| **Identity Impersonation** | A surrogate test-taker replaces the authenticated candidate after login. | Pre-exam deep biometric face verification + periodic spot checks comparing embeddings against baseline profile. |
| **Unauthorized External Device** | Using a smartphone, secondary monitor, or smart calculator during the exam. | YOLOv8n object detection running on sampled frames with temporal validation; Fullscreen API & tab-blur detection. |
| **Virtual Camera / Feed Injection** | Injecting a pre-recorded loop video via virtual webcam software (OBS Virtual Camera). | Video stream constraint inspection (`enumerateDevices` label check) + randomized liveness challenges during onboarding. |
| **Client-Side DevTools Tampering** | Manipulating JavaScript state variables, disabling WebSockets, or spoofing telemetry. | Server-side heartbeat monitor: loss of telemetry for $> 15\text{s}$ triggers an exam pause and alerts the invigilator. |
| **Evidence Tampering** | A rogue user or attacker modifies saved violation screenshots to refute cheating allegations. | Automatic SHA-256 cryptographic hashing at capture time; hashes stored in immutable database `audit_logs`. |
| **Privacy Leaks / Surveillance** | Unauthorized third parties accessing sensitive student webcam streams or audio recordings. | Strict RBAC; ephemeral signed URLs; zero continuous video recording (only violation-triggered snapshots stored). |

---

## 2. Authentication & Session Security

1. **Password Storage**:
   - Passwords hashed using `bcrypt` with a minimum salt work factor of 12 rounds.
   - Raw passwords never logged or transmitted in plain text.
2. **Stateless JWT Session Management**:
   - Access tokens signed using `HMAC-SHA256` (or `RS256` in production).
   - Short Time-To-Live (TTL): 120 minutes maximum duration matching the exam window.
   - Claims include subject (`sub`), role (`student` / `admin`), and session issuance timestamp (`iat`).
3. **Transport Layer Security**:
   - Mandatory TLS 1.3 encryption across all REST (`HTTPS`) and WebSocket (`WSS`) connections.
   - HSTS (HTTP Strict Transport Security) headers enforced to prevent SSL stripping attacks.

---

## 3. Data Minimization & Privacy-Preserving Design

> [!IMPORTANT]
> **Privacy by Design**: The system is engineered to protect candidate dignity. It does **NOT** record continuous full-duration 1080p webcam video or archive endless hours of private bedroom audio.

1. **Client-Side Edge Inference**:
   - 468-point Face Mesh, 3D Head Pose, and Eye Gaze are computed directly in the student's browser.
   - Raw video frames used for gaze and pose tracking are processed in transient WebAssembly memory and discarded immediately.
   - Only structured mathematical numbers (e.g. `pitch: 4.2`, `yaw: -2.1`) are transmitted over the wire.
2. **Trigger-Only Evidence Archival**:
   - Video snapshots are captured and stored **only** when a high-confidence violation persists past temporal thresholds.
   - Audio snippets are restricted to a maximum rolling window of 4 seconds surrounding a detected vocal event.
3. **Zero Biometric Raw Image Exposure**:
   - Face verification converts reference images into numeric embedding vectors (128 or 512 floats).
   - Raw biometric reference images are stored with restricted POSIX permissions (`0600`) in non-public directories.

---

## 4. Student Consent & Hardware Permissions

1. **Transparent Pre-Flight Consent**:
   - Prior to initiating any media capture, candidates are presented with a clear **Proctoring Transparency Notice**.
   - Outlines exactly what is monitored: Camera feed, Microphone energy, Browser tab focus.
   - Outlines what is NOT monitored: Personal filesystem, network traffic, background applications outside browser sandbox.
   - Candidate must provide explicit digital consent via checkbox before camera/mic access is requested.
2. **Explicit Browser Permission Hooks**:
   - The application handles permission rejections (`NotAllowedError`) gracefully, displaying step-by-step instructions on re-enabling permissions in browser settings rather than crashing.

---

## 5. Evidence Access Control & Storage Security

1. **No Public Media Directories**:
   - Media evidence files are stored in `/storage/evidence/{exam_id}/{candidate_id}/` outside the web root.
   - Direct web server directory listing and public static file serving are disabled.
2. **Role-Based Evidence Gate**:
   - To inspect a screenshot or listen to an audio snippet, requests must hit `GET /api/v1/evidence/{id}` with a valid Admin JWT.
   - The server validates that the requesting administrator is assigned to that specific examination.
3. **Data Integrity & Non-Repudiation**:
   - Each evidence asset is stamped with an immutable visual watermark containing Candidate ID, Exam ID, UTC Timestamp, and SHA-256 Checksum.
   - Tampering with the file on disk causes a hash mismatch upon administrative review.

---

## 6. Data Retention & Secure Shredding Strategy

```
[ Active Exam Session ]
         |
         +--> Zero Violations? ---> Auto-purge temporary telemetry within 48 hours.
         |
         +--> Violations Flagged? -> Retain evidence for 30-day institutional appeal window.
                                           |
                                           v
                             [ Formal Grade Certification ]
                                           |
                                           v
                             [ Cryptographic Media Shredding ]
                             - Overwrite bytes with random noise (POSIX shred)
                             - Database records anonymized
```

---

## 7. Hackathon vs. Production-Grade Implementation

| Security Feature | Hackathon Implementation (MVP) | Production-Grade Enterprise (Post-MVP) |
| :--- | :--- | :--- |
| **Database** | SQLite with local filesystem storage. | PostgreSQL with encrypted volumes (LUKS) and AWS S3 with SSE-KMS. |
| **Secrets Management** | `.env` configuration file. | AWS Secrets Manager / HashiCorp Vault with dynamic rotation. |
| **Authentication** | Symmetric HMAC-SHA256 JWT tokens. | Asymmetric RS256 with JWKS endpoint + institutional Single Sign-On (SAML/OAuth2). |
| **Rate Limiting** | In-memory sliding window limiter. | Redis-backed distributed token bucket rate limiter with IP reputation scoring. |
| **Certifications** | Architectural adherence to privacy principles. | Verified formal SOC 2 Type II, FERPA, and GDPR compliance audits. |
