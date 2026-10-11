import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.exam import StudentActivity, ExamAttempt, Exam
from app.db.models.user import User

@pytest.mark.asyncio
async def test_student_activity_recorded_on_auth_and_actions(client: AsyncClient, db_session: AsyncSession):
    # 1. Student logs in with password
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "student123"}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify LOGIN activity was recorded in the database
    activities_res = await client.get("/api/v1/students/me/activity", headers=student_headers)
    assert activities_res.status_code == 200
    activities = activities_res.json()
    assert len(activities) > 0
    assert any(act["activity_type"] == "LOGIN" for act in activities)

    # 3. Student calls logout
    logout_res = await client.post("/api/v1/auth/logout", headers=student_headers)
    assert logout_res.status_code == 200

    # 4. Verify LOGOUT activity was recorded
    activities_res = await client.get("/api/v1/students/me/activity", headers=student_headers)
    activities = activities_res.json()
    assert any(act["activity_type"] == "LOGOUT" for act in activities)


@pytest.mark.asyncio
async def test_student_active_attempt_resumption_and_lifecycle(client: AsyncClient, db_session: AsyncSession):
    # 1. Login as teacher to create an exam
    teacher_login = await client.post(
        "/api/v1/auth/teacher/login",
        json={"email": "teacher@example.com", "password": "admin123"}
    )
    assert teacher_login.status_code == 200
    teacher_token = teacher_login.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    # Create exam with valid schema
    create_exam_res = await client.post(
        "/api/v1/teacher/exams",
        headers=teacher_headers,
        json={
            "title": "Computer Networks Final",
            "course_code": "CS402",
            "description": "Comprehensive networking and protocols test",
            "duration_minutes": 45,
            "total_marks": 100,
            "passing_marks": 50,
            "is_published": True,
            "questions": [
                {
                    "question_text": "What protocol resolves IP to MAC?",
                    "question_type": "MCQ",
                    "marks": 50,
                    "order_index": 1,
                    "options": [
                        {"id": "A", "text": "ARP"},
                        {"id": "B", "text": "DHCP"},
                        {"id": "C", "text": "DNS"},
                        {"id": "D", "text": "ICMP"},
                    ],
                    "correct_answer": "A",
                },
                {
                    "question_text": "Which layer is HTTP associated with?",
                    "question_type": "MCQ",
                    "marks": 50,
                    "order_index": 2,
                    "options": [
                        {"id": "A", "text": "Transport"},
                        {"id": "B", "text": "Application"},
                        {"id": "C", "text": "Network"},
                        {"id": "D", "text": "Physical"},
                    ],
                    "correct_answer": "B",
                },
            ],
        },
    )
    assert create_exam_res.status_code == 200
    exam_id = create_exam_res.json()["exam_id"]

    # 2. Login as student
    student_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "student123"}
    )
    student_token = student_login.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 3. Check active attempt initially -> should be False
    active_check_1 = await client.get(
        f"/api/v1/exams/{exam_id}/active-attempt",
        headers=student_headers
    )
    assert active_check_1.status_code == 200
    assert active_check_1.json()["has_active_attempt"] is False

    # 4. Start the exam attempt
    start_res_1 = await client.post(
        f"/api/v1/exams/{exam_id}/start",
        headers=student_headers,
        json={
            "candidate_name": "Alex Johnson",
            "candidate_email": "student@example.com",
        },
    )
    assert start_res_1.status_code == 200
    attempt_id_1 = start_res_1.json()["attempt_id"]

    # 5. Check active attempt again -> should now be True
    active_check_2 = await client.get(
        f"/api/v1/exams/{exam_id}/active-attempt",
        headers=student_headers
    )
    assert active_check_2.status_code == 200
    assert active_check_2.json()["has_active_attempt"] is True
    assert active_check_2.json()["attempt_id"] == attempt_id_1

    # 6. Call start exam again (simulating page refresh or double click) -> must resume SAME attempt, NO duplicate
    start_res_duplicate = await client.post(
        f"/api/v1/exams/{exam_id}/start",
        headers=student_headers,
        json={
            "candidate_name": "Alex Johnson",
            "candidate_email": "student@example.com",
        },
    )
    assert start_res_duplicate.status_code == 200
    assert start_res_duplicate.json()["attempt_id"] == attempt_id_1

    # 7. Save an answer
    save_ans = await client.post(
        f"/api/v1/exams/attempts/{attempt_id_1}/save-answer",
        headers=student_headers,
        json={"question_id": "0", "selected_option": "A"},
    )
    assert save_ans.status_code == 200

    # 8. Submit the exam
    submit_res = await client.post(
        f"/api/v1/exams/attempts/{attempt_id_1}/submit",
        headers=student_headers,
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "SUBMITTED"

    # 9. Check active attempt now -> should be False since it's completed
    active_check_3 = await client.get(
        f"/api/v1/exams/{exam_id}/active-attempt",
        headers=student_headers
    )
    assert active_check_3.status_code == 200
    assert active_check_3.json()["has_active_attempt"] is False

    # 10. Verify activities include ATTEMPT_STARTED, ANSWER_SAVED, EXAM_SUBMITTED, EXAM_GRADED
    activities_res = await client.get("/api/v1/students/me/activity", headers=student_headers)
    assert activities_res.status_code == 200
    types = [a["activity_type"] for a in activities_res.json()]
    assert "ATTEMPT_STARTED" in types
    assert "ANSWER_SAVED" in types
    assert "EXAM_SUBMITTED" in types
    assert "EXAM_GRADED" in types


@pytest.mark.asyncio
async def test_student_dashboard_and_analytics_isolation(client: AsyncClient, db_session: AsyncSession):
    # 1. Login student 1
    s1_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "student123"}
    )
    s1_token = s1_login.json()["access_token"]
    s1_headers = {"Authorization": f"Bearer {s1_token}"}

    # 2. Get dashboard for student 1
    dash_res = await client.get("/api/v1/students/me/dashboard", headers=s1_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()

    assert "summary" in dash_data
    assert "recent_history" in dash_data
    assert "analytics" in dash_data
    assert "recent_activities" in dash_data

    # Check summary fields
    summary = dash_data["summary"]
    assert "total_exams_attempted" in summary
    assert "exams_completed" in summary
    assert "exams_in_progress" in summary
    assert "average_score" in summary
    assert "highest_score" in summary
    assert "passed_exams" in summary
    assert "failed_exams" in summary

    # Check analytics fields
    analytics = dash_data["analytics"]
    assert "score_trend" in analytics
    assert "subject_performance" in analytics
    assert "pass_rate" in analytics

    # 3. Register second student
    register_s2 = await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Second Student",
            "email": "student2@example.com",
            "password": "student2Pass@123",
            "role": "student",
            "student_id_number": "STU9999",
            "department": "Computer Science",
            "academic_year": 2,
        },
    )
    assert register_s2.status_code == 200
    otp = register_s2.json()["debug_otp"]
    verify_s2 = await client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "student2@example.com", "otp_code": otp}
    )
    assert verify_s2.status_code == 201
    s2_token = verify_s2.json()["access_token"]
    s2_headers = {"Authorization": f"Bearer {s2_token}"}

    # Student 2 dashboard should have 0 attempts initially
    s2_dash_res = await client.get("/api/v1/students/me/dashboard", headers=s2_headers)
    assert s2_dash_res.status_code == 200
    assert s2_dash_res.json()["summary"]["total_exams_attempted"] == 0
    assert len(s2_dash_res.json()["recent_history"]) == 0

    # Student 2 should not see Student 1's activities
    s2_act_res = await client.get("/api/v1/students/me/activity", headers=s2_headers)
    assert s2_act_res.status_code == 200
    for act in s2_act_res.json():
        assert act["activity_type"] in ["LOGIN", "ACCOUNT_CREATED"]


