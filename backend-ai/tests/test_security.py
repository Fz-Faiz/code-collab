import pytest
from app.schemas.tutor_schema import (
    HintRequest,
    ProblemContext,
)
from app.utils.response_validator import validate_hint_payload
from app.agents.tutor_state import TutorState
from app.agents.tutor_graph import tutor_graph


@pytest.fixture
def problem_context():
    return ProblemContext(
        title="Invert Binary Tree",
        description="Invert a binary tree left to right.",
        inputFormat="Tree root",
        outputFormat="Inverted root",
    )


def test_18_complete_solution_leakage_prevention():
    """18. Test that response validator catches complete programs and triggers guardrail."""
    # Attempting to leak a complete C++ program
    leak_payload = {
        "hintTitle": "Solution Code",
        "hint": "Here is the answer:\n```cpp\n#include <iostream>\nusing namespace std;\nint main() {\n    cout << 42;\n    return 0;\n}\n```",
        "nextAction": "Copy this code into your editor.",
    }

    is_valid, issues = validate_hint_payload(leak_payload, previous_hints=[], hint_level=1)
    assert is_valid is False
    assert any("Leakage detected" in issue for issue in issues)


@pytest.mark.asyncio
async def test_18_leakage_triggers_safe_fallback(problem_context, setup_mock_llm):
    """18b. Test that complete solution leakage in LLM triggers guardrail fallback."""
    setup_mock_llm.leak_solution = True

    req = HintRequest(
        problem=problem_context,
        code="TreeNode* invertTree(TreeNode* root) {",
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
    # Must succeed with a sanitized safe fallback that contains NO main function or full solution
    assert result["response"].success is True
    assert "int main()" not in result["response"].hint
    assert "return 0;" not in result["response"].hint


def test_19_hidden_test_information_exclusion():
    """19. Verify that schema and validator exclude hidden test inputs and execution claims."""
    # Schema check: HintRequest problem model has no hiddenTestCases attribute
    req_fields = ProblemContext.model_fields.keys()
    assert "hiddenTestCases" not in req_fields
    assert "hidden_test_cases" not in req_fields

    # Validator check: Blocks claims of running hidden tests
    claim_payload = {
        "hintTitle": "Hidden Test Failure",
        "hint": "When I tested your program against hidden test case #4, it produced 0 instead of 1.",
        "nextAction": "Fix the secret test condition.",
    }
    is_valid, issues = validate_hint_payload(claim_payload, previous_hints=[], hint_level=3)
    assert is_valid is False
    assert any("claim detected" in issue for issue in issues)


def test_20_no_conversation_transcript_persistence():
    """20. Test that microservice has no database persistence layer for student chat transcripts."""
    import importlib.util
    import os

    app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../app"))

    # Verify no sqlite or persistent database files are created
    db_extensions = [".db", ".sqlite", ".sqlite3"]
    for root, _, files in os.walk(app_dir):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            assert ext not in db_extensions, f"Forbidden persistent database file found: {file}"

    # Verify state graph is in-memory only (no MongoDB or SQL engine imported)
    from app.agents import tutor_graph as tg_module
    graph_source = open(tg_module.__file__, "r", encoding="utf-8").read()
    assert "pymongo" not in graph_source
    assert "sqlite3" not in graph_source
    assert "sqlalchemy" not in graph_source
