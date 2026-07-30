import pytest
from unittest.mock import MagicMock, patch
import numpy as np
import torch
from app.services.validation_service import ValidationService
from app.schemas.validation import ValidationRequest, ValidationStatus, CompletenessStatus

@pytest.fixture
def service():
    return ValidationService()

def test_feature_extraction_and_similarity(service):
    # Test Llama Feature Extraction embedding generation and manual cosine similarity
    emb1 = service.get_embedding("What is CPU?", language="English")
    emb2 = service.get_embedding("What is the central processing unit?", language="English")
    
    assert isinstance(emb1, np.ndarray)
    assert isinstance(emb2, np.ndarray)
    assert emb1.ndim == 1
    
    # Calculate manual cosine similarity
    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)
    similarity = float(np.dot(emb1, emb2) / (norm1 * norm2))
    assert 0.0 <= similarity <= 1.0

def test_zero_shot_classification(service):
    # Test mDeBERTa Zero-Shot NLI Classification
    is_valid = service.zero_shot_classify("The CPU is the brain of the computer", "Central Processing Unit")
    assert isinstance(is_valid, bool)

@patch("transformers.AutoModelForCausalLM.from_pretrained")
@patch("transformers.AutoTokenizer.from_pretrained")
def test_local_qa_validation_mocked(mock_tokenizer_cls, mock_model_cls, service):
    # Test DragonLLM QA optional validation
    mock_tokenizer = MagicMock()
    mock_tokenizer.decode.return_value = '{"validation_status": "Valid", "relevance_score": 0.90, "semantic_similarity": 0.85, "completeness": "Complete", "confidence": 0.88, "remarks": "Highly relevant answer"}'
    mock_tokenizer_cls.return_value = mock_tokenizer
    
    mock_model = MagicMock()
    mock_model.device = "cpu"
    mock_model.generate.return_value = torch.tensor([[1, 2, 3]])
    mock_model_cls.return_value = mock_model
    
    req = ValidationRequest(
        question="What is a GPU?",
        expected_answer="Graphics Processing Unit",
        student_answer="GPU is graphics processing unit",
        language="English",
        speech_metadata={"use_local_llm": True}
    )
    
    res = service.validate_answer(req)
    assert res.validation_status == ValidationStatus.VALID
    assert res.semantic_similarity == 0.85
    assert res.relevance_score == 0.90
    assert res.completeness == CompletenessStatus.COMPLETE
    assert res.remarks == "Highly relevant answer"

@patch("transformers.AutoModelForCausalLM.from_pretrained")
@patch("transformers.AutoTokenizer.from_pretrained")
def test_text_generation_feedback_mocked(mock_tokenizer_cls, mock_model_cls, service):
    # Test Nemotron text generation feedback
    mock_tokenizer = MagicMock()
    mock_tokenizer.decode.return_value = "The student correctly defined the concept with good accuracy."
    mock_tokenizer_cls.return_value = mock_tokenizer
    
    mock_model = MagicMock()
    mock_model.device = "cpu"
    mock_model.generate.return_value = torch.tensor([[1, 2, 3]])
    mock_model_cls.return_value = mock_model
    
    req = ValidationRequest(
        question="What is RAM?",
        expected_answer="Random Access Memory",
        student_answer="RAM is Random Access Memory used for temporary storage",
        language="English",
        speech_metadata={"generate_feedback": True}
    )
    
    res = service.validate_answer(req)
    assert res.validation_status == ValidationStatus.VALID
    assert res.remarks == "The student correctly defined the concept with good accuracy."

@patch("transformers.AutoModelForSeq2SeqLM.from_pretrained")
@patch("transformers.AutoTokenizer.from_pretrained")
def test_indic_translation_mocked(mock_tokenizer_cls, mock_model_cls, service):
    # Test IndicTrans2Seq translation
    mock_tokenizer = MagicMock()
    mock_tokenizer.decode.return_value = "What is operating system?"
    mock_tokenizer_cls.return_value = mock_tokenizer
    
    mock_model = MagicMock()
    mock_model.device = "cpu"
    mock_model.generate.return_value = torch.tensor([[1, 2, 3]])
    mock_model_cls.return_value = mock_model
    
    translated = service.translate_to_english("ऑपरेटिंग सिस्टम क्या है?", "Hindi")
    assert translated == "What is operating system?"

def test_rag_pipeline_flow(service):
    # Test RAG Extension flow: Question -> Retrieve Reference Answer -> Sentence Similarity -> Validation
    # We supply empty expected_answer to trigger RAG retrieval of reference answer
    req = ValidationRequest(
        question="What is an operating system and what does it do?",
        student_answer="An operating system manages hardware resources and acts as an interface.",
        language="English"
    )
    res = service.validate_answer(req)
    
    # Verify that the reference answer was successfully retrieved and validated
    assert res.validation_status == ValidationStatus.VALID
    assert res.relevance_score > 0.4
