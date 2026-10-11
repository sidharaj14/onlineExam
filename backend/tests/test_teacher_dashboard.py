import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_teacher_authentication_flow(client: AsyncClient):
    # 1. Student email attempting teacher OTP request must get 403 Forbidden
    student_req = await client.post(
        "/api/v1/auth/teacher/request-login-otp",
        json={"email": "student@example.com"}
    )
    assert student_req.status_code == 403
    assert "not registered as an authorized teacher" in student_req.json()["detail"]

    # 2. Non-existent email attempting teacher OTP must get 404 Not Found
    non_existent = await client.post(
        "/api/v1/auth/teacher/request-login-otp",
        json={"email": "unknown_faculty@university.edu"}
    )
    assert non_existent.status_code == 404

    # 3. Authorized teacher email requesting OTP must succeed
    teacher_req = await client.post(
        "/api/v1/auth/teacher/request-login-otp",
        json={"email": "teacher@example.com"}
    )
    assert teacher_req.status_code == 200
    assert "Sign-in OTP" in teacher_req.json()["message"]
    otp_code = teacher_req.json().get("debug_otp")

    # 4. Teacher login with OTP
    if otp_code:
        otp_login = await client.post(
            "/api/v1/auth/teacher/login-with-otp",
            json={"email": "teacher@example.com", "otp_code": otp_code}
        )
        assert otp_login.status_code == 200
        assert otp_login.json()["user"]["role"] == "teacher"

    # 5. Teacher login with password
    pwd_login = await client.post(
        "/api/v1/auth/teacher/login",
        json={"email": "teacher@example.com", "password": "admin123"}
    )
    assert pwd_login.status_code == 200
    assert pwd_login.json()["user"]["role"] == "teacher"

    # 6. Student trying to log into teacher portal with password must get 403 Forbidden
    student_pwd_login = await client.post(
        "/api/v1/auth/teacher/login",
        json={"email": "student@example.com", "password": "student123"}
    )
    assert student_pwd_login.status_code == 403
    assert "not authorized for this portal" in student_pwd_login.json()["detail"]


@pytest.mark.asyncio
async def test_teacher_role_enforcement_on_endpoints(client: AsyncClient):
    # Student login
    student_login = await client.post("/api/v1/auth/login", json={"email": "student@example.com", "password": "student123"})
    student_token = student_login.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Student attempting teacher endpoints must be 403 Forbidden
    endpoints = [
        "/api/v1/teacher/overview",
        "/api/v1/teacher/exams",
        "/api/v1/teacher/results",
        "/api/v1/teacher/monitoring",
        "/api/v1/teacher/violations",
    ]
    for ep in endpoints:
        resp = await client.get(ep, headers=student_headers)
        assert resp.status_code == 403, f"Expected 403 on {ep}, got {resp.status_code}"


