import json
import re
from typing import Tuple, Optional
from app.schemas.tutor_schema import (
    HintRequest,
    ProgressCategory,
)
from app.prompts.tutor_prompts import PROGRESS_ANALYSIS_SYSTEM_PROMPT
from app.services.llm_service import llm_service


STARTER_TEMPLATES = [
    r"^\s*#include\s*<iostream>\s*using\s+namespace\s+std;\s*int\s+main\s*\(\)\s*\{\s*return\s+0;\s*\}\s*$",
    r"^\s*public\s+class\s+Main\s*\{\s*public\s+static\s+void\s+main\s*\(String\[\]\s*args\)\s*\{\s*\}\s*\}\s*$",
    r"^\s*import\s+sys\s*def\s+main\s*\(\):\s*pass\s*if\s+__name__\s*==\s*['\"]__main__['\"]:\s*main\(\)\s*$",
    r"^\s*const\s+fs\s*=\s*require\(['\"]fs['\"]\);\s*function\s+main\(\)\s*\{\s*\}\s*main\(\);\s*$",
]


def is_empty_or_boilerplate_code(code: str) -> Tuple[bool, Optional[ProgressCategory]]:
    """Checks whether the code is empty or untouched starter boilerplate."""
    stripped = code.strip()
    if not stripped or len(stripped) < 15:
        return (True, ProgressCategory.NO_CODE)

    # Check if code only contains comments
    lines = [
        line.strip()
        for line in stripped.splitlines()
        if line.strip() and not line.strip().startswith(("//", "#", "/*", "*"))
    ]
    if not lines:
        return (True, ProgressCategory.NO_CODE)

    # Check known starter code regexes
    clean_code = re.sub(r"//.*|/\*[\s\S]*?\*/|#.*", "", stripped)
    for pattern in STARTER_TEMPLATES:
        if re.search(pattern, clean_code, re.DOTALL):
            return (True, ProgressCategory.INITIAL_IMPLEMENTATION)

    return (False, None)


async def analyze_student_progress(request: HintRequest) -> Tuple[ProgressCategory, str]:
    """
    Hybrid progress analyzer combining fast deterministic checks with LLM code reasoning.

    Returns:
        (category: ProgressCategory, rationale: str)
    """
    code = request.code or ""
    test_results = request.testResults

    # 1. Deterministic check: Empty or boilerplate code
    is_boilerplate, detected_cat = is_empty_or_boilerplate_code(code)
    if is_boilerplate and detected_cat is not None:
        if detected_cat == ProgressCategory.NO_CODE:
            return (ProgressCategory.NO_CODE, "Student has not yet written code.")
        return (ProgressCategory.INITIAL_IMPLEMENTATION, "Student has boilerplate template with no core logic.")

    # 2. Deterministic check: Fully passed tests
    if test_results and test_results.total > 0 and test_results.passed == test_results.total:
        return (ProgressCategory.SOLVED, "All automated tests have passed.")

    # 3. Deterministic check: High test passing ratio (nearly solved edge cases)
    if test_results and test_results.total >= 4 and (test_results.passed / test_results.total) >= 0.75:
        return (
            ProgressCategory.NEARLY_SOLVED,
            f"Passing {test_results.passed}/{test_results.total} tests; failing remaining boundary cases.",
        )

    # 4. LLM-assisted Algorithmic & Code Structure Analysis
    try:
        chat_model = llm_service.get_chat_model(temperature=0.1)

        test_summary_str = "No test results available."
        if test_results:
            test_summary_str = (
                f"Passed: {test_results.passed}/{test_results.total} tests. "
                f"Verdict: {test_results.verdict or 'Evaluation Complete'}"
            )

        user_content = f"""Analyze the student's algorithmic progress on the problem:
Problem Title: {request.problem.title}
Problem Description:
{request.problem.description[:1000]}

Constraints:
{request.problem.constraints or 'Standard'}

Programming Language: {request.language}
Student's Current Code:
```{request.language}
{code[:3000]}
```

Test Results Summary:
{test_summary_str}

Requested Hint Level: Level {request.requestedHintLevel}

Determine the student's progress category (NO_CODE, INITIAL_IMPLEMENTATION, PARTIAL_IMPLEMENTATION, LOGIC_ISSUE, IMPLEMENTATION_BUG, NEARLY_SOLVED, SOLVED).
Remember: 0 tests passing might be an IMPLEMENTATION_BUG if the algorithm is correct, or a LOGIC_ISSUE if the algorithm is wrong.
Respond strictly in JSON matching the prompt schema."""

        messages = [
            {"role": "system", "content": PROGRESS_ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        response = await chat_model.ainvoke(messages)
        content = response.content if hasattr(response, "content") else str(response)

        # Parse JSON from response
        clean_json = re.sub(r"^```json\s*|\s*```$", "", content.strip())
        data = json.loads(clean_json)

        cat_str = data.get("category", "").strip().upper()
        reason = data.get("reason", "Analyzed algorithmic structure.")

        if cat_str in ProgressCategory.__members__:
            return (ProgressCategory(cat_str), reason)

    except Exception:
        # Fallback to heuristic categorization if LLM reasoning is unavailable
        pass

    # Heuristic fallback based on code volume and test outcomes
    if test_results and test_results.passed > 0:
        return (ProgressCategory.IMPLEMENTATION_BUG, "Partial tests passing with implementation defect.")
    if len(code.splitlines()) > 15:
        return (ProgressCategory.LOGIC_ISSUE, "Substantial code present but failing initial test cases.")
    return (ProgressCategory.PARTIAL_IMPLEMENTATION, "Code is partially written.")
