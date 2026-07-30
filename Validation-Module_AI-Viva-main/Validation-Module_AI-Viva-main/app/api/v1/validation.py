from fastapi import APIRouter, Depends, status
from app.schemas.validation import ValidationRequest, ValidationResponse

try:
    from app.services.validation_service import ValidationService
except ModuleNotFoundError:
    from app.services.lightweight_validation_service import LightweightValidationService as ValidationService

router = APIRouter(prefix="/v1", tags=["Validation"])

def get_validation_service() -> ValidationService:
    """
    Dependency injection generator to fetch the singleton instance of ValidationService.
    """
    return ValidationService()

@router.post(
    "/validate",
    response_model=ValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate and score student oral answer transcription",
    description=(
        "Performs transcript cleaning, strips fillers, verifies ASR recording quality "
        "(checking for empty input, stutter, or repeating loops), and computes semantic similarity "
        "and relevance scores compared to the examiner's reference answer."
    )
)
async def validate_student_answer(
    request: ValidationRequest,
    service: ValidationService = Depends(get_validation_service)
):
    """
    Endpoint handler that processes validation requests.
    """
    return service.validate_answer(request)
