from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config.config import settings, logger
from app.utils.exceptions import ValidationServiceException
from app.api.v1.validation import router as validation_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Validation Module for AI-Based Viva System - NIT Silchar Summer Internship",
    version="1.0.0",
    debug=settings.DEBUG
)

# Add CORS Middleware to support cross-origin API calls from UI dashboards
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(ValidationServiceException)
async def validation_service_exception_handler(request: Request, exc: ValidationServiceException):
    """
    Global exception handler for Validation Module specific errors.
    """
    logger.error(f"Validation service error: {exc.message} (status: {exc.status_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_type": exc.__class__.__name__,
            "message": exc.message,
            "status": "error"
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler to intercept unexpected server errors and return clean API responses.
    """
    logger.error(f"Unhandled system error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error_type": "InternalServerError",
            "message": "An unexpected error occurred. Please check system logs.",
            "status": "error"
        }
    )

# Register Version 1 Routers
app.include_router(validation_router, prefix="/api")

@app.get("/")
def read_root():
    """
    Root endpoint containing basic metadata about the service.
    """
    return {
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "docs_url": "/docs",
        "status": "online"
    }

@app.get("/health")
def health_check():
    """
    Health check endpoint to verify service health and NLP model configuration.
    """
    logger.debug("Health check requested")
    return {
        "status": "healthy",
        "nlp_model": settings.MODEL_NAME,
        "thresholds": {
            "min_similarity": settings.MIN_SIMILARITY_THRESHOLD,
            "min_relevance": settings.MIN_RELEVANCE_THRESHOLD
        }
    }
