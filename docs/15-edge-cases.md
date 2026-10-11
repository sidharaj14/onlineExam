# 15 — Edge Cases, Environmental Anomalies & Fail-Safe Recovery

This document specifies system behaviors, fallback protocols, and recovery strategies for environmental edge cases, hardware disruptions, network volatility, and algorithmic uncertainties.

---

## 1. Fail-Safe Architectural Tenet

> [!IMPORTANT]
> **Core Tenet: Fail Safely, Never Silently Drop Integrity**:
> In the event of hardware failure, unexpected crashes, or network loss, the system must fail in a deterministic, observable state. It must **never** silently allow an unmonitored candidate to continue answering questions, nor should it unfairly fail a student due to a temporary Wi-Fi blip.

---

## 2. Hardware & Environmental Edge Cases

### 2.1. Physical Camera Disconnection
- **Trigger**: Webcam cable unplugged or USB hub power failure during active examination.
- **Detection**: `MediaStreamTrack.onended` event fires; frame processing loop receives empty buffers.
- **System Action**:
  1. Immediately pause the exam countdown and blur question text with a warning modal: *"Webcam Disconnected: Please reconnect your camera within 60 seconds to resume."*
  2. Disallow question interaction.
  3. Emit a `HARDWARE_DISCONNECT` alert over WebSocket to the invigilator dashboard.
  4. If reconnected within 60 seconds, re-verify facial presence and unpause exam. If disconnected $> 60\text{s}$, transition attempt to `INTERRUPTED_PENDING_REVIEW`.

### 2.2. Microphone Disconnection or Mute
- **Trigger**: Built-in microphone disabled or external headset disconnected.
- **Detection**: Web Audio API `AudioContext.state` changes to `'suspended'` or RMS energy remains absolute zero ($0.0000$) across 10 consecutive seconds.
- **System Action**: Display banner toast: *"Microphone signal lost. Please check input devices."* Log incident in telemetry without issuing immediate strike points unless uncorrected.

### 2.3. Low Lighting & Heavy Backlighting
- **Trigger**: Candidate sitting in front of a bright sunlit window or in a dimly lit room causing facial silhouette.
- **Detection**: Mean pixel luminance $Y = 0.299R + 0.587G + 0.114B < 35$ (too dark) or $> 230$ (overexposed); MediaPipe landmark tracking confidence drops below $0.50$.
- **System Action**: Display non-punitive UI overlay: *"Poor lighting detected. Please face a light source so your face is clearly visible."* Suppresses false absence violations for 15 seconds while candidate adjusts lighting.

### 2.4. Face Partially Obscured (Hand on Chin / Scratching Nose)
- **Trigger**: Natural resting posture (e.g. resting chin in hand) temporarily occluding lower mouth landmarks.
- **Detection**: Nose and eye landmarks are tracked with high confidence ($> 0.85$), but mouth landmarks are missing.
- **System Action**: The system relies on the remaining 400+ landmarks to compute head pose. Does **NOT** trigger `FACE_ABSENT` as long as eyes and nose remain identified.

### 2.5. Bystander Temporarily Walking in Background
- **Trigger**: A family member or roommate briefly walks past in the background for 0.8 seconds.
- **Detection**: Second face detected, but duration is $800\text{ms} < 1000\text{ms}$ multi-face threshold.
- **System Action**: Multi-face accumulator resets without generating a violation. If the person lingers $> 1.0\text{s}$, a violation is recorded with visual proof.

### 2.6. False Object Detection (Holding a Dark Coffee Mug or Wallet)
- **Trigger**: Candidate lifts a black ceramic coffee mug that YOLOv8n classifies as `cell phone` with confidence 0.66.
- **Detection**: Temporal filter requires consecutive frame confirmation.
- **System Action**:
  1. If candidate immediately lowers mug ($< 1.5\text{s}$), event buffer clears.
  2. If candidate holds mug up for 4 seconds, a violation is recorded, but the **Admin Review Console** displays the watermarked screenshot. Dr. Rao inspects the photo, sees it is a coffee mug, and clicks **[Dismiss Violation]**, resetting the strike points with zero student penalty.

---

## 3. Network, Browser & System Interruptions

### 3.1. Transient Network Dropout (Wi-Fi Hiccup)
- **Trigger**: Student Wi-Fi drops for 10–30 seconds.
- **Handling**:
  1. React Zustand store flags `isOffline = true`.
  2. Selected answers are stored in local browser `IndexedDB` / `localStorage`.
  3. WebSocket client attempts automated reconnection every 2.0 seconds with exponential backoff.
  4. Once reconnected, the client flushes all buffered answers and queued telemetry packets.

### 3.2. Accidental Browser Refresh (`F5` or `Cmd+R`)
- **Trigger**: Candidate accidentally refreshes the browser tab.
- **Handling**:
  1. `beforeunload` event displays browser confirmation: *"An examination is in progress. Are you sure you want to reload?"*
  2. If candidate reloads, the app re-mounts, extracts token from storage, fetches active attempt state from `GET /api/v1/attempts/current`, restores exact question answers, and re-initializes MediaPipe within 3 seconds.

### 3.3. Laptop Sleep / Lid Closed
- **Trigger**: Candidate closes laptop lid or system goes to sleep due to low battery.
- **Detection**: Heartbeat stops; Page Visibility API records `hidden` event; system time jumps abruptly on wake.
- **System Action**: On wake, the system requires an immediate re-verification of the candidate's face before unlocking questions, logging the gap duration in `audit_logs`.

---

## 4. Subsystem & Service Failures

### 4.1. In-Browser MediaPipe WebAssembly Failure
- **Trigger**: GPU WebGL context crashes on low-spec laptop.
- **Fallback**: System automatically restarts FaceMesh in CPU WebAssembly mode (Canvas 2D fallback); alerts user if hardware cannot sustain minimum 10 FPS.

### 4.2. Faster-Whisper Inference Timeout
- **Trigger**: Heavy acoustic burst causes STT threadpool saturation.
- **Handling**: Worker drops stale chunks older than 8 seconds; prioritizes latest voice activity chunk; logs warning in backend metrics.

### 4.3. Backend Storage Full or Unreachable
- **Trigger**: Disk storage for evidence screenshots reaches 98% capacity.
- **Handling**: Backend logs critical alert to sysadmin; stores compressed metadata and cryptographic hash in SQLite database; temporarily degrades screenshot quality from 85% to 50% to save storage until space is cleared.
