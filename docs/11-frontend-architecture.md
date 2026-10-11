# 11 — Frontend Architecture: React, Vite, State Management & Wireframes

This document details the single-page application (SPA) architecture, directory organization, state management, component tree, and user interface specifications for both Student and Administrator portals.

---

## 1. Technical Framework & Tooling

- **Core Framework**: React 18 / 19 with TypeScript
- **Build Tool**: Vite (Rollup bundler with native ES modules)
- **Styling**: Tailwind CSS v3 with custom design tokens
- **Icons**: Lucide React
- **Client Routing**: `react-router-dom` v6 with nested layout routes and protected route guards
- **State Management**: Zustand (lean, un-opinionated store modules for auth, exam session, and proctoring telemetry)
- **HTTP Client**: Axios with interceptors for JWT injection and automated refresh
- **Edge Vision Worker**: MediaPipe Face Mesh (`@mediapipe/tasks-vision`) running on HTMLCanvasElement
- **Audio Processing**: Web Audio API (`AudioContext`, `AnalyserNode`, `AudioWorklet`)

---

## 2. Directory Structure

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── routes/
    │   ├── AppRoutes.tsx
    │   ├── ProtectedRoute.tsx
    │   └── AdminRoute.tsx
    ├── layouts/
    │   ├── StudentExamLayout.tsx
    │   ├── AdminDashboardLayout.tsx
    │   └── AuthLayout.tsx
    ├── pages/
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   └── RegisterPage.tsx
    │   ├── student/
    │   │   ├── StudentDashboardPage.tsx
    │   │   ├── PreFlightCheckPage.tsx
    │   │   ├── FaceVerificationPage.tsx
    │   │   ├── ExamInstructionsPage.tsx
    │   │   ├── ActiveExamPage.tsx
    │   │   └── ExamCompletionPage.tsx
    │   └── admin/
    │       ├── AdminDashboardPage.tsx
    │       ├── ExamManagementPage.tsx
    │       ├── CreateExamPage.tsx
    │       ├── LiveMonitoringPage.tsx
    │       ├── IncidentReviewPage.tsx
    │       └── ReportViewerPage.tsx
    ├── components/
    │   ├── common/
    │   │   ├── Button.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Card.tsx
    │   │   └── Toast.tsx
    │   ├── proctoring/
    │   │   ├── WebcamMonitor.tsx
    │   │   ├── FaceMeshCanvas.tsx
    │   │   ├── StatusIndicatorPill.tsx
    │   │   ├── WarningModal.tsx
    │   │   └── DisqualificationOverlay.tsx
    │   ├── exam/
    │   │   ├── QuestionPalette.tsx
    │   │   ├── QuestionView.tsx
    │   │   ├── CountdownTimer.tsx
    │   │   └── SubmissionModal.tsx
    │   └── admin/
    │       ├── CandidateCard.tsx
    │       ├── RiskMatrixGrid.tsx
    │       ├── RealtimeAlertFeed.tsx
    │       ├── EvidenceViewerModal.tsx
    │       └── IncidentTimeline.tsx
    ├── hooks/
    │   ├── useWebcam.ts
    │   ├── useMediaPipe.ts
    │   ├── useAudioMonitor.ts
    │   ├── useWebSocket.ts
    │   ├── useExamTimer.ts
    │   └── useFullscreen.ts
    ├── store/
    │   ├── useAuthStore.ts
    │   ├── useExamStore.ts
    │   └── useProctoringStore.ts
    ├── services/
    │   ├── api.ts
    │   ├── authService.ts
    │   ├── examService.ts
    │   ├── proctoringService.ts
    │   └── evidenceService.ts
    └── types/
        ├── auth.types.ts
        ├── exam.types.ts
        ├── proctoring.types.ts
        └── api.types.ts
