# 17 — Development Rules & AI Coding Guardrails

This document establishes the mandatory engineering rules, architectural constraints, and quality standards for all developers and AI coding assistants working on this codebase.

---

## 1. Golden Rules of Development

1. **Never Rewrite Working Code Unnecessarily**:
   - Do not replace established components or services with completely different implementations unless there is an approved architectural defect.
   - Prefer surgical, modular modifications over sweeping file rewrites.

2. **Inspect and Verify Before Editing**:
   - Always read and analyze existing files, type definitions, and database schemas before writing new code.
   - Do not make assumptions about variable names, route paths, or data contracts.

3. **Follow the Architectural Single Source of Truth**:
   - Every file created must strictly align with the specifications in the `/docs` directory.
   - If an architectural update is necessary, update the corresponding documentation file first.

4. **Zero Duplicate Services or Redundant Abstractions**:
   - Check existing services (`auth_service.py`, `exam_service.py`, `violation_engine.py`) before introducing new helpers.
   - Do not create parallel or conflicting state stores in React.

5. **Do Not Alter Technology Stack Without Formal Justification**:
   - The stack is fixed: React + Vite + Tailwind CSS for frontend; Python FastAPI + SQLite/SQLAlchemy for backend.
   - Do not introduce Next.js, Django, MongoDB, or heavy external microservices.

---

## 2. Interface Contracts & Synchronization

1. **Strict TypeScript & Pydantic Synchronization**:
   - Whenever a Pydantic schema in `backend/app/schemas/` is updated, the corresponding TypeScript interface in `frontend/src/types/` must be synchronized immediately.
   - Maintain uniform snake_case for database columns and JSON API keys, or use explicit Pydantic aliases.

2. **Backward Compatibility in Database Migrations**:
   - Avoid dropping columns or breaking existing foreign key relationships.
   - Use nullable defaults or migration scripts when adding new fields.

---

## 3. Core Architectural Boundaries

1. **Keep AI Detection Strictly Quarantined from Judicial Logic**:
   - AI models (MediaPipe, YOLOv8n, Whisper) must **ONLY** produce probabilistic telemetry signals (`AIEventPayload`).
   - Models must **NEVER** directly modify strike points, issue warnings, or trigger student disqualification.
   - All punitive and escalation decisions must flow through `ViolationEngine` in `backend/app/services/violation_engine.py`.

2. **Keep Security & Permissions Centralized**:
   - Never implement ad-hoc JWT decoding or password checks inside route handlers.
   - Always utilize dependency injection (`deps.py` with `get_current_user` and `require_role`).
   - Evidence media files must always be requested via authorized endpoints, never exposed via unauthenticated static directories.

---

## 4. Verification, Testing & Acceptance Standards

1. **No Completion Without Verified Acceptance Criteria**:
   - A milestone or feature cannot be considered complete until all acceptance criteria specified in `docs/16-development-roadmap.md` are tested and verified.
   - All unit tests must pass before committing changes.

2. **Mandatory Reporting in Change Logs**:
   - Whenever an edit is made, report:
     1. Exact files modified or created.
     2. Specific tests run and outcomes.
     3. Any remaining unresolved edge cases or dependencies.

3. **Fail Safely and Handle Exceptions Gracefully**:
   - Never use bare `except:` or swallow exceptions silently in Python.
   - Never allow unhandled promise rejections or uncaught React errors to crash the student exam UI. Wrap AI loops in defensive `try/catch` blocks that log telemetry warnings without terminating exam execution.
