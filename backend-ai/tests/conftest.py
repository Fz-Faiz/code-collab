import sys
import os
import pytest
from typing import Dict, Any

# Ensure backend-ai root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.llm_service import llm_service


class MockAIMessage:
    def __init__(self, content: str):
        self.content = content


class MockLLM:
    """Deterministic mock LLM for testing without external Groq API calls."""

    def __init__(self, default_response: Dict[str, Any] = None):
        self.default_response = default_response or {
            "hintTitle": "Consider using two pointers",
            "hint": "Think about sorting the array first, then moving pointers from both ends.",
            "nextAction": "Initialize a left and right pointer.",
        }
        self.call_history = []
        self.should_timeout = False
        self.should_rate_limit = False
        self.return_invalid_json = False
        self.leak_solution = False

    async def ainvoke(self, messages, *args, **kwargs):
        self.call_history.append(messages)

        if self.should_timeout:
            raise TimeoutError("Groq request timed out after 20.0 seconds")

        if self.should_rate_limit:
            raise Exception("Rate limit reached for model llama-3.3-70b-versatile. HTTP 429")

        if self.return_invalid_json:
            return MockAIMessage("This is invalid raw text and not JSON at all.")

        if self.leak_solution:
            return MockAIMessage(
                '{"hintTitle": "Full Solution", "hint": "int main() { cout << 42; return 0; }", "nextAction": "copy paste"}'
            )

        # Check if progress analysis prompt
        user_msg = str(messages[-1])
        if "Determine the student's progress category" in user_msg:
            student_section = user_msg
            if "Student's Current Code:" in user_msg:
                student_section = user_msg.split("Student's Current Code:")[1]

            if "off-by-one" in student_section.lower():
                return MockAIMessage('{"category": "IMPLEMENTATION_BUG", "reason": "Small indexing error"}')
            elif "partial" in student_section.lower():
                return MockAIMessage('{"category": "PARTIAL_IMPLEMENTATION", "reason": "Missing helper"}')
            elif "logic" in student_section.lower():
                return MockAIMessage('{"category": "LOGIC_ISSUE", "reason": "O(N^2) instead of O(N)"}')
            return MockAIMessage('{"category": "PARTIAL_IMPLEMENTATION", "reason": "General partial implementation"}')

        import json
        return MockAIMessage(json.dumps(self.default_response))


@pytest.fixture(autouse=True)
def setup_mock_llm():
    """Automatically replaces LLM with MockLLM for all tests to protect API credits."""
    mock = MockLLM()
    llm_service.set_mock_client(mock)
    yield mock
    llm_service.set_mock_client(None)
