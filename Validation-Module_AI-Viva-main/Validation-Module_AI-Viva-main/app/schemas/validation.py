from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

class ValidationStatus(str, Enum):
    """
    Indicates whether the transcription is validated as a legitimate response attempt.
    """
    VALID = "Valid"
    INVALID = "Invalid"

class CompletenessStatus(str, Enum):
    """
    Represents the semantic coverage of the student's response compared to the expected answer.
    """
    COMPLETE = "Complete"
    PARTIALLY_COMPLETE = "Partially Complete"
    IRRELEVANT = "Irrelevant"

class ValidationRequest(BaseModel):
    """
    Schema for receiving transcribed responses from the Speech Module.
    """
    question: str = Field(
        ..., 
        min_length=5, 
        description="The viva question asked by the examiner."
    )
    expected_answer: Optional[str] = Field(
        None, 
        description="The benchmark/reference answer expected for this question. If not provided, it will be dynamically retrieved from the RAG knowledge base."
    )
    student_answer: str = Field(
        ..., 
        description="The text transcribed from the student's oral answer."
    )
    language: str = Field(
        "English", 
        description="The spoken language context. Defaults to English."
    )
    speech_metadata: Optional[Dict[str, Any]] = Field(
        None, 
        description="Optional metadata from Speech/ASR (e.g., ASR confidence score, word count, pauses)."
    )

    @field_validator("question", "expected_answer", "student_answer", "language")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        """
        Pydantic validator to clean whitespace padding from input strings.
        """
        if isinstance(v, str):
            return v.strip()
        return v

class ValidationResponse(BaseModel):
    """
    Output validation feedback returned to the main controller or Evaluation Module.
    """
    validation_status: ValidationStatus = Field(
        ..., 
        description="Classification of whether the answer is valid for grading or invalid."
    )
    relevance_score: float = Field(
        ..., 
        ge=0.0, 
        le=1.0, 
        description="Score measuring alignment between student answer and question context."
    )
    semantic_similarity: float = Field(
        ..., 
        ge=0.0, 
        le=1.0, 
        description="Semantic cosine similarity between student answer and expected reference answer."
    )
    completeness: CompletenessStatus = Field(
        ..., 
        description="Degree of detail present in the student's answer."
    )
    confidence: float = Field(
        ..., 
        ge=0.0, 
        le=1.0, 
        description="Weighted confidence score combining ASR inputs and NLP match confidence."
    )
    remarks: str = Field(
        ..., 
        description="Qualitative remark explaining validation results."
    )
