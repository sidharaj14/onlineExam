# AI-Powered Secure Online Examination & Proctoring System
## Engineering Documentation & Architecture Blueprint

> **College Hackathon Master Blueprint**  
> **Status**: Architecture & Specification Phase Complete  
> **Target Delivery**: Fully functional end-to-end demonstrable prototype (Milestones M1–M15)

---

## 1. Project Overview & Problem Statement

Conducting academic examinations remotely creates significant vulnerabilities: unauthorized physical aids (smartphones, calculators), proxy test-takers, external human assistance, and out-of-frame collaboration. Traditional solutions either rely on intrusive kernel lockdowns that fail to detect physical external devices or depend on synchronous human invigilation that causes severe cognitive fatigue and high costs.

This project delivers an **AI-Powered Secure Online Examination & Proctoring System** featuring an automated, continuous, multimodal proctoring pipeline:
1. **Biometric Authentication**: Pre-exam identity matching via deep metric facial embeddings.
2. **Continuous Edge Vision**: In-browser face presence, multi-face counts, 3D head pose estimation (Pitch/Yaw/Roll), and eye gaze tracking at 30 FPS via WebAssembly.
3. **Contraband Detection**: Server-side deep learning detection of prohibited physical devices (smartphones, laptops, books) via YOLOv8-nano.
4. **Acoustic Intelligence**: Real-time voice activity detection, Faster-Whisper speech-to-text, and suspicious keyword spotting.
5. **Multi-Stage Violation Engine**: 8-stage verification pipeline with temporal validation windows, strike points, and graduated warnings to eliminate false positives.
6. **Forensic Evidence & Auditing**: Watermarked screenshots and audio snippets with SHA-256 cryptographic hashes for non-repudiation.
7. **Dual Experience Portals**: Clean, accessible Student Exam Interface + Real-Time WebSocket-Powered Admin Invigilation Console.

---

## 2. Architecture & Technology Summary

- **Hybrid Edge-Server Model**: High-frequency facial geometry tracking (MediaPipe Face Mesh) executes directly on the client's browser, offloading 95% of video compute and protecting student privacy. Heavy tasks (biometric embedding distance, YOLOv8n object detection, Faster-Whisper STT) run asynchronously on the server.
- **Frontend**: React 18 / 19, Vite, TypeScript, Tailwind CSS, Zustand, Lucide React.
- **Backend**: Python 3.11+, FastAPI, Uvicorn, WebSockets, Pydantic v2.
- **Database**: SQLite (WAL mode) with SQLAlchemy 2.0 Async ORM (zero-config, portable; 100% swappable to PostgreSQL).
- **AI Models**:
  - *Face Mesh & Gaze*: MediaPipe Vision Wasm Tasks
  - *Face Verification*: InsightFace / face_recognition
  - *Object Detection*: Ultralytics YOLOv8-nano (COCO pre-trained)
  - *Speech Recognition*: Faster-Whisper (`tiny.en` INT8)
- **Evidence Storage**: Local filesystem repository partitioned by exam and student ID with SHA-256 checksums.

---

## 3. Complete Documentation Map

