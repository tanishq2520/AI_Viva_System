import re

from app.schemas.validation import (
    CompletenessStatus,
    ValidationRequest,
    ValidationResponse,
    ValidationStatus,
)


STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "be",
    "by",
    "for",
    "from",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "to",
    "with",
}


class LightweightValidationService:
    """Dependency-light validation fallback for local demos and machines without torch."""

    def validate_answer(self, request: ValidationRequest) -> ValidationResponse:
        answer = (request.student_answer or "").strip()
        expected = (request.expected_answer or request.question or "").strip()

        if not answer:
            return ValidationResponse(
                validation_status=ValidationStatus.INVALID,
                relevance_score=0.0,
                semantic_similarity=0.0,
                completeness=CompletenessStatus.IRRELEVANT,
                confidence=0.0,
                remarks="Invalid response attempt. Empty answer.",
            )

        answer_tokens = set(self._tokens(answer))
        expected_tokens = set(self._tokens(expected))

        if len(answer_tokens) < 3:
            return ValidationResponse(
                validation_status=ValidationStatus.INVALID,
                relevance_score=0.1,
                semantic_similarity=0.1,
                completeness=CompletenessStatus.IRRELEVANT,
                confidence=0.2,
                remarks="Invalid response attempt. Answer is too short for evaluation.",
            )

        overlap = len(answer_tokens & expected_tokens)
        denominator = max(len(expected_tokens), 1)
        similarity = round(overlap / denominator, 2)
        relevance = round(min(1.0, similarity + 0.15), 2)

        if similarity >= 0.6:
            completeness = CompletenessStatus.COMPLETE
            status = ValidationStatus.VALID
            remarks = "Answer is relevant and covers the expected concepts."
        elif similarity >= 0.25:
            completeness = CompletenessStatus.PARTIALLY_COMPLETE
            status = ValidationStatus.VALID
            remarks = "Answer is relevant but partially complete."
        else:
            completeness = CompletenessStatus.IRRELEVANT
            status = ValidationStatus.INVALID
            remarks = "Answer lacks relevance or critical expected concepts."

        return ValidationResponse(
            validation_status=status,
            relevance_score=relevance,
            semantic_similarity=similarity,
            completeness=completeness,
            confidence=round((relevance + similarity) / 2, 2),
            remarks=remarks,
        )

    def _tokens(self, text: str) -> list[str]:
        tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9]+", text.lower())
        return [token for token in tokens if token not in STOP_WORDS and len(token) > 2]
