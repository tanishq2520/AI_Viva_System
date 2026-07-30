import pytest
from app.schemas.validation import ValidationRequest, ValidationStatus, CompletenessStatus
from app.services.validation_service import ValidationService

@pytest.fixture(scope="module")
def validation_service():
    """
    Module-level fixture to load ValidationService once for all tests in this file.
    """
    return ValidationService()

def test_validation_correct_answer(validation_service):
    # Test a correct complete student answer
    req = ValidationRequest(
        question="What is the CPU and what does it do?",
        expected_answer="The Central Processing Unit or CPU is the primary component of a computer that acts as its brain. It performs calculations and executes instructions.",
        student_answer="The CPU is the central processing unit. It is like the brain of the computer and executes commands and instructions.",
        language="English"
    )
    res = validation_service.validate_answer(req)
    assert res.validation_status == ValidationStatus.VALID
    assert res.semantic_similarity >= 0.70
    assert res.completeness == CompletenessStatus.COMPLETE
    assert "semantically correct" in res.remarks.lower()

def test_validation_off_topic_answer(validation_service):
    # Test a completely off-topic answer
    req = ValidationRequest(
        question="What is the CPU and what does it do?",
        expected_answer="The Central Processing Unit or CPU is the primary component of a computer that acts as its brain. It performs calculations and executes instructions.",
        student_answer="I love playing outdoor games and going swimming during summer holidays.",
        language="English"
    )
    res = validation_service.validate_answer(req)
    assert res.validation_status == ValidationStatus.INVALID
    assert res.semantic_similarity < 0.30
    assert res.completeness == CompletenessStatus.IRRELEVANT
    assert "irrelevant" in res.remarks.lower()

def test_validation_filler_only_answer(validation_service):
    # Test a response that is caught by quality checks (pure disfluency/noise)
    req = ValidationRequest(
        question="What is the CPU?",
        expected_answer="Central Processing Unit of the system.",
        student_answer="uh um like you know",
        language="English"
    )
    res = validation_service.validate_answer(req)
    assert res.validation_status == ValidationStatus.INVALID
    assert res.semantic_similarity == 0.0
    assert res.completeness == CompletenessStatus.IRRELEVANT
    assert "meaningful words" in res.remarks.lower()

def test_validation_hindi_language(validation_service):
    # Test a correct complete student answer in Hindi (Indian Language Understanding)
    req = ValidationRequest(
        question="ऑपरेटिंग सिस्टम क्या है और यह क्या करता है?",
        expected_answer="ऑपरेटिंग सिस्टम एक सॉफ्टवेयर है जो कंप्यूटर हार्डवेयर और उपयोगकर्ता के बीच इंटरफेस के रूप में कार्य करता है। यह फाइलों, मेमोरी और प्रक्रियाओं का प्रबंधन करता है।",
        student_answer="ऑपरेटिंग सिस्टम कंप्यूटर का मुख्य सॉफ्टवेयर होता है जो यूजर और हार्डवेयर के बीच माध्यम बनता है और कंप्यूटर को चलाता है।",
        language="Hindi"
    )
    res = validation_service.validate_answer(req)
    assert res.validation_status == ValidationStatus.VALID
    # Multilingual MiniLM should yield high similarity for semantically matching content
    assert res.semantic_similarity >= 0.50
    assert res.completeness in [CompletenessStatus.COMPLETE, CompletenessStatus.PARTIALLY_COMPLETE]
    assert "relevant" in res.remarks.lower()

def test_validation_partial_completeness(validation_service):
    # Test CPU listing question with 2 out of 3 components mentioned
    req = ValidationRequest(
        question="List the components of a CPU.",
        expected_answer="Control Unit, Arithmetic Logic Unit, and Registers.",
        student_answer="The CPU has the Control Unit.",
        language="English"
    )
    res = validation_service.validate_answer(req)
    assert res.validation_status == ValidationStatus.VALID
    assert res.completeness == CompletenessStatus.PARTIALLY_COMPLETE
    assert "concept coverage" in res.remarks.lower()

def test_validation_llm_mocked(validation_service, monkeypatch):
    # Mock settings.GEMINI_API_KEY
    from app.config.config import settings
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock_key")
    
    # Mock requests.post response
    class MockResponse:
        status_code = 200
        def json(self):
            return {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": '{"validation_status": "Valid", "relevance_score": 0.85, "semantic_similarity": 0.90, "completeness": "Complete", "confidence": 0.88, "remarks": "Excellent response"}'
                                }
                            ]
                        }
                    }
                ]
            }
            
    monkeypatch.setattr("requests.post", lambda *args, **kwargs: MockResponse())
    
    req = ValidationRequest(
        question="What is CPU?",
        expected_answer="Central Processing Unit",
        student_answer="CPU is central processing unit",
        language="English",
        speech_metadata={"use_llm": True}
    )
    
    res = validation_service.validate_answer(req)
    assert res.validation_status == ValidationStatus.VALID
    assert res.semantic_similarity == 0.90
    assert res.relevance_score == 0.85
    assert res.completeness == CompletenessStatus.COMPLETE
    assert res.remarks == "Excellent response"