| Document | Title | Focus & Core Content |
| :--- | :--- | :--- |
| **[01](01-problem-statement-analysis.md)** | [Problem Statement Analysis](01-problem-statement-analysis.md) | Problem overview, challenges, target users, explicit/implicit requirements, constraints, assumptions, and scope. |
| **[02](02-product-requirements.md)** | [Product Requirements Document](02-product-requirements.md) | Personas, student/admin workflows, feature catalogue, user stories, acceptance criteria, and formal FR/NFR IDs. |
| **[03](03-functional-specification.md)** | [Functional Specification](03-functional-specification.md) | Detailed specifications for all 18 major modules: inputs, processing, outputs, failure modes, and acceptance criteria. |
| **[04](04-system-architecture.md)** | [System Architecture](04-system-architecture.md) | Multi-tier architecture, data flows, and 6 Mermaid diagrams (System, Student Flow, AI Pipeline, Violation Lifecycle, Evidence Lifecycle, Admin Flow). |
| **[05](05-technology-stack.md)** | [Technology Stack Evaluation](05-technology-stack.md) | Evaluation matrix, justifications, pros/cons, and hackathon feasibility assessments for all components. |
| **[06](06-ai-ml-architecture.md)** | [AI/ML Architecture](06-ai-ml-architecture.md) | Face detection, 3D head pose math (solvePnP), eye gaze ratio, YOLOv8n pipeline, Faster-Whisper, and unified event schema. |
| **[07](07-violation-engine.md)** | [Proctoring & Violation Engine](07-violation-engine.md) | 8-stage verification pipeline, violation taxonomy, severity tiers, strike point scoring, temporal filters, and cooldowns. |
| **[08](08-evidence-and-audit.md)** | [Evidence & Audit System](08-evidence-and-audit.md) | Screenshot watermarking, audio clipping, SHA-256 non-repudiation, storage layout, and administrative forensic review. |
| **[09](09-database-design.md)** | [Database Design & Schemas](09-database-design.md) | Relational schema definitions, 15 entity tables, indexes, constraints, and complete Mermaid ER Diagram. |
| **[10](10-api-specification.md)** | [API Specification](10-api-specification.md) | RESTful endpoints, request/response JSON payloads, status codes, and bidirectional WebSocket telemetry protocols. |
| **[11](11-frontend-architecture.md)** | [Frontend Architecture](11-frontend-architecture.md) | React + Vite architecture, directory layout, Zustand state stores, hooks, services, and wireframe layouts for all 9 screens. |
| **[12](12-backend-architecture.md)** | [Backend Architecture](12-backend-architecture.md) | FastAPI modular server structure, routers, services, async worker threadpools, and error-handling middleware. |
| **[13](13-security-and-privacy.md)** | [Security & Privacy](13-security-and-privacy.md) | Threat model, JWT security, data minimization, consent flows, ephemeral signed URLs, and secure deletion strategy. |
| **[14](14-testing-strategy.md)** | [Testing Strategy & QA](14-testing-strategy.md) | Testing pyramid, automated commands, and 20 exhaustive proctoring scenario scripts with acceptance criteria. |
| **[15](15-edge-cases.md)** | [Edge Cases & Recovery](15-edge-cases.md) | Fail-safe recovery for camera drops, poor lighting, occlusions, network dropouts, browser refreshes, and crashes. |
| **[16](16-development-roadmap.md)** | [Development Roadmap](16-development-roadmap.md) | Sequential 15-milestone roadmap (M1 to M15) with dependencies, files expected, acceptance criteria, and risks. |
| **[17](17-development-rules.md)** | [Development Rules & Guardrails](17-development-rules.md) | Mandatory coding rules for developers and AI assistants, contract sync rules, and architectural boundaries. |
| **[18](18-demo-plan.md)** | [Hackathon Demonstration Plan](18-demo-plan.md) | Minute-by-minute 7-minute live presentation script, hardware configuration, controlled triggers, and judging narrative. |
| **[19](19-mvp-vs-advanced.md)** | [Feature Prioritization Matrix](19-mvp-vs-advanced.md) | Objective matrix ranking MVP vs Advanced features by feasibility, reliability, complexity, and visual demo value. |
| **[20](20-glossary.md)** | [Project Glossary](20-glossary.md) | Comprehensive definitions of all 20+ domain concepts, mathematical parameters, and acronyms. |

---

## 4. Current Development Status

- [x] Problem statement decomposed and analyzed.
- [x] Product requirements and functional specifications defined.
- [x] Hybrid edge-server architecture and data flow diagrams approved.
- [x] Technology stack evaluated and locked (React + Vite + FastAPI + SQLite).
- [x] Database schemas and ER diagrams designed.
- [x] RESTful and WebSocket API contracts specified.
- [x] 8-stage violation engine and scoring taxonomy finalized.
- [x] Hackathon live demonstration plan scripted.
- [ ] **Ready for Milestone M1 (Foundation & Scaffolding)**.
