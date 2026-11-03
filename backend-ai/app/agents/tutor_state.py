from typing import TypedDict, Optional, List, Dict, Any
from app.schemas.tutor_schema import HintRequest, HintResponse, ProgressCategory


class TutorState(TypedDict):
    """LangGraph state representation for the adaptive tutor workflow."""

    # Incoming student request
    request: HintRequest

    # Node 1: Input validation status
    input_valid: bool
    input_errors: List[str]

    # Node 2: Progress analysis
    progress_category: Optional[ProgressCategory]
    progress_rationale: Optional[str]

    # Node 3: Selected hint strategy
    hint_strategy: Optional[str]

    # Node 4: Generated raw hint payload
    raw_hint: Optional[Dict[str, Any]]

    # Node 5: Response validation status
    validated: bool
    validation_attempts: int
    validation_issues: List[str]

    # Node 6: Final structured response
    response: Optional[HintResponse]
