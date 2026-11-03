from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.schemas.tutor_schema import HealthResponse
from app.api.routes.tutor import router as tutor_router

app = FastAPI(
    title="Code Collab AI Coding Tutor Microservice",
    description="Adaptive, Socratic AI coding tutor microservice powered by LangChain, LangGraph, and Groq.",
    version="1.0.0",
)

# CORS Middleware (internal communication allowed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats Pydantic validation errors cleanly."""
    errors = exc.errors()
    error_messages = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "")
        error_messages.append(f"{loc}: {msg}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation Error",
            "details": error_messages,
        },
    )


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check():
    """System health check endpoint."""
    return HealthResponse(
        status="ok",
        service="ai-coding-tutor",
        version="1.0.0",
        model=settings.groq_model,
    )


# Mount tutor endpoints
app.include_router(tutor_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.ai_service_port,
        reload=True,
    )
