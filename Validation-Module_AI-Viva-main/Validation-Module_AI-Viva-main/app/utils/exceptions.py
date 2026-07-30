class ValidationServiceException(Exception):
    """
    Base exception class for all domain errors within the Validation Module.
    """
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class ModelLoadException(ValidationServiceException):
    """
    Exception raised when the NLP embedding models fail to initialize or load.
    """
    def __init__(self, model_name: str, detail: str = ""):
        message = f"Failed to load sentence-transformer model '{model_name}'. {detail}"
        super().__init__(message, status_code=500)


class InvalidInputTextException(ValidationServiceException):
    """
    Exception raised when input text strings fail sanity checks (e.g. empty transcripts).
    """
    def __init__(self, message: str):
        super().__init__(message, status_code=422)


class TextProcessingException(ValidationServiceException):
    """
    Exception raised when preprocessing, cleaning, or tokenizing text fails.
    """
    def __init__(self, message: str):
        super().__init__(message, status_code=500)
