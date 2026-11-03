from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class ProgressCategory(str, Enum):
    NO_CODE = "NO_CODE"
    INITIAL_IMPLEMENTATION = "INITIAL_IMPLEMENTATION"
    PARTIAL_IMPLEMENTATION = "PARTIAL_IMPLEMENTATION"
    LOGIC_ISSUE = "LOGIC_ISSUE"
    IMPLEMENTATION_BUG = "IMPLEMENTATION_BUG"
    NEARLY_SOLVED = "NEARLY_SOLVED"
    SOLVED = "SOLVED"


class ProblemContext(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Problem title")
    description: str = Field(..., min_length=1, max_length=30000, description="Markdown problem description")
    inputFormat: str = Field(..., min_length=1, max_length=5000, description="Input specification")
    outputFormat: str = Field(..., min_length=1, max_length=5000, description="Output specification")
    constraints: Optional[str] = Field(default="", max_length=5000, description="Problem constraints")


class TestResultsSummary(BaseModel):
    __test__ = False
    passed: int = Field(default=0, ge=0, description="Number of passed test cases")
    failed: int = Field(default=0, ge=0, description="Number of failed test cases")
    total: int = Field(default=0, ge=0, description="Total number of test cases")
    verdict: Optional[str] = Field(default=None, description="Safe summary verdict string")


class PreviousHintItem(BaseModel):
    hintLevel: int = Field(default=1, ge=1, description="Sequential number of previously received hint")
    hintNumber: Optional[int] = Field(default=None, ge=1, description="Sequential conversation counter (Hint 1, 2, ... N)")
    hintTitle: str = Field(..., min_length=1, max_length=200)
    hint: str = Field(..., min_length=1, max_length=5000)


class HintRequest(BaseModel):
    problem: ProblemContext
    code: str = Field(default="", max_length=40000, description="Student's current source code")
    language: str = Field(..., description="Programming language (cpp, java, python, javascript)")
    testResults: Optional[TestResultsSummary] = None
    previousHints: List[PreviousHintItem] = Field(default_factory=list)
    requestedHintLevel: int = Field(default=1, ge=1, description="Sequential hint number (1, 2, ... N)")
    hintNumber: Optional[int] = Field(default=None, ge=1, description="Sequential hint counter")
    studentQuery: Optional[str] = Field(default="", max_length=2000, description="Student's custom inquiry or doubt")

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        valid_languages = ["cpp", "java", "python", "javascript"]
        normalized = v.strip().lower()
        if normalized not in valid_languages:
            raise ValueError(f"Unsupported language '{v}'. Must be one of: {', '.join(valid_languages)}")
        return normalized

    @field_validator("requestedHintLevel")
    @classmethod
    def validate_hint_level(cls, v: int) -> int:
        if v < 1:
            raise ValueError(f"requestedHintLevel must be a positive integer (>= 1), got {v}")
        return v


class HintResponse(BaseModel):
    success: bool = Field(default=True)
    progressCategory: ProgressCategory
    hintLevel: int = Field(default=1, ge=1, description="Sequential hint counter")
    hintNumber: int = Field(default=1, ge=1, description="Sequential hint counter (Hint 1, 2, ... N)")
    hintTitle: str = Field(..., min_length=1, max_length=200)
    hint: str = Field(..., min_length=1, max_length=5000)
    nextAction: str = Field(..., min_length=1, max_length=1000)
    solved: bool = Field(default=False)
    identifiedBugs: List[str] = Field(default_factory=list, description="Currently focused bug")
    fixedBugs: List[str] = Field(default_factory=list, description="Bugs fixed in this revision")
    remainingBugs: List[str] = Field(default_factory=list, description="Remaining bugs for future hints")


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "ai-coding-tutor"
    version: str = "1.0.0"
    model: str
