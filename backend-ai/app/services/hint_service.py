import json
import re
from typing import Dict, Any, List
from app.schemas.tutor_schema import (
    HintRequest,
    ProgressCategory,
    PreviousHintItem,
)
from app.prompts.tutor_prompts import SYSTEM_TUTOR_PROMPT
from app.services.llm_service import llm_service


STRATEGY_DESCRIPTIONS: Dict[ProgressCategory, str] = {
    ProgressCategory.NO_CODE: (
        "Case A Directive (No Code Written): Explain in simple language what the problem is asking. "
        "Detail what the input represents, what the expected output represents, what needs calculating, "
        "and any critical constraints. Provide high-level conceptual direction without revealing the complete algorithm or code."
    ),
    ProgressCategory.INITIAL_IMPLEMENTATION: (
        "Case B Directive (Initial Structure Outline): Analyze the student's starter outline. "
        "Identify what is correct, what is missing, and guide them on the next concrete logical building block to implement."
    ),
    ProgressCategory.PARTIAL_IMPLEMENTATION: (
        "Case B Directive (Partial Implementation): Analyze the actual code in detail. "
        "Explicitly mention which part of their logic is already correct, which logical step is incomplete, "
        "and what specific component or function they should implement next."
    ),
    ProgressCategory.LOGIC_ISSUE: (
        "Case C Directive (Algorithmic / Logic Issue): Analyze their algorithm against the problem constraints. "
        "Explain why the current approach will fail or exceed time/memory bounds. "
        "Clarify which assumption is incorrect and suggest a suitable alternative algorithm that meets the constraints."
    ),
    ProgressCategory.IMPLEMENTATION_BUG: (
        "Case D/E Directive (Implementation Bug / Loop / Indexing / Condition): "
        "ONE BUG AT A TIME: Focus strictly on the single most critical mistake. "
        "State where it is, why it is wrong, and give a debugging direction. If a previously pointed out bug has now been fixed, acknowledge that progress!"
    ),
    ProgressCategory.NEARLY_SOLVED: (
        "Case F Directive (Nearly Solved / Most Test Cases Pass): Focus strictly on corner and boundary cases. "
        "Investigate potential failures involving negative numbers, duplicate values, extreme constraints, zero, "
        "minimum input size, integer overflow, or trailing formatting. Do NOT repeat basic conceptual explanations."
    ),
    ProgressCategory.SOLVED: (
        "Case G Directive (All Tests Pass - Solved): Congratulate the student on passing all test cases! "
        "Summarize the key algorithmic concept they demonstrated and thoroughly explain time and space complexity ($O(N)$, etc.). "
        "Mark the session as solved and do not provide further debugging hints."
    ),
}


def build_tutor_user_prompt(
    request: HintRequest,
    category: ProgressCategory,
    strategy_desc: str,
    hint_counter: int,
) -> str:
    """Constructs prompt containing student context without leaking hidden tests or complete code."""
    prev_hints_text = "None. This is the student's first hint for this problem."
    if request.previousHints:
        lines = []
        for idx, h in enumerate(request.previousHints, 1):
            h_num = getattr(h, "hintNumber", None) or getattr(h, "hintLevel", None) or idx
            lines.append(f"- Hint #{h_num} [{h.hintTitle}]: {h.hint}")
        prev_hints_text = "\n".join(lines)

    test_info = "No test runs executed yet."
    if request.testResults:
        test_info = (
            f"Automated Tests Evaluated: {request.testResults.total} total. "
            f"Passed: {request.testResults.passed}, Failed: {request.testResults.failed}. "
            f"Verdict: {request.testResults.verdict or 'N/A'}"
        )

    code_snippet = request.code.strip() if request.code and request.code.strip() else "(Student has not written code yet)"

    student_query_section = ""
    if request.studentQuery and request.studentQuery.strip():
        student_query_section = f"\n---\nSTUDENT'S DIRECT INQUIRY / DOUBT:\n\"{request.studentQuery.strip()}\"\n(Make sure to address this specific question in your guidance!)"

    # Detect if student is stuck without code changes
    stuck_instruction = ""
    if len(request.previousHints) >= 1:
        stuck_instruction = """
NOTE ON STUDENT ITERATION:
Inspect whether the student's code has changed or if they are asking another question on the same code.
- If code contains new changes: Evaluate if the previously identified issue was fixed. If fixed, acknowledge the fix and identify the next issue.
- If code has NOT changed (student is stuck or asked for another explanation): DO NOT repeat the previous response! Explain using a different angle/analogy, suggest a small manual trace with concrete numbers, or ask a guiding diagnostic question."""

    prompt = f"""PROBLEM SPECIFICATION (Ground your entire response in this problem):
Problem Title: {request.problem.title}
Problem Description:
{request.problem.description}

Input Format:
{request.problem.inputFormat}

Output Format:
{request.problem.outputFormat}

Constraints:
{request.problem.constraints or 'Standard time and memory constraints'}

---
STUDENT'S CURRENT WORKSPACE:
Programming Language: {request.language}
Current Code:
```{request.language}
{code_snippet}
```

Test Results Summary:
{test_info}
{student_query_section}

---
PREVIOUS HINTS IN THIS SESSION:
{prev_hints_text}

---
PEDAGOGICAL DIRECTIVES:
Conversation Turn: Hint #{hint_counter}
Assessed Progress Category: {category.value}
{strategy_desc}
{stuck_instruction}

IMPORTANT INSTRUCTIONS:
1. Focus on ONE bug or missing step at a time.
2. If student has fixed a previous bug, acknowledge the progress.
3. If student is stuck without code changes, offer a fresh perspective or manual trace rather than repeating earlier text.
4. Keep illustrative code snippets to at most 1 to 3 lines. Never give the complete solution.

Respond strictly with valid JSON:
{{
  "hintTitle": "...",
  "hint": "...",
  "nextAction": "...",
  "identifiedBugs": ["..."],
  "fixedBugs": ["..."],
  "remainingBugs": ["..."],
  "solved": false
}}"""
    return prompt


