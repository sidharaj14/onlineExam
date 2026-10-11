# ExamGuard AI — AI Proctoring & Violation Engine Specification

## 1. Proctoring Design Principles
ExamGuard AI is engineered to balance uncompromising integrity with academic fairness. Real-world exam environments introduce lighting fluctuations, natural head tilts while reading, glasses glare, and keyboard glancing. The proctoring engine applies temporal filtering, frame stability verification, and multi-second cooldowns to eradicate false alarms while catching genuine malpractices.

## 2. Detection Channels & Thresholds

| Violation Type | Detection Mechanism | Minimum Persistence Window | Debounce Cooldown |
|---|---|---|---|
| `MULTIPLE_FACES` | Optical bounding variance, 2nd face contour detection | 8 consecutive frames ($\approx 4.0$s) | 6.0 seconds |
| `NO_FACE` (Candidate Absent) | Face landmark absence in camera reticle | 12 consecutive frames ($\approx 6.0$s) | 6.0 seconds |
| `PHONE_DETECTED` | High-contrast device aspect ratio & posture analysis | 6 consecutive frames ($\approx 3.0$s) | 6.0 seconds |
| `TAB_SWITCH` | HTML5 Page Visibility API (`document.hidden`) | $> 1.5$ seconds blur | Immediate on $>1.5$s |
| `FULLSCREEN_EXIT` | Screen lockdown event listener | Immediate on fullscreen change | Immediate |

## 3. False Positive Mitigation
1. **Initial Warmup Grace Period**: 7-second grace window upon entering the examination to allow webcam auto-exposure and lighting auto-adjustment to settle.
2. **Glance & Blink Tolerance**: Single frame or short-lived anomalies ($<3.0$s) are filtered out without triggering strikes.
3. **Natural Posture Tolerances**: Reading down towards lower questions or brief neck adjustments do not register as absence.
4. **Debounce Interval**: Minimum 6-second cooldown between strikes prevents one brief event from triggering consecutive strikes.

## 4. 3-Strike Escalation Hierarchy
- **Strike 1 (Caution)**: Amber banner, audible warning chime, proctor meter advances to $1/3$, Integrity score adjusted to $80\%$.
- **Strike 2 (Critical Warning)**: Red alert banner, high-frequency alert, proctor meter advances to $2/3$, Integrity score adjusted to $60\%$.
- **Strike 3 (Disqualification)**: Examination locked immediately, proctor status set to Disqualified, answers autosaved, attempt status transitioned to `"terminated"`, Integrity score drops to $40\%$ or below.

## 5. Hardware Pipeline
- The camera stream requested on the **Exam Instructions Page** (`/exams/:examId/instructions`) persists directly into the **Exam Taking Canvas** (`/exams/:attemptId/take`).
- If camera permission is revoked or disconnected during the exam, an unclosable blocking overlay prevents test progression until permissions are restored.