```

---

## 3. Global State Architecture (Zustand Stores)

### 3.1. `useAuthStore`
Tracks authenticated session state, user role, and JWT token.
```typescript
interface AuthState {
  user: UserProfile | null;
  token: string | null;
  role: "student" | "admin" | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
}
```

### 3.2. `useExamStore`
Manages the active exam attempt, question pool, current index, and selected answers.
```typescript
interface ExamState {
  attemptId: string | null;
  examId: string | null;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string>; // questionId -> selectedOptionId
  timeRemainingSeconds: number;
  isSubmitting: boolean;
  setAnswers: (answers: Record<string, string>) => void;
  selectOption: (questionId: string, optionId: string) => Promise<void>;
  navigateQuestion: (index: number) => void;
  submitExam: () => Promise<void>;
}
```

### 3.3. `useProctoringStore`
Maintains real-time vision/acoustic telemetry, warning states, and modal triggers.
```typescript
interface ProctoringState {
  sessionStatus: "COMPLIANT" | "WARNING_1" | "WARNING_2" | "DISQUALIFIED";
  cumulativePoints: number;
  warningCount: number;
  activeWarning: WarningPayload | null;
  isDisqualified: boolean;
  headPose: { pitch: number; yaw: number; roll: number };
  isFacePresent: boolean;
  faceCount: number;
  gazeStatus: "CENTER" | "AWAY";
  lastTelemetryTimestamp: number;
  dismissWarning: () => Promise<void>;
}
```

---

## 4. Student Workflow Screen Specifications

### Screen 1: Pre-Flight System Check (`/exam/:id/pre-flight`)
- **Layout**: Centered card with three interactive verification cards.
- **Components**:
  - `CameraCheckCard`: Renders live webcam feed, validates $\ge 720\text{p}$, displays green checkmark.
  - `MicCheckCard`: Real-time audio visualizer bar reacting to candidate voice.
  - `EnvironmentCheckCard`: Ambient lighting level rating (Too Dark / Good / Glare).
  - `ContinueButton`: Disabled until all checks pass.

### Screen 2: Facial Biometric Verification (`/exam/:id/verify-face`)
- **Layout**: Guided alignment view with an oval face silhouette overlay.
- **Components**:
  - Live `<video>` feed inside an SVG oval mask.
  - Guidance text: "Center your face inside the frame and look directly at the camera."
  - `[Capture & Verify]` button: Triggers frame snapshot, calls `POST /api/v1/proctoring/verify-face`.
  - Progress spinner transitioning to green verified checkmark with similarity score.

### Screen 3: Examination Taking Workspace (`/exam/:id/take`)
- **Layout**: 3-panel secure workspace:
  ```
  +-------------------------------------------------------------------------------+
  | [INSTITUTION LOGO]  CS101: Midterm Exam   | [TIME: 45:12] | [MONITORING ACTIVE]|
  +-------------------------------------------------------------------------------+
  | [QUESTION PALETTE] | [ACTIVE QUESTION VIEW]           | [MINI WEBCAM HUD]      |
  |                    |                                  | +--------------------+ |
  | (1)  (2)  (3)  (4) | Question 3 of 25 (2 Points)      | | [Live Face Feed]   | |
  | (5)  (6)  (7)  (8) |                                  | | Yaw: 2°  Pitch: 1° | |
  | (9) (10) (11) (12) | What is the average-case time    | | Status: Compliant  | |
  |                    | complexity of QuickSort?         | +--------------------+ |
  | [Legend]           |                                  |                        |
  | * Answered (Green) | [ ] A) O(N)                      | [SYSTEM INTEGRITY]     |
  | * Marked   (Blue)  | [X] B) O(N log N)                | Strikes: 0 / 3         |
  | * Unread   (Gray)  | [ ] C) O(N^2)                    | Risk Points: 0 / 100   |
  |                    | [ ] D) O(log N)                  | Fullscreen: LOCKED     |
  |                    |                                  |                        |
  |                    | [ < Prev ] [ Mark Review ] [ Next > ]                     |
  +-------------------------------------------------------+------------------------+
  | [ FOOTER ]: All answers auto-saved | Candidate ID: STU-8829 | [ SUBMIT EXAM ]  |
  +-------------------------------------------------------------------------------+
  ```

### Screen 4: Warning Modal (`<WarningModal />`)
- **Behavior**: Locks UI interaction, displays an amber/red warning shield.
- **Message**: "Warning 1 of 3: Prohibited device detected. Continued violations will result in automatic disqualification."
- **Action**: Student must click `[I Acknowledge and Comply]` to close and resume.

---

## 5. Administrator Workspace Screen Specifications

### Screen 1: Live Invigilation Command Center (`/admin/live/:exam_id`)
- **Layout**: Real-time cohort monitoring grid.
  ```
  +-------------------------------------------------------------------------------+
  | EXAM MONITORING: CS101 | Total Candidates: 45 | Compliant: 41 | At Risk: 4    |
  +-------------------------------------------------------------------------------+
  | [REAL-TIME ALERT FEED (WS)] | [CANDIDATE RISK MATRIX GRID]                    |
  | 05:22:15 STU-8829 Phone (50)| +--------------------+ +----------------------+ |
  | 05:21:04 STU-4412 Yaw > 28° | | STU-8829 (Alex C.) | | STU-4412 (Priya S.)  | |
  | 05:19:30 STU-1102 Mic Alert | | [Live Snapshot]    | | [Live Snapshot]      | |
  |                             | | Points: 50 [WARN 1]| | Points: 25 [AT RISK] | |
  | [FILTER ROSTER]             | +--------------------+ +----------------------+ |
  | [All] [At Risk] [Disqual]   | +--------------------+ +----------------------+ |
  | Sort: Highest Strike Points | | STU-9921 (John D.) | | STU-1024 (Sara M.)   | |
  |                             | | Points: 0 [OK]     | | Points: 0 [OK]       | |
  +-----------------------------+----------------------+------------------------+
  ```

### Screen 2: Incident Review Modal (`<EvidenceViewerModal />`)
- Accessible by clicking any candidate card or alert item.
- Displays full-resolution watermarked screenshot, red bounding box, Faster-Whisper audio playback button, and one-click `[Dismiss]` or `[Confirm]` buttons.