@pytest.mark.asyncio
async def test_teacher_exam_creation_and_lifecycle(client: AsyncClient):
    # Teacher login
    teacher_login = await client.post("/api/v1/auth/login", json={"email": "teacher@example.com", "password": "admin123"})
    teacher_token = teacher_login.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    # 1. Total marks mismatch validation failure
    invalid_exam_payload = {
        "title": "Machine Learning Midterm",
        "course_code": "CS401",
        "description": "Comprehensive ML evaluation",
        "duration_minutes": 45,
        "total_marks": 50,
        "passing_marks": 20,
        "is_published": True,
        "questions": [
            {
                "question_text": "What is overfitting?",
                "question_type": "MCQ",
                "marks": 10,
                "options": [
                    {"id": "A", "text": "High bias"},
                    {"id": "B", "text": "High variance on unseen data"},
                ],
                "correct_answer": "B",
                "explanation": "Overfitting happens when model learns training noise."
            }
        ]
    }
    mismatch_resp = await client.post("/api/v1/teacher/exams", json=invalid_exam_payload, headers=teacher_headers)
    assert mismatch_resp.status_code == 400
    assert "does not match exam total marks" in mismatch_resp.json()["detail"]

    # 2. Valid exam creation as Draft
    valid_payload = {
        "title": "Database Systems Quiz 1",
        "course_code": "CS205",
        "description": "SQL and relational algebra",
        "duration_minutes": 30,
        "total_marks": 20,
        "passing_marks": 8,
        "is_published": False,
        "questions": [
            {
                "question_text": "Which normal form deals with transitive dependency?",
                "question_type": "MCQ",
                "marks": 10,
                "order_index": 1,
                "options": [
                    {"id": "A", "text": "1NF"},
                    {"id": "B", "text": "2NF"},
                    {"id": "C", "text": "3NF"},
                    {"id": "D", "text": "BCNF"},
                ],
                "correct_answer": "C",
                "explanation": "3NF requires no transitive functional dependencies."
            },
            {
                "question_text": "What does ACID stand for in DBMS?",
                "question_type": "MCQ",
                "marks": 10,
                "order_index": 2,
                "options": [
                    {"id": "A", "text": "Atomicity, Consistency, Isolation, Durability"},
                    {"id": "B", "text": "Access, Control, Integrity, Data"},
                ],
                "correct_answer": "A",
            }
        ]
    }
    create_resp = await client.post("/api/v1/teacher/exams", json=valid_payload, headers=teacher_headers)
    assert create_resp.status_code == 200
    exam_id = create_resp.json()["exam_id"]

    # 3. Retrieve created exam by ID
    get_resp = await client.get(f"/api/v1/teacher/exams/{exam_id}", headers=teacher_headers)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["title"] == "Database Systems Quiz 1"
    assert len(data["questions"]) == 2
    assert data["status"] == "DRAFT"

    # 4. Toggle publish status
    pub_resp = await client.patch(f"/api/v1/teacher/exams/{exam_id}/publish", json={"publish": True}, headers=teacher_headers)
    assert pub_resp.status_code == 200
    assert pub_resp.json()["is_published"] is True
    assert pub_resp.json()["status_label"] == "PUBLISHED"

    # 5. Teacher overview stats check
    overview_resp = await client.get("/api/v1/teacher/overview", headers=teacher_headers)
    assert overview_resp.status_code == 200
    stats = overview_resp.json()["stats"]
    assert stats["total_exams"] >= 1
    assert stats["published_exams"] >= 1

    # 6. Student starts the published exam
    start_payload = {
        "candidate_name": "Student Tester",
        "candidate_email": "student@example.com",
    }
    start_resp = await client.post(f"/api/v1/exams/{exam_id}/start", json=start_payload)
    assert start_resp.status_code == 200
    attempt_id = start_resp.json()["attempt_id"]

    # 7. Student answers question 1 correctly
    q1_id = data["questions"][0]["id"]
    save_ans = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/save-answer",
        json={"question_id": q1_id, "selected_option": "C"}
    )
    assert save_ans.status_code == 200

    # 8. Attempt safety check: Teacher trying to edit questions now must fail with 400
    unsafe_edit = await client.put(
        f"/api/v1/teacher/exams/{exam_id}",
        json={"questions": []},
        headers=teacher_headers
    )
    assert unsafe_edit.status_code == 400
    assert "already exist" in unsafe_edit.json()["detail"]

    # 9. Student submits exam
    sub_resp = await client.post(f"/api/v1/exams/attempts/{attempt_id}/submit")
    assert sub_resp.status_code == 200
    assert sub_resp.json()["score"] == 10.0
    assert sub_resp.json()["passed"] is True

    # 10. Teacher views results table and student details
    results_resp = await client.get(f"/api/v1/teacher/results?exam_id={exam_id}", headers=teacher_headers)
    assert results_resp.status_code == 200
    res_data = results_resp.json()
    assert len(res_data["attempts"]) >= 1
    assert res_data["analytics"]["submitted_count"] >= 1
    assert res_data["analytics"]["average_score"] == 50.0  # 10 / 20 * 100

    # 11. Teacher views specific student attempt breakdown
    detail_resp = await client.get(f"/api/v1/teacher/results/{attempt_id}", headers=teacher_headers)
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["student_email"] == "student@example.com"
    assert detail_data["score"] == 10.0
    assert len(detail_data["questions_breakdown"]) == 2
    assert detail_data["questions_breakdown"][0]["is_correct"] is True
    assert detail_data["questions_breakdown"][1]["is_correct"] is False


@pytest.mark.asyncio
async def test_teacher_overview_with_demo_token(client: AsyncClient):
    # Verify that demo-teacher-jwt-token successfully authenticates and returns stats
    demo_headers = {"Authorization": "Bearer demo-teacher-jwt-token"}
    resp = await client.get("/api/v1/teacher/overview", headers=demo_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "stats" in data
    assert "total_exams" in data["stats"]
    assert "recent_activity" in data

