import pytest

async def create_user_and_login(client, email, password, full_name, role="student"):
    res1 = await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name,
        "role": role,
        "student_id_number": f"STU-{email[:5]}",
        "department": "Engineering"
    })
    otp = res1.json()["debug_otp"]
    res2 = await client.post("/api/v1/auth/verify-otp", json={
        "email": email,
        "otp_code": otp
    })
    return res2.json()["access_token"], res2.json()["user"]

@pytest.mark.asyncio
async def test_profile_update_and_photo_upload(client):
    token, user = await create_user_and_login(client, "profile.test@university.edu", "Pass1234!", "Original Name")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Update Profile
    update_res = await client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"full_name": "Updated Name", "department": "Data Science", "academic_year": 3}
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["full_name"] == "Updated Name"
    assert data["student_profile"]["department"] == "Data Science"
    assert data["student_profile"]["academic_year"] == 3

    # 2. Upload Profile Photo
    fake_img = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 50
    files = {"file": ("avatar.jpg", fake_img, "image/jpeg")}
    photo_res = await client.post("/api/v1/users/me/photo", headers=headers, files=files)
    assert photo_res.status_code == 200
    assert photo_res.json()["avatar_url"] is not None
    assert "/storage/profiles/" in photo_res.json()["avatar_url"]

@pytest.mark.asyncio
async def test_change_password_flow(client):
    token, _ = await create_user_and_login(client, "pwd.change@university.edu", "OldPass123!", "Pwd User")
    headers = {"Authorization": f"Bearer {token}"}

    # Wrong current password fails
    bad_res = await client.post(
        "/api/v1/users/change-password",
        headers=headers,
        json={"current_password": "WrongPassword!", "new_password": "NewPass456!"}
    )
    assert bad_res.status_code == 400
    assert "Current password is incorrect" in bad_res.json()["detail"]

    # Valid change
    good_res = await client.post(
        "/api/v1/users/change-password",
        headers=headers,
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"}
    )
    assert good_res.status_code == 200
    assert "successfully" in good_res.json()["message"]

    # Verify login with new password
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "pwd.change@university.edu",
        "password": "NewPass456!"
    })
    assert login_res.status_code == 200

@pytest.mark.asyncio
async def test_forgot_and_reset_password_with_otp(client):
    await create_user_and_login(client, "forgot.pwd@university.edu", "Pass1234!", "Forgot User")

    # 1. Request password reset OTP
    req_res = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "forgot.pwd@university.edu"}
    )
    assert req_res.status_code == 200
    otp = req_res.json()["debug_otp"]
    assert otp is not None

    # 2. Reset password using OTP
    reset_res = await client.post(
        "/api/v1/auth/reset-password",
        json={
            "email": "forgot.pwd@university.edu",
            "otp_code": otp,
            "new_password": "CompletelyNewPass99!"
        }
    )
    assert reset_res.status_code == 200
    assert "Password reset successfully" in reset_res.json()["message"]

    # 3. Test login with newly reset password
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "forgot.pwd@university.edu",
        "password": "CompletelyNewPass99!"
    })
    assert login_res.status_code == 200

@pytest.mark.asyncio
async def test_admin_user_management(client):
    admin_token, _ = await create_user_and_login(
        client, "admin1@university.edu", "AdminPass123!", "Dr. Admin", role="admin"
    )
    student_token, student_user = await create_user_and_login(
        client, "student.roster@university.edu", "StudentPass123!", "Alex Student", role="student"
    )

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 1. Student trying to access admin endpoint -> 403 Forbidden
    forbidden_res = await client.get("/api/v1/admin/users", headers=student_headers)
    assert forbidden_res.status_code == 403

    # 2. Admin access -> 200 OK
    users_res = await client.get("/api/v1/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    users_list = users_res.json()["users"]
    assert len(users_list) >= 2

    # 3. Admin filter by role
    student_only_res = await client.get("/api/v1/admin/users?role=student", headers=admin_headers)
    assert student_only_res.status_code == 200
    assert all(u["role"] == "student" for u in student_only_res.json()["users"])

    # 4. Admin deactivate student
    toggle_res = await client.patch(
        f"/api/v1/admin/users/{student_user['id']}/status",
        headers=admin_headers,
        json={"is_active": False}
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # 5. Deactivated student cannot login
    locked_login = await client.post("/api/v1/auth/login", json={
        "email": "student.roster@university.edu",
        "password": "StudentPass123!"
    })
    assert locked_login.status_code == 403
    assert "deactivated" in locked_login.json()["detail"]
