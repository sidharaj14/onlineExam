# Judge Q&A Preparation & Technical Defense Guide

**Project Title**: AI-Powered Secure Online Examination & Proctoring System  
**Audience**: Hackathon Panel Judges, Computer Vision Researchers, Invigilation Faculty  

---

## Technical Questions & Strategic Responses

### Q1: "How do you detect mobile phones without generating false positives when candidates raise their hands or hold pens?"
> **Answer**:  
> "We combine three distinct layers of filtering:
> 1. **COCO Class Specificity**: We use Darknet YOLOv4-tiny trained on 80 COCO classes, specifically isolating Class 67 (`cell phone`). Hand regions or person body parts (Class 0) are explicitly ignored by the network.
> 2. **Spatial Context Filtering**: Bounding boxes are filtered by aspect ratio ($0.30 \le AR \le 3.2$), minimum bounding area ($0.5\%$ to $35\%$ of frame area), and face region overlap ($<45\%$).
> 3. **Temporal Persistence**: A single noisy frame will never issue a strike. The device must be continuously present for 1.5 seconds before an official strike is recorded."

---

### Q2: "How does your system handle tab-switching when video frames are sampled only every 500ms?"
> **Answer**:  
> "We do not use video frame sampling to detect tab switching. Tab switching is a browser lifecycle event, not a vision task. We attach an event listener to the HTML5 Page Visibility API (`document.addEventListener('visibilitychange', ...)`). The moment the candidate switches tabs, `document.visibilityState` becomes `'hidden'`, and the browser fires the event synchronously in under 50 milliseconds."

---

### Q3: "What happens if a candidate loses internet connectivity for a few seconds during the exam?"
> **Answer**:  
> "Our frontend state architecture is resilient:
> 1. Selected answers are cached locally in component state immediately upon click.
> 2. The autosave service handles retries gracefully without resetting candidate progress.
> 3. If a frame submission fails due to a network blip, the proctoring loop catches the exception and falls back to client-side detection without aborting the exam."

---

### Q4: "How do you ensure candidate privacy during webcam proctoring?"
> **Answer**:  
> "Privacy is engineered by design:
> 1. Raw video streams are processed in memory and never stored continuously on disk.
> 2. Bounding boxes and frame blobs are processed locally on the server without sending candidate feeds to third-party APIs.
> 3. Only timestamped 320x240 JPEG evidence snapshots of confirmed strikes are archived for invigilator audit compliance."

---

### Q5: "How does the system prevent strike counter flooding if a student leaves a phone visible for 30 seconds?"
> **Answer**:  
> "We implement a 10-second strike cooldown mechanism (`lastViolationTimeRef` / `lastTabSwitchTimeRef`). Once a strike is issued, subsequent detections within 10 seconds are recorded as part of the same continuous event rather than inflating the strike counter."

---

### Q6: "Can a student open Developer Tools (F12 or Ctrl+Shift+I) or use Right-Click to view answer keys?"
> **Answer**:  
> "No.
> 1. Frontend shortcuts (`F12`, `Ctrl+Shift+I`, `Cmd+Option+I`, `Ctrl+U`, `Cmd+C/V`) and right-click context menus are completely blocked by event interceptors.
> 2. More importantly, answer keys are **never sent to the client browser**. The `/exams/attempts/{attempt_id}` API endpoint strips out `correct_answer` fields completely. Grading occurs exclusively on the backend database tier during final submission."
