# ExamGuard AI — Security Architecture & Access Control

## 1. Threat Model & Mitigations

| Threat Vector | Attack Scenario | Implemented Countermeasure |
|---|---|---|
| **Role Escalation** | Candidate navigates to `/admin/dashboard` or invokes admin APIs | Frontend `<ProtectedRoute allowedRoles={["admin", "super_admin"]}>` redirects candidate; Backend `require_role` dependency raises `403 Forbidden`. |
| **IDOR / Data Tampering** | Candidate passes another user's `attempt_id` to view scores or results | Ownership verification check compares `attempt.user_id == current_user.id`; raises `403 Forbidden` on mismatch. |
| **Brute Force OTP** | Attacker attempts to brute force 6-digit email OTP | 10-minute expiry per OTP code, rate limiting, and 60-second re-dispatch cooldown enforced in production. |
| **OTP Leakage** | OTP exposed in server logs or JSON responses | `debug_otp` is strictly silenced when `DEV_MODE=False`. No OTP printed to production stdout. |
| **Hardware Bypasses** | Candidate turns off webcam during test | Continuous polling checks video feed dimensions; full-screen blocking overlay halts exam until video stream is reconnected. |
| **Non-Repudiation** | Candidate claims technical glitch or disputes strikes | Relational table `security_audit_logs` records IP addresses, timestamps, and actions (`EXAM_START`, `ANSWER_SAVE`, `VIOLATION_RECORDED`, `EXAM_SUBMISSION`). |

## 2. Role-Based Access Control (RBAC) Matrix

| Endpoint Group | Student Role | Invigilator / Admin Role | Anonymous |
|---|---|---|---|
| `/api/v1/auth/login` | Allowed | Allowed | Allowed |
| `/api/v1/auth/register` | Allowed | Allowed | Allowed |
| `/api/v1/exams` (Catalog) | Allowed | Allowed | Allowed |
| `/api/v1/exams/{id}/start` | Allowed | Allowed | Denied (401) |
| `/api/v1/exams/attempts/{id}/answers` | Own Attempt Only | Allowed | Denied (401) |
| `/api/v1/exams/attempts/{id}/result` | Own Attempt Only | Allowed | Denied (401) |
| `/api/v1/exams/admin/*` | **Denied (403)** | Allowed | Denied (401) |
| `/api/v1/users/admin/*` | **Denied (403)** | Allowed | Denied (401) |