@pytest.mark.asyncio
async def test_teacher_exam_analytics_and_student_performance(client: AsyncClient, db_session: AsyncSession):
    # 1. Login teacher
    teacher_login = await client.post(
        "/api/v1/auth/teacher/login",
        json={"email": "teacher@example.com", "password": "admin123"}
    )
    teacher_token = teacher_login.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    # Create exam
    create_exam = await client.post(
        "/api/v1/teacher/exams",
        headers=teacher_headers,
        json={
            "title": "Software Architecture Test",
            "course_code": "CS450",
            "duration_minutes": 30,
            "total_marks": 100,
            "passing_marks": 50,
            "is_published": True,
            "questions": [
                {
                    "question_text": "What does MVC stand for?",
                    "question_type": "MCQ",
                    "marks": 100,
                    "order_index": 1,
                    "options": [
                        {"id": "A", "text": "Model View Controller"},
                        {"id": "B", "text": "Module Variable Class"},
                        {"id": "C", "text": "Multiple Virtual Containers"},
                        {"id": "D", "text": "Main Value Constant"},
                    ],
                    "correct_answer": "A",
                }
            ],
        },
    )
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["exam_id"]

    # Student 1 takes exam
    s1_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "student123"}
    )
    student_id = s1_login.json()["user"]["id"]
    s1_headers = {"Authorization": f"Bearer {s1_login.json()['access_token']}"}

    start = await client.post(
        f"/api/v1/exams/{exam_id}/start",
        headers=s1_headers,
        json={"candidate_name": "Alex Johnson", "candidate_email": "student@example.com"},
    )
    attempt_id = start.json()["attempt_id"]
    submit = await client.post(
        f"/api/v1/exams/attempts/{attempt_id}/submit",
        headers=s1_headers,
    )
    assert submit.status_code == 200

    # 2. Teacher checks exam analytics
    exam_analytics = await client.get(
        f"/api/v1/teacher/exams/{exam_id}/analytics",
        headers=teacher_headers
    )
    assert exam_analytics.status_code == 200
    ea_data = exam_analytics.json()
    assert ea_data["exam_id"] == exam_id
    assert ea_data["total_started"] >= 1
    assert ea_data["total_submitted"] >= 1

    # 3. Teacher checks student performance history
    student_perf = await client.get(
        f"/api/v1/teacher/students/{student_id}/performance",
        headers=teacher_headers
    )
    assert student_perf.status_code == 200
    sp_data = student_perf.json()
    assert sp_data["student_id"] == student_id
    assert sp_data["email"] == "student@example.com"
    assert sp_data["total_attempts"] >= 1
    assert len(sp_data["attempts"]) >= 1

    # 4. Unauthorized student trying to access teacher analytics must receive 403
    forbidden_ea = await client.get(
        f"/api/v1/teacher/exams/{exam_id}/analytics",
        headers=s1_headers
    )
    assert forbidden_ea.status_code == 403

    forbidden_sp = await client.get(
        f"/api/v1/teacher/students/{student_id}/performance",
        headers=s1_headers
    )
    assert forbidden_sp.status_code == 403
