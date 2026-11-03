from app.agents.tutor_state import TutorState
from app.schemas.tutor_schema import (
    HintResponse,
    ProgressCategory,
)
from app.services.progress_analyzer import analyze_student_progress
from app.services.hint_service import (
    generate_hint_content,
    STRATEGY_DESCRIPTIONS,
)
from app.utils.response_validator import (
    validate_hint_payload,
    generate_safe_fallback_hint,
)


async def validate_input_node(state: TutorState) -> TutorState:
    """Node 1: Validates incoming request parameters and payload bounds."""
    request = state["request"]
    errors = []

    if not request.problem or not request.problem.title.strip():
        errors.append("Problem title is missing")

    if not request.problem or not request.problem.description.strip():
        errors.append("Problem description is missing")

    if request.requestedHintLevel is not None and request.requestedHintLevel < 1:
        errors.append(f"Invalid hint number {request.requestedHintLevel}. Must be >= 1")

    valid_languages = ["cpp", "java", "python", "javascript"]
    if request.language not in valid_languages:
        errors.append(f"Unsupported language '{request.language}'. Supported: {', '.join(valid_languages)}")

    total_chars = (
        len(request.problem.title or "")
        + len(request.problem.description or "")
        + len(request.code or "")
        + sum(len(h.hint) for h in request.previousHints)
    )

    if total_chars > 60000:
        errors.append(f"Request payload size ({total_chars} chars) exceeds maximum allowable limit (60000 chars)")

    state["input_valid"] = len(errors) == 0
    state["input_errors"] = errors
    return state


async def analyze_progress_node(state: TutorState) -> TutorState:
    """Node 2: Hybrid progress analysis combining deterministic checks with LLM reasoning."""
    if not state.get("input_valid", True):
        return state

    category, rationale = await analyze_student_progress(state["request"])
    state["progress_category"] = category
    state["progress_rationale"] = rationale
    return state


async def select_strategy_node(state: TutorState) -> TutorState:
    """Node 3: Selects pedagogical strategy mapped to the student's progress and hint level."""
    if not state.get("input_valid", True):
        return state

    category = state.get("progress_category") or ProgressCategory.NO_CODE
    strategy = STRATEGY_DESCRIPTIONS.get(
        category,
        "Guide the student through conceptual Socratic questions."
    )
    state["hint_strategy"] = strategy
    return state


async def generate_hint_node(state: TutorState) -> TutorState:
    """Node 4: Generates progressive hint adhering strictly to strategy and requested level."""
    if not state.get("input_valid", True):
        return state

    attempts = state.get("validation_attempts", 0) + 1
    state["validation_attempts"] = attempts

    category = state.get("progress_category") or ProgressCategory.NO_CODE

    try:
        raw_hint = await generate_hint_content(
            request=state["request"],
            category=category,
            attempt=attempts,
        )
        state["raw_hint"] = raw_hint
    except Exception as e:
        # Fallback to safe template if LLM service is temporarily unreachable
        fallback = generate_safe_fallback_hint(
            category=category,
            hint_level=state["request"].requestedHintLevel,
            problem_title=state["request"].problem.title,
        )
        state["raw_hint"] = fallback

    return state


async def validate_response_node(state: TutorState) -> TutorState:
    """Node 5: Validates generated hint against code leakage, execution claims, and repetition."""
    if not state.get("input_valid", True):
        return state

    raw_hint = state.get("raw_hint") or {}
    previous_hints = state["request"].previousHints
    hint_level = state["request"].requestedHintLevel

    is_valid, issues = validate_hint_payload(
        hint_payload=raw_hint,
        previous_hints=previous_hints,
        hint_level=hint_level,
    )

    state["validated"] = is_valid
    state["validation_issues"] = issues
    return state


async def finalize_response_node(state: TutorState) -> TutorState:
    """Node 6: Finalizes structured Pydantic response or applies safe fallback if validation failed."""
    request = state["request"]

    # If input validation failed
    hint_num = request.hintNumber or request.requestedHintLevel or (len(request.previousHints) + 1)
    if not state.get("input_valid", True):
        error_msg = "; ".join(state.get("input_errors", ["Invalid request parameters"]))
        state["response"] = HintResponse(
            success=False,
            progressCategory=ProgressCategory.NO_CODE,
            hintLevel=hint_num,
            hintNumber=hint_num,
            hintTitle="Validation Error",
            hint=error_msg,
            nextAction="Correct request parameters and retry.",
            solved=False,
        )
        return state

    category = state.get("progress_category") or ProgressCategory.NO_CODE
    raw_hint = state.get("raw_hint")

    # If hint was validated, use it; otherwise apply safe fallback
    if state.get("validated", False) and raw_hint:
        final_payload = raw_hint
    else:
        final_payload = generate_safe_fallback_hint(
            category=category,
            hint_level=hint_num,
            problem_title=request.problem.title,
        )

    is_solved = bool(
        final_payload.get("solved", False)
        or category == ProgressCategory.SOLVED
        or (request.testResults and request.testResults.verdict == "Accepted")
    )

    state["response"] = HintResponse(
        success=True,
        progressCategory=category,
        hintLevel=hint_num,
        hintNumber=hint_num,
        hintTitle=final_payload.get("hintTitle", f"Hint #{hint_num}"),
        hint=final_payload.get("hint", ""),
        nextAction=final_payload.get("nextAction", "Continue solving the problem."),
        solved=is_solved,
        identifiedBugs=final_payload.get("identifiedBugs", []),
        fixedBugs=final_payload.get("fixedBugs", []),
        remainingBugs=final_payload.get("remainingBugs", []),
    )
    return state
