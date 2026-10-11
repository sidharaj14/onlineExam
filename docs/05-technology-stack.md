# 05 — Technology Stack Evaluation & Selection: AI-Powered Secure Online Examination & Proctoring System

This document provides a comparative evaluation of technology candidates for each tier of the proctoring platform, justifying final selections based on hackathon feasibility, developer velocity, real-time performance, and hardware constraints.

---

## 1. Overall Technology Stack Summary

| Subsystem | Selected Technology | Alternative Evaluated | Selection Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React 18 / 19 + Vite** | Next.js / Vue.js | Native SPA architecture, fastest HMR, zero SSR overhead for client camera/canvas Web APIs. |
| **Frontend Styling** | **Tailwind CSS + Lucide Icons** | MUI / Ant Design | Ultra-lean utility styling, full design control for high-density dashboards, zero heavy runtime CSS-in-JS. |
| **Backend Framework** | **Python FastAPI + Uvicorn** | Node.js (Express/NestJS) | Native Python ML/CV ecosystem interoperability, asynchronous async/await concurrency, native WebSocket support. |
| **Database** | **SQLite (SQLAlchemy Async)** | PostgreSQL / MongoDB | Zero-setup, portable, embedded file database perfect for hackathon live judging; seamless drop-in transition to Postgres via SQLAlchemy. |
| **Authentication** | **JWT (JSON Web Tokens) + bcrypt** | OAuth2 / Auth0 / NextAuth | Self-contained, stateless, zero third-party cloud dependencies, offline/local network demonstration capability. |
| **Client Edge CV** | **MediaPipe Face Mesh (Wasm/JS)** | TensorFlow.js FaceLandmarks | Sub-millisecond 468 3D landmark detection, WebAssembly optimized, native Iris tracking with zero server bandwidth load. |
| **Face Verification** | **InsightFace / face_recognition** | AWS Rekognition / Face++ | Open-source, local execution, 128-d / 512-d embedding generation with cosine distance scoring; zero cloud billing. |
| **Object Detection** | **Ultralytics YOLOv8-nano (PyTorch/ONNX)**| COCO-SSD (TFJS) | State-of-the-art accuracy on small objects (smartphones, books), sub-100ms CPU inference, pre-trained on COCO dataset. |
| **Speech-to-Text** | **Faster-Whisper (tiny.en)** | Web Speech API / OpenAI API | Deterministic cross-browser local speech transcription, CTranslate2 quantization, runs fast on standard CPU, privacy preserving. |
| **Voice Detection** | **WebRTC VAD / Web Audio API RMS**| Silero VAD | Low-overhead vocal energy detection in browser, prevents sending empty audio chunks to STT model. |
| **Realtime Channel** | **Native WebSockets (ws/FastAPI)** | Socket.io / Pusher | Lean standard protocol, minimal connection overhead, low-latency telemetry transmission. |
| **Media Storage** | **Local Structured Filesystem** | AWS S3 / MinIO | Direct filesystem writes with SHA-256 hash indexing; eliminates cloud credential issues during hackathon evaluations. |

---

## 2. Detailed Evaluation by Subsystem

### 2.1. Frontend Framework: React + Vite
- **Why Needed**: Powers the dual user experiences (Student Examination Interface and Admin Command Center) requiring high-frequency DOM updates and smooth Canvas/MediaStream rendering.
- **Advantages**:
  - Blazing-fast Hot Module Replacement (HMR) powered by Vite's native ES modules.
  - Full access to browser Web APIs (`navigator.mediaDevices`, `AudioContext`, `HTMLCanvasElement`, `FullScreen API`).
  - Huge ecosystem of open-source React UI components and state management libraries.
- **Limitations**: Requires careful state isolation to prevent unnecessary re-renders during 30 FPS video canvas loops.
- **Hackathon Feasibility**: Extremely high. Starts in $< 300\text{ms}$ with zero bundler friction.
- **Lifecycle Placement**: **MVP**.

---

### 2.2. Backend Framework: Python FastAPI
- **Why Needed**: Serves RESTful endpoints, manages persistent WebSockets, coordinates the violation engine, and directly interfaces with PyTorch/CV2 AI libraries.
- **Why Node.js Was Deprioritized**: Running Python-based CV/ML models (YOLO, InsightFace, Whisper) from Node.js requires spawning slow child processes or maintaining complex inter-process RPC/gRPC bridges, introducing failure points and deployment complexity.
- **Advantages**:
  - Built on Starlette and Pydantic v2; delivers near-Go/Node performance for async endpoints.
  - Automatic interactive Swagger/OpenAPI documentation (`/docs`).
  - Asynchronous event loop natively integrates with WebSockets and background processing tasks.
- **Limitations**: GIL (Global Interpreter Lock) for heavy CPU-bound tasks (mitigated by running AI inference in background executor threads or separate worker processes).
- **Hackathon Feasibility**: Outstanding. Easy single-command deployment via `uvicorn main:app --reload`.
- **Lifecycle Placement**: **MVP**.

---

### 2.3. Database & ORM: SQLite + SQLAlchemy Async
- **Why Needed**: Persists user profiles, exams, question banks, candidate answers, proctoring sessions, violation logs, and evidence references.
- **Evaluation vs PostgreSQL**:
  - PostgreSQL is production-grade but introduces Docker or host installation dependencies that can break during quick hackathon laptop switches or live judge evaluations.
  - SQLite with WAL (Write-Ahead Logging) mode handles hundreds of concurrent reads and serialized writes without installation friction.
