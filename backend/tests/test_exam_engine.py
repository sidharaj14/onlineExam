import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_exam_lifecycle_and_taking_flow(client: AsyncClient):
    # 1. Fetch exams list (should trigger seeding of default exam)
    resp = await client.get("/api/v1/exams")
    assert resp.status_code == 200
    exams = resp.json()
    assert len(exams) >= 1
    exam = exams[0]
    assert exam["course_code"] == "CS301"
    assert exam["question_count"] == 5
    exam_id = exam["id"]

    # 2. Get single exam details
    resp = await client.get(f"/api/v1/exams/{exam_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == exam_id

    # 3. Start Exam with Camera Verification Snapshot (dummy base64 photo)
    dummy_b64 = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
    start_payload = {
        "candidate_name": "Alex Candidate",
        "candidate_email": "alex@candidate.edu",
        "verification_photo_base64": dummy_b64,
    }
    resp = await client.post(f"/api/v1/exams/{exam_id}/start", json=start_payload)
    assert resp.status_code == 200
    start_data = resp.json()
    assert "attempt_id" in start_data
    attempt_id = start_data["attempt_id"]

    # 4. Fetch attempt details for taking
    resp = await client.get(f"/api/v1/exams/attempts/{attempt_id}")
    assert resp.status_code == 200
    attempt_data = resp.json()
    assert attempt_data["attempt_id"] == attempt_id
    assert attempt_data["status"] == "IN_PROGRESS"
    assert attempt_data["time_remaining_seconds"] > 0
    questions = attempt_data["questions"]
    assert len(questions) == 5

    # Check security: correct_answer must NOT be exposed
    for q in questions:
        assert "correct_answer" not in q
        assert "options" in q
        assert len(q["options"]) == 4

    # 5. Save answers
    # Q1: correct is B
    q1 = questions[0]
    resp = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/save-answer",
        json={"question_id": q1["id"], "selected_option": "B"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "saved"

    # Q2: correct is C
    q2 = questions[1]
    resp = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/save-answer",
        json={"question_id": q2["id"], "selected_option": "C"},
    )
    assert resp.status_code == 200

    # Q3: correct is B
    q3 = questions[2]
    resp = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/save-answer",
        json={"question_id": q3["id"], "selected_option": "B"},
    )
    assert resp.status_code == 200

    # 6. Submit exam
    resp = await client.post(f"/api/v1/exams/attempts/{attempt_id}/submit")
    assert resp.status_code == 200
    result_data = resp.json()
    assert result_data["status"] == "SUBMITTED"
    assert result_data["score"] == 30.0  # 3 correct * 10 marks
    assert result_data["total_marks"] == 50
    assert result_data["passed"] is True  # passing marks is 20
    assert result_data["answered_count"] == 3
    assert result_data["total_questions"] == 5

    # 7. Get final result
    resp = await client.get(f"/api/v1/exams/attempts/{attempt_id}/result")
    assert resp.status_code == 200
    assert resp.json()["score"] == 30.0

    # 8. Unauthenticated/Student blocked from admin view
    resp_unauth = await client.get(f"/api/v1/exams/admin/{exam_id}/attempts")
    assert resp_unauth.status_code == 401

    # 9. Authenticated Admin view submissions
    admin_login = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "admin123"})
    admin_token = admin_login.json()["access_token"]
    resp = await client.get(f"/api/v1/exams/admin/{exam_id}/attempts", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    admin_attempts = resp.json()["attempts"]
    assert len(admin_attempts) >= 1
    assert admin_attempts[0]["id"] == attempt_id
    assert admin_attempts[0]["score"] == 30.0

@pytest.mark.asyncio
async def test_proctoring_3_strike_termination(client: AsyncClient):
    # 1. Get exam
    resp = await client.get("/api/v1/exams")
    exam_id = resp.json()[0]["id"]

    # 2. Start attempt
    start_payload = {
        "candidate_name": "Test Violator",
        "candidate_email": "violator@university.edu",
    }
    resp = await client.post(f"/api/v1/exams/{exam_id}/start", json=start_payload)
    attempt_id = resp.json()["attempt_id"]

    # 3. Violation 1: Tab switch
    v1_payload = {
        "violation_type": "TAB_SWITCH",
        "message": "Candidate navigated away from examination tab."
    }
    resp_v1 = await client.post(f"/api/v1/exams/attempts/{attempt_id}/violation", json=v1_payload)
    assert resp_v1.status_code == 200
    assert resp_v1.json()["violations_count"] == 1
    assert resp_v1.json()["terminated"] is False

    # 4. Violation 2: Multiple faces detected (2nd face)
    v2_payload = {
        "violation_type": "MULTIPLE_FACES",
        "message": "Multiple faces detected in camera frame (unauthorized person)."
    }
    resp_v2 = await client.post(f"/api/v1/exams/attempts/{attempt_id}/violation", json=v2_payload)
    assert resp_v2.status_code == 200
    assert resp_v2.json()["violations_count"] == 2
    assert resp_v2.json()["terminated"] is False

    # 5. Violation 3: 3rd Strike -> Automatic Exam Termination!
    v3_payload = {
        "violation_type": "NO_FACE",
        "message": "Candidate absent from camera frame."
    }
    resp_v3 = await client.post(f"/api/v1/exams/attempts/{attempt_id}/violation", json=v3_payload)
    assert resp_v3.status_code == 200
    assert resp_v3.json()["violations_count"] == 3
    assert resp_v3.json()["terminated"] is True
    assert resp_v3.json()["status"] == "TERMINATED_VIOLATION"

    # 6. Verify result scorecard reflects TERMINATED_VIOLATION with 3 violations
    resp_res = await client.get(f"/api/v1/exams/attempts/{attempt_id}/result")
    assert resp_res.status_code == 200
    res_data = resp_res.json()
    assert res_data["status"] == "TERMINATED_VIOLATION"
    assert res_data["violations_count"] == 3
    assert len(res_data["violations"]) == 3
    assert res_data["violations"][0]["violation_type"] == "TAB_SWITCH"
    assert res_data["violations"][1]["violation_type"] == "MULTIPLE_FACES"
    assert res_data["violations"][2]["violation_type"] == "NO_FACE"

@pytest.mark.asyncio
async def test_student_analytics_flow(client):
    # 1. Fetch student analytics
    resp = await client.get("/api/v1/exams/student/analytics?email=proctor_test@university.edu")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_tests_taken" in data
    assert "average_score" in data
    assert "pass_rate" in data
    assert "recent_attempts" in data
    assert "subject_performance" in data

@pytest.mark.asyncio
async def test_role_authorization_and_ownership_security(client: AsyncClient):
    # 1. Student login
    login_resp = await client.post("/api/v1/auth/login", json={"email": "student@example.com", "password": "student123"})
    assert login_resp.status_code == 200
    student_token = login_resp.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 2. Student trying to access admin endpoints must get 403 Forbidden
    resp = await client.get("/api/v1/exams/admin/attempts", headers=student_headers)
    assert resp.status_code == 403

    resp = await client.post("/api/v1/exams/admin/create", json={"title": "Hack", "course_code": "HK101", "questions": []}, headers=student_headers)
    assert resp.status_code == 403

    # 3. Create an attempt under a different email
    exams_resp = await client.get("/api/v1/exams")
    exam_id = exams_resp.json()[0]["id"]
    start_resp = await client.post(f"/api/v1/exams/{exam_id}/start", json={
        "candidate_name": "Other Candidate",
        "candidate_email": "other@university.edu",
    })
    other_attempt_id = start_resp.json()["attempt_id"]

    # 4. Student attempting to access other candidate's attempt details must get 403 Forbidden
    resp = await client.get(f"/api/v1/exams/attempts/{other_attempt_id}", headers=student_headers)
    assert resp.status_code == 403

    # 5. Student attempting to access other candidate's result must get 403 Forbidden
    resp = await client.get(f"/api/v1/exams/attempts/{other_attempt_id}/result", headers=student_headers)
    assert resp.status_code == 403

@pytest.mark.asyncio
async def test_database_persistence_records(client: AsyncClient, db_session: AsyncSession):
    from sqlalchemy import select
    from app.db.models.exam import AttemptAnswer, ProctoringViolation, SecurityAuditLog, ExamAttempt

    # 1. Start exam
    exams_resp = await client.get("/api/v1/exams")
    exam_id = exams_resp.json()[0]["id"]
    start_resp = await client.post(f"/api/v1/exams/{exam_id}/start", json={
        "candidate_name": "Database Verification Candidate",
        "candidate_email": "dbtest@university.edu",
    })
    assert start_resp.status_code == 200
    attempt_id = start_resp.json()["attempt_id"]

    # 2. Get questions and save an answer
    attempt_resp = await client.get(f"/api/v1/exams/attempts/{attempt_id}")
    q_id = attempt_resp.json()["questions"][0]["id"]
    save_resp = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/save-answer",
        json={"question_id": q_id, "selected_option": "B"},
    )
    assert save_resp.status_code == 200

    # 3. Record a violation
    viol_resp = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/violation",
        json={"violation_type": "PHONE_DETECTED", "message": "Mobile device detected in frame"},
    )
    assert viol_resp.status_code == 200

    # 4. Verify directly in the database
    db = db_session
    # Check ExamAttempt
    attempt = await db.get(ExamAttempt, attempt_id)
    assert attempt is not None
    assert attempt.integrity_score == 80.0  # 100 - 20 for 1 strike

    # Check AttemptAnswer table
    ans_stmt = select(AttemptAnswer).where(AttemptAnswer.attempt_id == attempt_id)
    answers = (await db.execute(ans_stmt)).scalars().all()
    assert len(answers) == 1
    assert answers[0].question_id == q_id
    assert answers[0].selected_answer == "B"

    # Check ProctoringViolation table
    viol_stmt = select(ProctoringViolation).where(ProctoringViolation.attempt_id == attempt_id)
    violations = (await db.execute(viol_stmt)).scalars().all()
    assert len(violations) == 1
    assert violations[0].event_type == "PHONE_DETECTED"
    assert violations[0].strike_number == 1

    # Check SecurityAuditLog table
    audit_stmt = select(SecurityAuditLog).where(SecurityAuditLog.action.in_(["EXAM_START", "VIOLATION_RECORDED"]))
    logs = (await db.execute(audit_stmt)).scalars().all()
    assert len(logs) >= 2



