from fastapi.testclient import TestClient
from app.main import app

def test_health_live(client: TestClient):
    res = client.get("/health/live")
    assert res.status_code == 200

def test_health_ready(client: TestClient):
    res = client.get("/health/ready")
    assert res.status_code == 200

def test_api_version(client: TestClient):
    res = client.get("/api/version")
    assert res.status_code == 200