- **ORM Choice**: SQLAlchemy 2.0 with `aiosqlite`. Writing pure SQLAlchemy models allows switching the connection string to `postgresql+asyncpg://...` in 30 seconds if production deployment is requested.
- **Limitations**: Limited write concurrency in high-load multi-server distributed setups (not an issue for single-instance hackathon demonstrations).
- **Hackathon Feasibility**: 100% turnkey. Single `.db` file created automatically upon launch.
- **Lifecycle Placement**: **MVP** (SQLite) $\rightarrow$ **Advanced** (PostgreSQL).

---

### 2.4. Computer Vision: MediaPipe Face Mesh (Edge)
- **Why Needed**: Tracks face presence, multi-face counts, head orientation, and gaze shifts at 30 FPS in real time.
- **Advantages**:
  - Leverages WebAssembly and WebGL acceleration inside the user's browser.
  - Extracts 468 3D landmark points and 10 iris landmark points with sub-15ms inference latency.
  - Offloads 95% of video compute from the server, meaning the hackathon backend does not need costly GPUs to support dozens of concurrent candidates.
- **Limitations**: Older browsers or laptops without hardware WebGL acceleration may experience lower frame rates (mitigated by throttling detection to 15 FPS).
- **Hackathon Feasibility**: Maximum. Google's `@mediapipe/tasks-vision` loads directly from npm.
- **Lifecycle Placement**: **MVP**.

---

### 2.5. Face Verification: InsightFace / face_recognition
- **Why Needed**: Generates facial identity embeddings during student onboarding and matches live selfies during pre-exam verification.
- **Advantages**:
  - Standard deep metric learning (ArcFace / ResNet); produces compact 128-d or 512-d feature vectors.
  - L2 normalized embeddings allow cosine similarity computation in microseconds ($A \cdot B$).
  - High resilience to minor facial angle and lighting shifts compared to primitive Haar cascades.
- **Limitations**: Requires dlib or ONNX runtime backend; initial model download is ~100MB.
- **Hackathon Feasibility**: High. Runs inference in ~300ms on CPU for a single frame.
- **Lifecycle Placement**: **MVP**.

---

### 2.6. Prohibited Object Detection: Ultralytics YOLOv8-nano
- **Why Needed**: Identifies physical contraband (smartphones, laptops, books) brought into camera view.
- **Evaluation vs In-Browser TFJS COCO-SSD**:
  - TFJS COCO-SSD in-browser is often jittery and misses smartphones angled away or partially obscured.
  - YOLOv8-nano (`yolov8n.pt`, 6.2MB) running on backend sampled frames provides vastly superior mean Average Precision (mAP) with minimal CPU overhead (~80ms per frame).
- **Advantages**: Pre-trained on 80 COCO classes including `cell phone` (Class 67), `laptop` (Class 63), and `book` (Class 73).
- **Limitations**: Does not natively detect micro-objects like `smartwatch` or `earbuds` without fine-tuning (addressed in Advanced Roadmap).
- **Hackathon Feasibility**: Very high. Installs via `pip install ultralytics`.
- **Lifecycle Placement**: **MVP** (COCO objects) $\rightarrow$ **Advanced** (Custom Fine-Tuning for Calculators/Earbuds).

---

### 2.7. Speech-to-Text: Faster-Whisper
- **Why Needed**: Transcribes acoustic signals into text to detect vocal questions, reading aloud, or external human prompting.
- **Evaluation vs Native Browser Web Speech API**:
  - Web Speech API (`webkitSpeechRecognition`) requires an active internet connection to send audio to Google's proprietary cloud servers, is notoriously unreliable across non-Chrome browsers, and randomly drops connection after 30 seconds of silence.
  - Faster-Whisper runs 100% locally via CTranslate2, consumes ~150MB RAM with `tiny.en`, and operates offline deterministically.
- **Advantages**: Transcribes 4-second audio snippets in ~400ms on modern multicore CPUs.
- **Limitations**: May struggle with heavy regional accents or whisper vocalizations at low volume.
- **Hackathon Feasibility**: High. Self-contained local Python library.
- **Lifecycle Placement**: **MVP**.

---

### 2.8. Acoustic Activity: Web Audio API & RMS Energy
- **Why Needed**: Serves as a pre-filter so Whisper is only invoked when human vocalization or significant sound occurs.
- **Advantages**: Native browser standard; zero external dependencies; calculates RMS energy in a lightweight AudioWorklet.
- **Hackathon Feasibility**: Instant. Built into all modern browsers.
- **Lifecycle Placement**: **MVP**.

---

### 2.9. Real-Time Communication: Native WebSockets
- **Why Needed**: Provides a low-overhead, persistent bidirectional conduit for client telemetry JSON and immediate server-to-client violation alerts.
- **Evaluation vs Socket.io**: Native WebSockets require zero third-party client libraries, have zero handshake overhead, and integrate cleanly with FastAPI's async websocket handler.
- **Hackathon Feasibility**: Maximum. Zero library configuration required.
- **Lifecycle Placement**: **MVP**.

---

### 2.10. Evidence & Storage: Local File Directory with SHA-256
- **Why Needed**: Archives watermarked violation screenshots and audio snippets for administrative review.
- **Evaluation vs Cloud Object Storage (AWS S3)**: S3 requires cloud credentials, active billing, and network internet availability. A local `/storage/evidence` directory ensures the demo operates seamlessly even in an offline hackathon auditorium.
- **Security Mechanism**: All saved media files are hashed with SHA-256; the digest is stored in the database to detect tampering.
- **Hackathon Feasibility**: 100%. Instant setup.
- **Lifecycle Placement**: **MVP** (Local storage) $\rightarrow$ **Advanced** (S3/MinIO compatible object store).
