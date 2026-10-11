import pytest

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@pytest.mark.asyncio
async def test_full_registration_and_otp_flow(client):
    # 1. Step 1: Submit Registration details
    reg_payload = {
        "email": "student1@university.edu",
        "password": "SecurePassword123!",
        "full_name": "Jane Doe",
        "role": "student",
        "student_id_number": "STU-2026-001",
        "department": "Computer Science",
        "academic_year": 3
    }
    resp1 = await client.post("/api/v1/auth/register", json=reg_payload)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert "Verification OTP sent" in data1["message"]
    assert data1["email"] == "student1@university.edu"
    assert data1["debug_otp"] is not None
    otp_code = data1["debug_otp"]

    # 2. Test Incorrect OTP
    bad_otp_payload = {
        "email": "student1@university.edu",
        "otp_code": "000000" if otp_code != "000000" else "999999"
    }
    resp_bad = await client.post("/api/v1/auth/verify-otp", json=bad_otp_payload)
    assert resp_bad.status_code == 400
    assert "Incorrect verification code" in resp_bad.json()["detail"]

    # 3. Step 2: Submit Valid OTP
    verify_payload = {
        "email": "student1@university.edu",
        "otp_code": otp_code
    }
    resp2 = await client.post("/api/v1/auth/verify-otp", json=verify_payload)
    assert resp2.status_code == 201
    data2 = resp2.json()
    assert "access_token" in data2
    assert data2["user"]["email"] == "student1@university.edu"
    assert data2["user"]["full_name"] == "Jane Doe"
    assert data2["user"]["role"] == "student"
    assert data2["user"]["is_verified"] is True
    assert data2["user"]["student_profile"]["student_id_number"] == "STU-2026-001"
    token = data2["access_token"]

    # 4. Authenticate via GET /api/v1/auth/me
    headers = {"Authorization": f"Bearer {token}"}
    resp_me = await client.get("/api/v1/auth/me", headers=headers)
    assert resp_me.status_code == 200
    assert resp_me.json()["email"] == "student1@university.edu"

    # 5. Test Login with newly registered credentials
    login_payload = {
        "email": "student1@university.edu",
        "password": "SecurePassword123!"
    }
    resp_login = await client.post("/api/v1/auth/login", json=login_payload)
    assert resp_login.status_code == 200
    assert "access_token" in resp_login.json()

    # 6. Test Invalid Password Login
    resp_bad_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "student1@university.edu", "password": "WrongPassword!"}
    )
    assert resp_bad_login.status_code == 401

    # 7. Test Duplicate Registration Rejection
    resp_dup = await client.post("/api/v1/auth/register", json=reg_payload)
    assert resp_dup.status_code == 400
    assert "already registered" in resp_dup.json()["detail"]

@pytest.mark.asyncio
async def test_resend_otp_flow(client):
    # Step 1: Register
    reg_payload = {
        "email": "student2@university.edu",
        "password": "Password456!",
        "full_name": "Bob Smith",
        "role": "student"
    }
    resp1 = await client.post("/api/v1/auth/register", json=reg_payload)
    assert resp1.status_code == 200
    old_otp = resp1.json()["debug_otp"]

    # Step 2: Resend OTP
    resp_resend = await client.post(
        "/api/v1/auth/resend-otp",
        json={"email": "student2@university.edu"}
    )
    assert resp_resend.status_code == 200
    new_otp = resp_resend.json()["debug_otp"]
    assert new_otp is not None

    # Step 3: Old OTP should be replaced by new OTP
    resp_verify = await client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "student2@university.edu", "otp_code": new_otp}
    )
    assert resp_verify.status_code == 201
    assert resp_verify.json()["user"]["email"] == "student2@university.edu"

@pytest.mark.asyncio
async def test_seeded_demo_accounts_login(client):
    from app.services.auth_service import seed_demo_accounts_if_empty
    from app.db.session import get_db

    # Trigger demo seed
    # Test student login
    student_login = {
        "email": "student@example.com",
        "password": "student123"
    }
    resp_s = await client.post("/api/v1/auth/login", json=student_login)
    assert resp_s.status_code == 200
    data_s = resp_s.json()
    assert data_s["user"]["email"] == "student@example.com"
    assert data_s["user"]["role"] == "student"
    assert data_s["user"]["student_profile"]["student_id_number"] == "CS2026-042"

    # Test admin login
    admin_login = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    resp_a = await client.post("/api/v1/auth/login", json=admin_login)
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert data_a["user"]["email"] == "admin@example.com"
    assert data_a["user"]["role"] == "admin"

