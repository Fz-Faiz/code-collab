from fastapi import APIRouter, Header, HTTPException, status, Depends
from typing import Optional
from app.config import settings
from app.schemas.tutor_schema import HintRequest, HintResponse
from app.agents.tutor_state import TutorState
from app.agents.tutor_graph import tutor_graph

router = APIRouter(prefix="/api/tutor", tags=["tutor"])


def verify_service_secret(
    x_service_secret: Optional[str] = Header(None, alias="X-Service-Secret"),
    x_service_key: Optional[str] = Header(None, alias="X-Service-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """Verifies that requests originate from trusted internal services (e.g. Node.js backend).
    Accepts X-Service-Secret, X-Service-Key, or Bearer <secret>.
    """
    expected_secret = settings.ai_service_secret

    token = None
    if x_service_secret:
        token = x_service_secret.strip()
    elif x_service_key:
        token = x_service_key.strip()
    elif authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()

    if not token or token != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid service authentication secret",
        )


@router.post(
    "/hint",
    response_model=HintResponse,
    dependencies=[Depends(verify_service_secret)],
    summary="Generate adaptive, progressive coding hint",
)
async def generate_hint(request: HintRequest):
    """Executes the 6-stage LangGraph adaptive tutoring workflow."""
    # Enforce global character payload limit
    total_len = (
        len(request.problem.title or "")
        + len(request.problem.description or "")
        + len(request.code or "")
        + sum(len(h.hint) for h in request.previousHints)
    )

    if total_len > settings.max_request_chars:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Request size ({total_len} chars) exceeds maximum limit of {settings.max_request_chars} characters",
        )

    initial_state: TutorState = {
        "request": request,
        "input_valid": True,
        "input_errors": [],
        "progress_category": None,
        "progress_rationale": None,
        "hint_strategy": None,
        "raw_hint": None,
        "validated": False,
        "validation_attempts": 0,
        "validation_issues": [],
        "response": None,
    }

    try:
        final_state = await tutor_graph.ainvoke(initial_state)
        response = final_state.get("response")

        if not response:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Workflow completed without generating a response",
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tutor workflow execution failed: {str(e)}",
        )
