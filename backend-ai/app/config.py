from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Configuration settings for the AI Tutor microservice."""

    # Server configuration
    ai_service_port: int = Field(default=8000, alias="AI_SERVICE_PORT")
    ai_service_secret: str = Field(default="dev_ai_secret_codecollab", alias="AI_SERVICE_SECRET")

    # Groq LLM configuration
    groq_api_key: Optional[str] = Field(default=None, alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_MODEL")
    groq_temperature: float = Field(default=0.3, alias="GROQ_TEMPERATURE")
    groq_max_tokens: int = Field(default=1024, alias="GROQ_MAX_TOKENS")
    groq_request_timeout: float = Field(default=20.0, alias="GROQ_REQUEST_TIMEOUT")

    # Security and payload bounds
    max_request_chars: int = Field(default=60000, alias="MAX_REQUEST_CHARS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