@pytest.mark.asyncio
async def test_login_with_otp_and_pending_registration_otp_fallback(client):
    # 1. Register candidate
    reg_payload = {
        "email": "otp_candidate@university.edu",
        "password": "StrongPassword789!",
        "full_name": "OTP Candidate",
        "role": "student",
        "student_id_number": "STU-OTP-01"
    }
    reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 200
    otp = reg_resp.json()["debug_otp"]

    # 2. Candidate attempts login with chosen password before verifying OTP
    # Should get a clear 403 explaining pending verification
    pwd_login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "otp_candidate@university.edu", "password": "StrongPassword789!"}
    )
    assert pwd_login_resp.status_code == 403
    assert "pending email verification" in pwd_login_resp.json()["detail"]

    # 3. Candidate enters OTP into password field on login screen (common user behavior!)
    otp_as_pwd_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "otp_candidate@university.edu", "password": otp}
    )
    assert otp_as_pwd_resp.status_code == 200
    assert "access_token" in otp_as_pwd_resp.json()
    assert otp_as_pwd_resp.json()["user"]["email"] == "otp_candidate@university.edu"
    assert otp_as_pwd_resp.json()["user"]["is_verified"] is True

    # 4. Now test /request-login-otp and /login-with-otp for verified user
    req_login_otp = await client.post(
        "/api/v1/auth/request-login-otp",
        json={"email": "otp_candidate@university.edu"}
    )
    assert req_login_otp.status_code == 200
    login_otp = req_login_otp.json()["debug_otp"]

    verify_login_otp = await client.post(
        "/api/v1/auth/login-with-otp",
        json={"email": "otp_candidate@university.edu", "otp_code": login_otp}
    )
    assert verify_login_otp.status_code == 200
    assert "access_token" in verify_login_otp.json()

@pytest.mark.asyncio
async def test_student_signup_with_course_semester_and_teacher_role(client):
    # 1. Student Registration with Course and Semester
    student_payload = {
        "email": "engineer.student@university.edu",
        "password": "EngineeringPassword123!",
        "full_name": "Aarav Sharma",
        "role": "student",
        "student_id_number": "ENG-2026-88",
        "department": "Mechanical Engineering",
        "course": "B.Tech Mechanical",
        "semester": 4,
        "academic_year": 2
    }
    reg_res = await client.post("/api/v1/auth/register", json=student_payload)
    assert reg_res.status_code == 200
    otp = reg_res.json()["debug_otp"]

    verif_res = await client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "engineer.student@university.edu", "otp_code": otp}
    )
    assert verif_res.status_code == 201
    user_data = verif_res.json()["user"]
    assert user_data["student_profile"]["course"] == "B.Tech Mechanical"
    assert user_data["student_profile"]["semester"] == 4
    student_token = verif_res.json()["access_token"]

    # 2. Strict Role Isolation: Student CANNOT access Teacher/Admin APIs
    admin_probe = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert admin_probe.status_code == 403

    # 3. Teacher Registration and Faculty Access
    teacher_payload = {
        "email": "prof.alan@university.edu",
        "password": "ProfPassword123!",
        "full_name": "Prof. Alan Turing",
        "role": "teacher",
        "employee_code": "TCH-007",
        "admin_level": "invigilator"
    }
    t_reg = await client.post("/api/v1/auth/register", json=teacher_payload)
    assert t_reg.status_code == 200
    t_otp = t_reg.json()["debug_otp"]

    t_verif = await client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "prof.alan@university.edu", "otp_code": t_otp}
    )
    assert t_verif.status_code == 201
    t_token = t_verif.json()["access_token"]

    # Teacher CAN access Faculty/Admin management endpoints
    t_access = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {t_token}"}
    )
    assert t_access.status_code == 200



