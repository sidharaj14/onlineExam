# 12 — Backend Architecture: FastAPI, Concurrency, Services & AI Workers

This document details the backend application structure, modular service layers, asynchronous concurrency patterns, WebSocket connection handling, and AI worker orchestration.

---

## 1. Backend Design Principles

1. **Strict Layered Separation**: Clean boundaries between HTTP Routers (controllers), Domain Business Services, Database Repositories, and Asynchronous AI Inference Workers.
2. **Asynchronous Non-Blocking I/O**: Native Python `async`/`await` for all network requests, database transactions via `aiosqlite`, and WebSocket broadcasts.
3. **Quarantined CPU Tasks**: CPU-bound operations (deep learning inference via YOLO and Whisper) are delegated to `concurrent.futures.ThreadPoolExecutor` to avoid blocking the `asyncio` event loop.
4. **Resilient Event Routing**: Real-time telemetry events from students are buffered and processed asynchronously without impacting database write throughput.

---

## 2. Directory Structure

```
backend/
├── app/
│   ├── main.py                     # Application entrypoint & lifespan events
│   ├── core/
│   │   ├── config.py               # Pydantic BaseSettings & env variables
│   │   ├── security.py             # Password hashing (bcrypt) & JWT handling
│   │   └── logging.py              # Structured JSON application logger
│   ├── db/
│   │   ├── session.py              # Async SQLAlchemy engine & session factory
│   │   ├── base.py                 # Declarative Base metadata
│   │   └── models/                 # SQLAlchemy 2.0 ORM models
│   │       ├── user.py
│   │       ├── exam.py
│   │       ├── attempt.py
│   │       ├── proctoring.py
│   │       └── evidence.py
│   ├── schemas/                    # Pydantic v2 validation schemas
│   │   ├── auth.py
│   │   ├── exam.py
│   │   ├── attempt.py
│   │   ├── telemetry.py
│   │   ├── violation.py
│   │   └── evidence.py
│   ├── api/
│   │   ├── deps.py                 # FastAPI dependency injection (get_db, get_current_user)
│   │   └── v1/
│   │       ├── router.py           # Master v1 API router
│   │       ├── endpoints/
│   │       │   ├── auth.py
│   │       │   ├── exams.py
│   │       │   ├── questions.py
│   │       │   ├── attempts.py
│   │       │   ├── proctoring.py
│   │       │   ├── evidence.py
│   │       │   ├── admin.py
│   │       │   └── reports.py
│   ├── websocket/
│   │   ├── connection_manager.py   # WebSocket connection hub & channel broadcaster
│   │   └── proctoring_ws.py        # Telemetry ingestion endpoint
│   ├── services/                   # Core business logic layer
│   │   ├── auth_service.py
│   │   ├── exam_service.py
│   │   ├── violation_engine.py     # 8-stage violation & escalation engine
│   │   ├── evidence_service.py     # SHA-256 calculation & file storage
│   │   ├── audit_service.py        # Append-only audit logger
│   │   └── report_service.py       # Scorecard & integrity timeline compiler
│   └── ai_workers/                 # Dedicated ML inference pipelines
│       ├── face_verifier.py        # InsightFace / FaceNet embedding matcher
│       ├── yolo_detector.py        # YOLOv8n object detection worker
│       └── whisper_transcriber.py  # Faster-Whisper STT & keyword spotter
├── storage/
│   └── evidence/                   # Partitioned media evidence repository
├── tests/
├── requirements.txt
└── uvicorn_config.py
```

---

## 3. Subsystem Architecture & Execution Flow

### 3.1. Layered Component Interaction

```
[ Incoming HTTP / WS Request ]
              |
              v
[ Middleware: CORS, RequestID, ErrorHandler, RateLimiter ]
              |
              v
[ API Routers (app/api/v1/endpoints/*.py) ]
              |
      (Dependency Injection: Token Auth & DB Session)
              |
              v
[ Domain Services (app/services/*.py) ]
              |
      +-------+-------------------------+
      |                                 |
      v                                 v
[ DB Repositories / ORM ]     [ AI Workers (Threaded) ]
(SQLAlchemy Async)            (YOLOv8n / Whisper)
      |                                 |
      v                                 v
[ SQLite / Postgres DB ]      [ Media Storage / Disk ]
```

---

## 4. Key Middleware & Security Handlers

### 4.1. Global Error Handling Middleware
Catches all unhandled domain and validation exceptions, sanitizes sensitive internal stack traces, and formats standardized JSON error responses:
```python
@app.exception_handler(CustomApiException)
async def custom_api_exception_handler(request: Request, exc: CustomApiException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "request_id": request.state.request_id
            }
        }
    )
```

### 4.2. JWT & RBAC Dependency (`deps.py`)
Enforces role-based permissions at the endpoint route definition:
```python
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    payload = decode_jwt_token(token)
    user = await db.get(User, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User session invalid")
    return user

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient institutional privileges")
        return current_user
    return role_checker
```

---

## 5. Real-Time WebSocket Connection Hub

The `ConnectionManager` manages persistent WebSockets across active candidates and subscribed admin invigilators:

```python
class ConnectionManager:
    def __init__(self):
        # attempt_id -> WebSocket connection
        self.candidate_connections: Dict[str, WebSocket] = {}
        # exam_id -> Set of Admin WebSockets
        self.admin_subscribers: Dict[str, Set[WebSocket]] = defaultdict(set)

    async def connect_candidate(self, attempt_id: str, websocket: WebSocket):
        await websocket.accept()
        self.candidate_connections[attempt_id] = websocket

    async def connect_admin(self, exam_id: str, websocket: WebSocket):
        await websocket.accept()
        self.admin_subscribers[exam_id].add(websocket)

    async def send_to_candidate(self, attempt_id: str, message: dict):
        if ws := self.candidate_connections.get(attempt_id):
            await ws.send_json(message)

    async def broadcast_to_admins(self, exam_id: str, message: dict):
        for ws in self.admin_subscribers.get(exam_id, []):
            await ws.send_json(message)
```

---

## 6. AI Inference Worker Management

To preserve responsiveness, the backend initializes models at startup (Lifespan context) and handles inference in isolated threadpools:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize models once during cold start
    app.state.executor = ThreadPoolExecutor(max_workers=4)
    app.state.yolo_model = YOLO("yolov8n.pt")
    app.state.whisper_model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
    yield
    # Graceful shutdown
    app.state.executor.shutdown(wait=True)

# Calling threadpool inside async route
async def detect_objects_async(frame_bytes: bytes) -> List[Detection]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        app.state.executor, 
        run_yolo_inference, 
        app.state.yolo_model, 
        frame_bytes
    )
```

---

## 7. Report Compilation & Integrity Scoring

The `ReportService` computes the final candidate audit summary:
1. Calculates percentage test score ($PointsEarned / TotalPossible \times 100$).
2. Aggregates all confirmed violations grouped by category and severity.
3. Computes the **Integrity Trust Score**:
   $$\text{TrustScore} = \max\left(0, 100 - \sum \text{ViolationStrikePoints}\right)$$
4. Packages a chronological incident table with direct media links and SHA-256 hashes into a printable HTML / PDF-ready payload.
