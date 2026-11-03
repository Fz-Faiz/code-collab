import pytest
from app.schemas.tutor_schema import (
    HintRequest,
    ProblemContext,
    TestResultsSummary,
    ProgressCategory,
)
from app.services.progress_analyzer import (
    analyze_student_progress,
    is_empty_or_boilerplate_code,
)


@pytest.fixture
def base_problem():
    return ProblemContext(
        title="Find Maximum Element",
        description="Given an array of integers, output the maximum value.",
        inputFormat="Size N followed by N integers",
        outputFormat="Single integer maximum",
        constraints="1 <= N <= 10^5",
    )


def test_5_empty_code_handling():
    """5. Test empty code handling."""
    # Completely empty
    is_empty, cat = is_empty_or_boilerplate_code("")
    assert is_empty is True
    assert cat == ProgressCategory.NO_CODE

    # Whitespace only
    is_empty, cat = is_empty_or_boilerplate_code("   \n\t  ")
    assert is_empty is True
    assert cat == ProgressCategory.NO_CODE

    # Comment only
    is_empty, cat = is_empty_or_boilerplate_code("// Just a comment\n/* multi line */")
    assert is_empty is True
    assert cat == ProgressCategory.NO_CODE


@pytest.mark.asyncio
async def test_6_no_code_conceptual_hint(base_problem):
    """6. Test no-code produces NO_CODE category."""
    req = HintRequest(
        problem=base_problem,
        code="",
        language="python",
        requestedHintLevel=1,
    )
    category, rationale = await analyze_student_progress(req)
    assert category == ProgressCategory.NO_CODE


@pytest.mark.asyncio
async def test_7_partial_implementation_hint(base_problem):
    """7. Test partial implementation categorization."""
    req = HintRequest(
        problem=base_problem,
        code="def solve(arr):\n    # partial logic\n    ans = 0\n    for x in arr:\n        pass",
        language="python",
        testResults=TestResultsSummary(passed=0, failed=5, total=5, verdict="Wrong Answer"),
        requestedHintLevel=2,
    )
    category, rationale = await analyze_student_progress(req)
    assert category in [ProgressCategory.PARTIAL_IMPLEMENTATION, ProgressCategory.LOGIC_ISSUE]


@pytest.mark.asyncio
async def test_8_implementation_bug_debugging_hint(base_problem):
    """8. Test implementation bug categorization."""
    req = HintRequest(
        problem=base_problem,
        code="int findMax(vector<int>& a) {\n    int mx = a[0];\n    for (int i = 1; i <= a.size(); ++i) {\n        // bug: off-by-one index error\n        mx = max(mx, a[i]);\n    }\n    return mx;\n}",
        language="cpp",
        testResults=TestResultsSummary(passed=2, failed=3, total=5, verdict="Runtime Error"),
        requestedHintLevel=3,
    )
    category, rationale = await analyze_student_progress(req)
    assert category in [ProgressCategory.IMPLEMENTATION_BUG, ProgressCategory.PARTIAL_IMPLEMENTATION]


@pytest.mark.asyncio
async def test_9_nearly_solved_edge_case_hint(base_problem):
    """9. Test nearly solved edge-case categorization (>= 75% tests passing)."""
    req = HintRequest(
        problem=base_problem,
        code="def find_max(a): return max(a) if a else 0",
        language="python",
        testResults=TestResultsSummary(passed=8, failed=2, total=10, verdict="Wrong Answer"),
        requestedHintLevel=4,
    )
    category, rationale = await analyze_student_progress(req)
    assert category == ProgressCategory.NEARLY_SOLVED


@pytest.mark.asyncio
async def test_solved_categorization(base_problem):
    """Test 100% test pass produces SOLVED category."""
    req = HintRequest(
        problem=base_problem,
        code="def find_max(a): return max(a)",
        language="python",
        testResults=TestResultsSummary(passed=10, failed=0, total=10, verdict="Accepted"),
        requestedHintLevel=1,
    )
    category, rationale = await analyze_student_progress(req)
    assert category == ProgressCategory.SOLVED