async def generate_hint_content(
    request: HintRequest,
    category: ProgressCategory,
    attempt: int = 1,
) -> Dict[str, Any]:
    """Generates adaptive, unlimited hint via Groq LLM."""
    hint_counter = request.hintNumber or request.requestedHintLevel or (len(request.previousHints) + 1)

    # Special handling for already SOLVED code (from verified test results)
    is_solved = (
        category == ProgressCategory.SOLVED
        or (request.testResults and request.testResults.verdict == "Accepted")
        or (request.testResults and request.testResults.total > 0 and request.testResults.passed == request.testResults.total)
    )

    if is_solved:
        return {
            "hintTitle": f"Solved: {request.problem.title}!",
            "hint": f"Congratulations! Your solution for '{request.problem.title}' has passed all automated tests. Great job working through the logic step-by-step!",
            "nextAction": "Review your algorithm's time and space complexity, and proceed to the next challenge.",
            "identifiedBugs": [],
            "fixedBugs": ["All algorithmic requirements and edge cases successfully resolved."],
            "remainingBugs": [],
            "solved": True,
        }

    strategy_desc = STRATEGY_DESCRIPTIONS.get(
        category,
        "Guide the student using progressive inquiry grounded in the problem requirements."
    )

    user_prompt = build_tutor_user_prompt(
        request=request,
        category=category,
        strategy_desc=strategy_desc,
        hint_counter=hint_counter,
    )

    if attempt > 1:
        user_prompt += "\n\nCRITICAL REMINDER: A previous attempt was flagged for possible code leakage or repetition. Ensure this output contains NO full programs, NO execution claims, references the problem's actual variables, and provides a fresh, targeted educational direction."

    chat_model = llm_service.get_chat_model(temperature=0.3)

    messages = [
        {"role": "system", "content": SYSTEM_TUTOR_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    response = await chat_model.ainvoke(messages)
    raw_content = response.content if hasattr(response, "content") else str(response)

    # Clean code fences if any
    clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_content.strip())
    data = json.loads(clean_json)

    if not isinstance(data, dict):
        raise ValueError("Model response is not a valid JSON dictionary")

    identified_bugs = data.get("identifiedBugs", [])
    if isinstance(identified_bugs, str):
        identified_bugs = [identified_bugs]

    fixed_bugs = data.get("fixedBugs", [])
    if isinstance(fixed_bugs, str):
        fixed_bugs = [fixed_bugs]

    remaining_bugs = data.get("remainingBugs", [])
    if isinstance(remaining_bugs, str):
        remaining_bugs = [remaining_bugs]

    return {
        "hintTitle": str(data.get("hintTitle", f"Hint #{hint_counter}")).strip(),
        "hint": str(data.get("hint", "")).strip(),
        "nextAction": str(data.get("nextAction", "Continue writing your solution.")).strip(),
        "identifiedBugs": identified_bugs,
        "fixedBugs": fixed_bugs,
        "remainingBugs": remaining_bugs,
        "solved": bool(data.get("solved", False)),
    }
