import os
from typing import Optional, Any
from app.config import settings


class LLMService:
    """Manages LangChain Groq model instances with timeout, token limits, and fallback configurations."""

    def __init__(self):
        self._mock_client: Optional[Any] = None

    def set_mock_client(self, mock_client: Any):
        """Allows test suites to inject deterministic mock LLM clients."""
        self._mock_client = mock_client

    def get_chat_model(
        self,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        timeout: Optional[float] = None,
    ):
        """Returns configured ChatGroq instance or injected mock client."""
        if self._mock_client is not None:
            return self._mock_client

        api_key = settings.groq_api_key or os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY is not configured in environment. "
                "Provide a valid key in backend-ai/.env or environment variables."
            )

        from langchain_groq import ChatGroq

        return ChatGroq(
            api_key=api_key,
            model=settings.groq_model,
            temperature=temperature if temperature is not None else settings.groq_temperature,
            max_tokens=max_tokens if max_tokens is not None else settings.groq_max_tokens,
            timeout=timeout if timeout is not None else settings.groq_request_timeout,
            max_retries=2,
        )


llm_service = LLMService()
