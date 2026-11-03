import pytest
from app.schemas.tutor_schema import (
    HintRequest,
    ProblemContext,
    PreviousHintItem,
    ProgressCategory,
)
from app.agents.tutor_state import TutorState
from app.agents.tutor_graph import tutor_graph
from app.services.hint_service import generate_hint_content


@pytest.fixture
def sample_problem():
    return ProblemContext(
        title="Merge Sorted Arrays",
        description="Merge two sorted integer arrays into one sorted array in-place.",
        inputFormat="Two arrays nums1 and nums2",
        outputFormat="Merged array nums1",
        constraints="nums1 has length m + n",
    )


@pytest.mark.asyncio
async def test_10_previously_generated_hints_not_repeated(sample_problem, setup_mock_llm):
    """10. Test that previously generated hints are provided in prompt context to avoid repetition."""
    previous_hints = [
        PreviousHintItem(
            hintLevel=1,
            hintTitle="Pointer Strategy",
            hint="Consider iterating from the back of nums1 to avoid overwriting elements.",
        )
    ]

    req = HintRequest(
        problem=sample_problem,
        code="int p1 = m - 1, p2 = n - 1;",
        language="cpp",
        previousHints=previous_hints,
        requestedHintLevel=2,
    )

    state: TutorState = {
        "request": req,
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

    result = await tutor_graph.ainvoke(state)
    assert result["response"].success is True

    # Check mock LLM call history to ensure previous hints were passed in user prompt
    last_call = setup_mock_llm.call_history[-1]
    user_prompt = str(last_call[-1])
    assert "Pointer Strategy" in user_prompt
    assert "iterate from the back" in user_prompt.lower() or "iterating from the back" in user_prompt.lower()


@pytest.mark.asyncio
async def test_15_groq_timeout_handling(sample_problem, setup_mock_llm):
    """15. Test Groq timeout handling produces safe fallback without crash."""
    setup_mock_llm.should_timeout = True

    req = HintRequest(
        problem=sample_problem,
        code="int x = 1;",
        language="cpp",
        requestedHintLevel=1,
    )

    state: TutorState = {
        "request": req,
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

    result = await tutor_graph.ainvoke(state)
    assert result["response"].success is True
    assert len(result["response"].hint) > 0
    assert result["response"].hintLevel == 1


@pytest.mark.asyncio
async def test_16_groq_rate_limit_handling(sample_problem, setup_mock_llm):
    """16. Test Groq rate-limit (HTTP 429) produces safe fallback without crash."""
    setup_mock_llm.should_rate_limit = True

    req = HintRequest(
        problem=sample_problem,
        code="int x = 1;",
        language="cpp",
        requestedHintLevel=2,
    )

    state: TutorState = {
        "request": req,
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

    result = await tutor_graph.ainvoke(state)
    assert result["response"].success is True
    assert len(result["response"].hint) > 0
    assert result["response"].hintLevel == 2


@pytest.mark.asyncio
async def test_17_invalid_llm_response_handling(sample_problem, setup_mock_llm):
    """17. Test invalid/non-JSON LLM response triggers safe fallback."""
    setup_mock_llm.return_invalid_json = True

    req = HintRequest(
        problem=sample_problem,
        code="int x = 1;",
        language="cpp",
        requestedHintLevel=3,
    )

    state: TutorState = {
        "request": req,
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

    result = await tutor_graph.ainvoke(state)
    assert result["response"].success is True
    assert len(result["response"].hint) > 0
    assert result["response"].hintLevel == 3


@pytest.mark.asyncio
async def test_langgraph_workflow_node_order(sample_problem):
    """Verify that LangGraph executes expected sequence of stages."""
    req = HintRequest(
        problem=sample_problem,
        code="vector<int> res;",
        language="cpp",
        requestedHintLevel=1,
    )

    state: TutorState = {
        "request": req,
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

    final_state = await tutor_graph.ainvoke(state)
    # Validate node side effects:
    assert final_state["input_valid"] is True
    assert final_state["progress_category"] is not None
    assert final_state["hint_strategy"] is not None
    assert final_state["raw_hint"] is not None
    assert final_state["validation_attempts"] >= 1
    assert final_state["response"] is not None
    assert final_state["response"].success is True
