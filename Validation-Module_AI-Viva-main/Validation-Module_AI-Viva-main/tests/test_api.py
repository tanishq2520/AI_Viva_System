from fastapi.testclient import TestClient
from app.main import app
from app.schemas.validation import ValidationStatus, CompletenessStatus

client = TestClient(app)

def test_api_health():
    # Test GET /health endpoint
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "nlp_model" in data

def test_api_validate_valid():
    # Test POST /api/v1/validate with standard valid payload
    payload = {
        "question": "What is the capital of India?",
        "expected_answer": "New Delhi is the capital city of India.",
        "student_answer": "New Delhi is the capital of India.",
        "language": "English"
    }
    response = client.post("/api/v1/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["validation_status"] == "Valid"
    assert data["completeness"] == "Complete"
    assert data["semantic_similarity"] >= 0.70
    assert "remarks" in data

def test_api_validate_invalid_inputs():
    # Test validation error (Pydantic validation failure) when fields are too short
    payload = {
        "question": "Abc", # Under 5 characters (should fail Pydantic validation)
        "expected_answer": "This is a valid expected answer.",
        "student_answer": "This is a student answer.",
        "language": "English"
    }
    response = client.post("/api/v1/validate", json=payload)
    assert response.status_code == 422 # Unprocessable Entity
    data = response.json()
    assert "detail" in data
