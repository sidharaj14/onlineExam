
# 🛡️ AI-Powered Secure Online Examination & Proctoring System

An intelligent online examination platform designed to improve the security, integrity, and reliability of remote examinations using computer vision, automated violation monitoring, and a web-based examination management system.

The platform combines a modern React frontend with a FastAPI backend and OpenCV-based proctoring to monitor examination sessions, detect suspicious activities, record violations, and support secure online assessments.

## ✨ Key Features

### 🔐 Authentication & User Management
- Student and teacher authentication.
- Email OTP verification, where configured.
- Role-based access and dashboards.
- Student profile and examination history.

### 📝 Online Examination System
- Web-based examination interface.
- Exam and attempt management.
- Question navigation and answer submission.
- Examination attempt tracking.
- Backend APIs for managing examination workflows.

### 👁️ AI-Powered Proctoring
- Face detection during examination sessions.
- Monitoring for face absence and multiple-face scenarios, where configured.
- Phone detection using a computer-vision object detection pipeline.
- Tab-switch and page-visibility monitoring.
- Automated violation tracking.
- Configurable violation thresholds and warning logic.

### 🚨 Violation Management
- Records detected examination violations.
- Tracks violation counts and timestamps.
- Supports configurable strike-based examination termination.
- Collects evidence for supported violation events.
- Helps administrators review examination integrity.

### 📊 Dashboards & Reporting
- Student examination dashboard.
- Teacher or administrator workflows, depending on assigned permissions.
- Examination attempt history.
- Violation and examination records.

## 🧠 How It Works

1. **Authentication:** The student signs in using the configured authentication flow.
2. **Exam Selection:** The student accesses an available examination.
3. **Exam Initialization:** The backend creates or retrieves the relevant examination attempt.
4. **Proctoring:** The frontend captures examination-related monitoring data and submits frames to the backend when enabled.
5. **Detection:** The computer-vision pipeline processes frames to identify configured faces, objects, and suspicious conditions.
6. **Violation Processing:** The violation engine evaluates detection results and applies configured rules.
7. **Evidence & Logging:** Supported violations are recorded, with evidence collected according to the configured implementation.
8. **Exam Completion:** The system records the attempt and its available results.

## 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │       Student        │
                    │   Teacher / Admin    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React + Vite UI    │
                    │  Exam & Dashboards   │
                    └──────────┬───────────┘
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │    FastAPI Backend   │
                    │ Auth, Exams, Records │
                    └───────┬──────────────┘
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
       ┌──────────────────┐  ┌──────────────────┐
       │ Computer Vision  │  │ Database Layer   │
       │ OpenCV & Models  │  │ Users, Attempts  │
       │ Detection Rules  │  │ Violations       │
       └────────┬─────────┘  └──────────────────┘
                │
                ▼
       ┌──────────────────┐
       │ Violation Engine │
       │ Evidence Logging │
       └──────────────────┘
```

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI |
| Computer Vision | OpenCV |
| Object Detection | OpenCV DNN and configured detection models |
| API Communication | REST APIs |
| Database | Configured database with application data models |
| Testing | Pytest, frontend build checks |
| Version Control | Git and GitHub |

*The exact database engine, detection model, and other dependencies depend on the project's current configuration.*

## 📁 Project Structure

```text
onlineExam/
├── backend/
│   ├── app/
│   │   ├── proctoring/
│   │   │   ├── config.py
│   │   │   ├── frame_processor.py
│   │   │   ├── face_detector.py
│   │   │   ├── object_detector.py
│   │   │   ├── evidence.py
│   │   │   └── violation_engine.py
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── .gitignore
└── README.md
```

*Some filenames or directories may differ depending on the final repository contents.*

## ⚙️ Prerequisites

Install the following before running the project:

- Python 3.11 or another version supported by the backend dependencies.
- Node.js and npm.
- Git.
- The database required by your application configuration.
- Any model weights or configuration files required by the proctoring module.

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/sidharaj14/onlineExam.git
cd onlineExam
```

### 2. Set up the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

On Windows, activate the environment using:

```powershell
venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Configure the required environment variables and database settings according to your backend configuration. Use a local `.env` file if supported, and never commit real credentials.

Start the backend from the `backend` directory:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend API:

`http://localhost:8000`

Interactive API documentation:

`http://localhost:8000/docs`

### 3. Set up the frontend

Open a second terminal:

```bash
cd onlineExam/frontend
npm install
npm run dev
```

Open the local development URL printed by Vite, commonly:

`http://localhost:5173`

If the frontend uses a configured API base URL, ensure it points to the running backend.

### 4. Configure the proctoring system

Before testing proctoring, verify that:

- Required model weights and configuration files are available.
- Camera permission is granted in the browser.
- The frontend can communicate with the backend.
- The configured detection thresholds and violation rules are appropriate.
- Evidence storage paths and database configuration are valid.

## 🧪 Testing

### Backend tests

From the backend directory, activate the virtual environment and run:

```bash
PYTHONPATH=. pytest tests -v
```

### Frontend production build

From the frontend directory, run:

```bash
npm run build
```

Passing automated tests and completing a frontend build do not, by themselves, guarantee reliable live proctoring. Test face detection, phone detection, tab switching, evidence collection, and exam termination in the actual browser environment.

## 🔒 Security & Privacy

This project is intended to support secure remote examinations. Before deploying it for real examinations, review the following:

- Store passwords securely using an appropriate password-hashing algorithm.
- Protect OTPs, session tokens, and authentication endpoints.
- Keep API keys, SMTP credentials, database passwords, and secret keys out of version control.
- Validate and authorize all examination and administrative API requests.
- Restrict access to examination evidence and personal data.
- Define retention and deletion policies for images and other monitoring evidence.
- Inform students about camera use, monitoring, and data collection.
- Test the system against false positives, poor lighting, varied camera quality, and network failures.

Automated detections should be treated as indicators for review rather than conclusive proof of misconduct.

## ⚠️ Current Limitations

Detection accuracy can vary with lighting, camera position, image quality, and model performance. Browser-based tab monitoring also has limitations and should not be treated as equivalent to a fully locked-down examination device.

The implemented features depend on the project's active configuration, and live performance should be validated before high-stakes use.

## 🔮 Future Enhancements

- Head-pose and eye-gaze analysis.
- Speech activity and multiple-speaker detection.
- Improved object detection and temporal tracking.

# pytest cache directory #

This directory contains data from the pytest's cache plugin,
which provides the `--lf` and `--ff` options, as well as the `cache` fixture.

**Do not** commit this to version control.

See [the docs](https://docs.pytest.org/en/stable/how-to/cache.html) for more information.