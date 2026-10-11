# OpenCV Computer-Vision Proctoring Architecture

## Overview
This document details the real OpenCV-based computer-vision proctoring pipeline integrated into the **AI-Powered Secure Online Examination & Proctoring System**.

OpenCV is used directly in the backend for image decoding, preprocessing, face monitoring, bounding box annotation, evidence frame encoding, and prohibited object recognition.

---

## 1. Why OpenCV is Used
- **Server-Side Computer Vision**: OpenCV provides robust, low-latency C++ optimized image processing capabilities directly in Python.
- **Preprocessing & Normalization**: Normalizes lighting, smooths high-frequency web camera noise, equalizes histograms, and converts color spaces (`cv2.cvtColor`, `cv2.equalizeHist`, `cv2.GaussianBlur`).
- **Evidence Annotation**: Draws bounding boxes (`cv2.rectangle`) and security metadata overlays (`cv2.putText`) directly onto evidence frames before persisting snapshot records.

---

## 2. Camera Architecture

```
Student Browser (React)
    ↓  navigator.mediaDevices.getUserMedia()
Camera Stream
    ↓  Canvas snapshot sampling (2 FPS / 500ms interval)
Base64 JPEG Frame
    ↓  POST /api/v1/exams/attempts/{attempt_id}/process-frame
FastAPI Backend
    ↓
OpenCV Proctoring Engine (cv2)
    ├── 1. Frame Processor (cv2.imdecode, cv2.cvtColor, cv2.equalizeHist)
    ├── 2. Face Detector (cv2.CascadeClassifier)
    ├── 3. Object Detector (cv2.dnn / ROI contour & aspect ratio analysis)
    ├── 4. Temporal Persistence Filter & Cooldown Manager
    └── 5. Evidence Capturer (cv2.rectangle, cv2.putText, cv2.imencode)
    ↓
Database Persistence (ExamAttempt, ProctoringViolation, SecurityAuditLog)
```

> [!IMPORTANT]
> The backend does NOT invoke `cv2.VideoCapture(0)`. The camera stream originates from the candidate's browser via HTML5 `getUserMedia()` and sampled frames are posted to FastAPI for backend computer-vision analysis.

---

## 3. Frame-Processing Pipeline
1. **Base64 Image Decoding**: `OpenCVFrameProcessor.decode_base64_frame()` uses `cv2.imdecode()` to convert incoming Base64 image payloads into OpenCV BGR numpy arrays.
2. **Dimension Standardizing**: Frames are resized to $320 \times 240$ using `cv2.resize()` for high FPS throughput.
3. **Color Space Conversion**: Converted to grayscale via `cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)`.
4. **Noise Reduction**: Smoothed with `cv2.GaussianBlur(gray, (3, 3), 0)`.
5. **Lighting Normalization**: Grayscale histogram is equalized using `cv2.equalizeHist()`.

---

## 4. Face Presence & Multi-Face Detection
- Uses `cv2.CascadeClassifier` loaded with OpenCV's `haarcascade_frontalface_default.xml` and `haarcascade_profileface.xml`.
- Performs real-time face counting:
  - `0 faces`: Candidate absent (`NO_FACE`).
  - `1 face`: Verified normal candidate presence.
  - `2+ faces`: Secondary person in camera radar (`MULTIPLE_FACES`).
- Deduplicates candidate boxes using Non-Maximum Suppression (NMS) to eliminate duplicate bounding boxes on the same face.

---

## 5. Object & Handheld Phone Detection
- **Model Loader & Downloader**: Implemented `ModelManager` (`backend/app/proctoring/models/model_manager.py`) which manages and loads MobileNet-SSD / COCO object detection models into `cv2.dnn`. If missing from disk, it automatically downloads official weights on initialization.
- **Class Mapping**: Maps object classes (`18` tvmonitor/screen, `20`, `67`/`77` cell phone, `5` compact object) to `PHONE_DETECTED`. Class `15` (`person`) and general hands are explicitly ignored to ensure hands alone NEVER trigger `PHONE_DETECTED`.
- **Spatial Context Validation**:
  - **Aspect Ratio Constraint**: $0.35 \le AR \le 2.8$ (valid for smartphones in portrait or landscape).
  - **Frame Area Constraint**: $0.8\% \le \text{area} \le 25\%$ (compact handheld object).
  - **Face Exclusion**: Excludes candidate's primary face region ($>50\%$ overlap).
- **Diagnostic Logging**: Logs model loading status, detected class indices, confidence scores, bounding boxes, and verdict per frame in development mode.

---

## 6. Temporal Persistence & False-Positive Prevention
To eliminate transient false alarms (such as momentary blinking, lighting blips, or single-frame drops):
- **Persistence Thresholds**:
  - `NO_FACE`: Required continuous absence $\ge 1.5$ seconds.
  - `MULTIPLE_FACES`: Required continuous secondary face presence $\ge 1.5$ seconds.
  - `PHONE_DETECTED`: Required continuous device presence $\ge 1.5$ seconds.
- **Cooldown Window**: A minimum 10-second strike cooldown (`VIOLATION_COOLDOWN_SECONDS`) prevents duplicate strike flooding for the same incident.
- **Timer Reset**: If a condition disappears before reaching the persistence threshold, the temporal timer is automatically reset.

---

## 7. Evidence Capture Pipeline
When a violation is confirmed:
1. `OpenCVEvidenceCapturer.annotate_evidence_frame()` takes the OpenCV BGR image.
2. Draws green bounding box around primary candidate face and red boxes around secondary faces or prohibited devices using `cv2.rectangle()`.
3. Overlays top banner bar with attempt ID, strike count (e.g. `STRIKE 1/3`), violation type, and UTC timestamp using `cv2.putText()`.
4. Encodes annotated image into Base64 JPEG format using `cv2.imencode()`.
5. Persists evidence URL in `ProctoringViolation` and `ExamAttempt.violations_json`.

---

## 8. Database & 3-Strike Integration
- Fully integrated into existing `ExamService.record_violation` engine.
- Tracks `violations_count`, updates `integrity_score`, appends to `violations_json`, and auto-terminates the examination on the 3rd confirmed strike.

---

## 9. Technical Honesty Disclaimer
> **Technical Note**: OpenCV is used for computer-vision frame processing, image preprocessing, face monitoring, bounding box annotation, and evidence frame capture. Dedicated object-detection models (OpenCV DNN / MobileNet) are used where prohibited-object detection is required.
