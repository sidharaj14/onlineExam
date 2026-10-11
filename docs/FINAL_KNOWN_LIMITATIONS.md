# ExamGuard AI — Known Limitations & Future Roadmap

## 1. Known Architectural & Operational Limitations

### 1.1 Single-Server Embedded SQLite Database
- **Current Behavior**: Uses SQLite (`onlineexam.db`) which operates synchronously with a single-file lock.
- **Limitation**: While ideal for local demo, single-institution setups, and fast hackathon evaluation ($< 200$ concurrent candidates), SQLite has concurrency bottlenecks under massive horizontal scaling ($> 10,000$ concurrent writes).
- **Roadmap Resolution**: Migrate database engine to PostgreSQL with PgBouncer connection pooling and read replicas.

### 1.2 Edge-Only Heuristic Vision Analysis
- **Current Behavior**: Real-time continuous vision heuristics execute on the client browser canvas to minimize server bandwidth and API latency.
- **Limitation**: Machine capabilities vary between candidate machines; low-end laptops with software rendering may drop frame rates. High ambient backlighting (e.g. halogen bulbs positioned directly behind candidate head) can create edge artifacts.
- **Roadmap Resolution**: Implement a lightweight server-side WebAssembly / ONNX Runtime pipeline with facial landmark regression (MediaPipe Face Mesh) alongside client-side heuristics.

### 1.3 Browser OS-Level Boundaries
- **Current Behavior**: Uses HTML5 Page Visibility API and Fullscreen API to detect window blurs, tab switching, and fullscreen exits.
- **Limitation**: Browsers cannot directly inspect OS taskbar activity, secondary monitors that do not trigger blur, or physical hardware splitters.
- **Roadmap Resolution**: Provide an optional Electron-based or Safe Exam Browser (SEB) desktop client for ultra-secure certifications requiring OS process isolation.

### 1.4 SMTP Relay Dependency
- **Current Behavior**: Dispatches real OTP emails through Gmail SMTP.
- **Limitation**: Depends on active external internet connectivity and valid Google App Password credentials. Free Gmail accounts impose a daily sending quota (500 emails/day).
- **Roadmap Resolution**: Integrate enterprise transactional email delivery providers (e.g., AWS SES, Postmark, or SendGrid) with webhook delivery receipts and SMS fallback.
