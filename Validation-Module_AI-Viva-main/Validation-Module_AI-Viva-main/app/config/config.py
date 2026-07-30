import logging
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings class using Pydantic Settings.
    Automatically loads environment variables from a .env file if present.
    """
    # FastAPI Application settings
    APP_NAME: str = "AI Viva Validation Module"
    APP_ENV: str = "dev"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # NLP Model configurations
    MODEL_NAME: str = "nvidia/llama-nemotron-embed-1b-v2"
    MULTILINGUAL_MODEL_NAME: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    CLASSIFICATION_MODEL_NAME: str = "MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7"
    QA_MODEL_NAME: str = "DragonLLM/Llama-Open-Finance-8B"
    FEEDBACK_MODEL_NAME: str = "nvidia/Nemotron-Labs-Audex-30B-A3B"
    TRANSLATION_MODEL_NAME: str = "ai4bharat/indictrans2-indic-en-1B"
    MIN_SIMILARITY_THRESHOLD: float = 0.5
    MIN_RELEVANCE_THRESHOLD: float = 0.4

    # LLM Settings
    GEMINI_API_KEY: str = ""

    # Pydantic Settings Configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Instantiate the settings to be imported across the application
settings = Settings()

# Setup basic logging configuration
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("validation-module")
logger.info(f"Loaded configuration for environment: {settings.APP_ENV}")
