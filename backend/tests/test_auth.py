from fastapi.testclient import TestClient
from app.db.models import User
import pytest
from fastapi import APIRouter, Depends
from app.auth import require_teacher, require_student

# Add a test router to test role dependencies
from app.main import app
test_router = APIRouter()

@test_router.get("/api/auth/teacher-only")
def teacher_only_route(current_user: User = Depends(require_teacher)):
    return {"message": "Success"}

@test_router.get("/api/auth/student-only")
def student_only_route(current_user: User = Depends(require_student)):
    return {"message": "Success"}

app.include_router(test_router)

def test_auth_end_to_end(client: TestClient, db_session):
    email = "test_student_e2e@viva.edu"
    password = "securepassword123"
    
    # 1. Register a test student
    res = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "name": "Test Student E2E",
        "role": "student",
        "student_number": "STU999"
    })
    assert res.status_code == 201
    user_data = res.json()
    assert user_data["email"] == email
    
    # 2. Confirm user is stored with a password hash, never plaintext
    user_in_db = db_session.query(User).filter(User.email == email).first()
    assert user_in_db is not None
    assert user_in_db.password_hash != password
    assert "securepassword123" not in user_in_db.password_hash
    
    # 3. Login with that user
    res = client.post("/api/auth/login", data={
        "username": email,
        "password": password
    })
    assert res.status_code == 200
    
    # 4. Verify a JWT is returned
    token_data = res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    access_token = token_data["access_token"]
    
    # 5. Call /api/auth/me using the JWT
    headers = {"Authorization": f"Bearer {access_token}"}
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200
    
    # 6. Verify the returned user/role
    me_data = res.json()
    assert me_data["email"] == email
    assert me_data["role"] == "student"
    
    # 7. Verify invalid credentials are rejected
    res = client.post("/api/auth/login", data={
        "username": email,
        "password": "wrongpassword"
    })
    assert res.status_code == 400

def test_role_dependencies(client: TestClient, db_session):
    # Register teacher
    res = client.post("/api/auth/register", json={
        "email": "teacher@viva.edu",
        "password": "password123",
        "name": "Teacher",
        "role": "teacher"
    })
    teacher_token = client.post("/api/auth/login", data={"username": "teacher@viva.edu", "password": "password123"}).json()["access_token"]
    
    # Register student
    res = client.post("/api/auth/register", json={
        "email": "student2@viva.edu",
        "password": "password123",
        "name": "Student",
        "role": "student"
    })
    student_token = client.post("/api/auth/login", data={"username": "student2@viva.edu", "password": "password123"}).json()["access_token"]
    
    # 8. Verify protected role dependencies reject the wrong role
    # Student accessing teacher route
    res = client.get("/api/auth/teacher-only", headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 403
    
    # Teacher accessing student route
    res = client.get("/api/auth/student-only", headers={"Authorization": f"Bearer {teacher_token}"})
    assert res.status_code == 403
    
    # Correct accesses
    assert client.get("/api/auth/teacher-only", headers={"Authorization": f"Bearer {teacher_token}"}).status_code == 200
    assert client.get("/api/auth/student-only", headers={"Authorization": f"Bearer {student_token}"}).status_code == 200

def test_duplicate_email(client: TestClient):
    client.post("/api/auth/register", json={
        "email": "dup@viva.edu",
        "password": "password123",
        "name": "Dup",
        "role": "student"
    })
    res = client.post("/api/auth/register", json={
        "email": "dup@viva.edu",
        "password": "password123",
        "name": "Dup",
        "role": "student"
    })
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]
