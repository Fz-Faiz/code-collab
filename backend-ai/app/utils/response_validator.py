import re
from typing import Dict, List, Tuple
from app.schemas.tutor_schema import PreviousHintItem, ProgressCategory


COMPLETE_CODE_PATTERNS = [
    # Full executable programs
    r"int\s+main\s*\([^)]*\)\s*\{",
    r"public\s+static\s+void\s+main\s*\(",
    r"def\s+main\s*\([^)]*\)\s*:",
    r"#include\s*<iostream>[\s\S]*return\s+0;",
    r"import\s+sys[\s\S]*if\s+__name__\s*==\s*['\"]__main__['\"]:",
    r"fs\.readFileSync\(0,[\s\S]*console\.log\(",

    # Full function/method solutions (C++, Java, Python, JavaScript)
    r"(?:vector\s*<[^>]+>|int|void|string|bool|boolean|double)\s+\w+\s*\([^)]*\)\s*\{[\s\S]{10,}(?:for|while)[\s\S]{10,}return\s+[^;]+;?\s*\}",
    r"public\s+(?:int\[\]|int|void|String|boolean|List<[^>]+>)\s+\w+\s*\([^)]*\)\s*\{[\s\S]{10,}(?:for|while)[\s\S]{10,}return\s+[^;]+;?\s*\}",
    r"def\s+\w+\s*\([^)]*\)\s*:[\s\S]{10,}(?:for|while)[\s\S]{10,}return\s+",
    r"function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{10,}(?:for|while)[\s\S]{10,}return\s+[^;]+;?\s*\}",
    r"const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]{10,}(?:for|while)[\s\S]{10,}return\s+[^;]+;?\s*\}",

    # Complete solutions in pseudocode
    r"(?:algorithm|procedure|pseudocode)\s*:\s*[\s\S]{20,}(?:for|while|loop)[\s\S]{15,}(?:return|output)\s+",
    r"BEGIN[\s\S]{20,}(?:FOR|WHILE)[\s\S]{15,}RETURN[\s\S]*?END",
]

EXECUTION_CLAIM_PATTERNS = [
    r"i\s+(?:have\s+)?(?:executed|run|compiled)\s+your\s+code",
    r"running\s+your\s+code\s+(?:gave|produced|yielded)",
    r"i\s+tested\s+your\s+program\s+against",
    r"when\s+i\s+ran\s+it",
]

HIDDEN_TEST_CLAIM_PATTERNS = [
    r"hidden\s+test(?:\s+case)?\s*(?:#?\d+)?\s*(?:is|contains|expects|uses)",
    r"the\s+secret\s+test",
]


def validate_hint_payload(
    hint_payload: Dict[str, str],
    previous_hints: List[PreviousHintItem],
    hint_level: int,
) -> Tuple[bool, List[str]]:
    """
    Validates the generated hint text against pedagogical and security guardrails.

    Returns:
        (is_valid: bool, issues: List[str])
    """
    issues = []
    hint_text = hint_payload.get("hint", "")
    hint_title = hint_payload.get("hintTitle", "")
    next_action = hint_payload.get("nextAction", "")
    combined_text = f"{hint_title}\n{hint_text}\n{next_action}"

    if not hint_text.strip():
        issues.append("Hint text is empty")

    if not hint_title.strip():
        issues.append("Hint title is empty")

    # 1. Complete solution leakage check
    for pattern in COMPLETE_CODE_PATTERNS:
        if re.search(pattern, combined_text, re.IGNORECASE):
            issues.append(f"Leakage detected: Response contains complete executable program structure ({pattern})")
            break

    # If code blocks in hint exceed 8 lines, treat as excessive code
    code_blocks = re.findall(r"```[\w]*\n([\s\S]*?)```", hint_text)
    for block in code_blocks:
        if len(block.strip().split("\n")) > 8:
            issues.append("Code snippet in hint exceeds maximum allowable tutorial length (8 lines)")

    # 2. Execution claim check
    for pattern in EXECUTION_CLAIM_PATTERNS:
        if re.search(pattern, combined_text, re.IGNORECASE):
            issues.append("Execution claim detected: AI falsely claimed to execute student code")
            break

    # 3. Hidden test leakage/claim check
    for pattern in HIDDEN_TEST_CLAIM_PATTERNS:
        if re.search(pattern, combined_text, re.IGNORECASE):
            issues.append("Hidden test claim detected: AI referenced hidden test contents")
            break

    # 4. Repetition check against previous hints
    for prev in previous_hints:
        # Check if the title or majority of hint text is an exact duplicate
        if hint_title.strip().lower() == prev.hintTitle.strip().lower():
            issues.append(f"Repetitive hint title: matches previous hint #{prev.hintLevel}")
            break

        # Check for substantial string overlap (> 75% identical characters in sequence)
        if prev.hint.strip().lower() in hint_text.strip().lower() and len(prev.hint) > 40:
            issues.append("Repetitive hint body: contains complete previous hint text")
            break

    return (len(issues) == 0, issues)


def generate_safe_fallback_hint(
    category: ProgressCategory,
    hint_level: int,
    problem_title: str,
) -> Dict[str, str]:
    """Generates a safe pedagogical fallback hint when validation or provider fails."""
    if category == ProgressCategory.SOLVED:
        return {
            "hintTitle": f"Solved: {problem_title}!",
            "hint": f"Your solution for '{problem_title}' successfully meets all requirements and test constraints.",
            "nextAction": "Review the time and space complexity of your approach.",
        }

    if category == ProgressCategory.NO_CODE or hint_level == 1:
        return {
            "hintTitle": f"Understanding {problem_title}",
            "hint": f"Carefully review the requirements for '{problem_title}'. Consider what the inputs represent, what the target output requires, and what relationship connects them. Determine which data structure or traversal method naturally models this problem before writing code.",
            "nextAction": "Write down the step-by-step logic in plain words before writing code.",
        }

    if category == ProgressCategory.NEARLY_SOLVED or hint_level == 4:
        return {
            "hintTitle": f"Boundary Analysis for {problem_title}",
            "hint": f"Your core logic for '{problem_title}' is close to complete. Examine corner cases: Does your solution handle negative numbers, duplicate values, zero, or the minimum allowed input size according to the constraints?",
            "nextAction": "Trace your program with boundary values to identify where edge cases might fail.",
        }

    if category == ProgressCategory.IMPLEMENTATION_BUG or hint_level == 3:
        return {
            "hintTitle": "Check Loop Bounds & Variables",
            "hint": f"Your algorithmic strategy for '{problem_title}' is heading in the right direction. Inspect your loop termination conditions, array index offsets (e.g. 0-based indexing), and verify that all tracking variables are properly initialized and updated.",
            "nextAction": "Trace through one iteration manually with a small sample input to verify variable states.",
        }

    # Level 2 / Default Approach guidance
    return {
        "hintTitle": f"Structuring {problem_title}",
        "hint": f"Break down '{problem_title}' into three sub-tasks: (1) read and store the inputs properly, (2) apply your core processing logic iteratively or recursively, and (3) format the output strictly as expected.",
        "nextAction": "Outline the main processing loop or helper functions to structure your approach.",
    }
