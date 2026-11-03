import pytest
from app.utils.response_validator import validate_hint_payload


def test_complete_cpp_solution_caught():
    """Verify complete C++ solution is caught."""
    payload = {
        "hintTitle": "Here is the C++ solution",
        "hint": "You can solve it like this:\nvector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> seen;\n    for (int i = 0; i < nums.size(); ++i) {\n        int comp = target - nums[i];\n        if (seen.count(comp)) return {seen[comp], i};\n        seen[nums[i]] = i;\n    }\n    return {};\n}",
        "nextAction": "Paste this in your file",
    }
    is_valid, issues = validate_hint_payload(payload, [], 1)
    assert is_valid is False
    assert any("Leakage detected" in i for i in issues)


def test_complete_python_solution_caught():
    """Verify complete Python solution is caught."""
    payload = {
        "hintTitle": "Python answer",
        "hint": "Here is the code:\ndef two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n    return []",
        "nextAction": "Use this code",
    }
    is_valid, issues = validate_hint_payload(payload, [], 1)
    assert is_valid is False
    assert any("Leakage detected" in i for i in issues)


def test_complete_javascript_solution_caught():
    """Verify complete JavaScript solution is caught."""
    payload = {
        "hintTitle": "JavaScript answer",
        "hint": "Use this function:\nfunction twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        if (map.has(target - nums[i])) {\n            return [map.get(target - nums[i]), i];\n        }\n        map.set(nums[i], i);\n    }\n    return [];\n}",
        "nextAction": "Add to main.js",
    }
    is_valid, issues = validate_hint_payload(payload, [], 1)
    assert is_valid is False
    assert any("Leakage detected" in i for i in issues)


def test_complete_java_solution_caught():
    """Verify complete Java solution is caught."""
    payload = {
        "hintTitle": "Java code",
        "hint": "Here is the method:\npublic int[] twoSum(int[] nums, int target) {\n    Map<Integer, Integer> map = new HashMap<>();\n    for (int i = 0; i < nums.length; i++) {\n        int diff = target - nums[i];\n        if (map.containsKey(diff)) {\n            return new int[]{map.get(diff), i};\n        }\n        map.put(nums[i], i);\n    }\n    return new int[]{};\n}",
        "nextAction": "Paste in Main",
    }
    is_valid, issues = validate_hint_payload(payload, [], 1)
    assert is_valid is False
    assert any("Leakage detected" in i for i in issues)


def test_complete_pseudocode_caught():
    """Verify complete pseudocode solution is caught."""
    payload = {
        "hintTitle": "Pseudocode",
        "hint": "Algorithm:\n    create hash map seen\n    for each index i and value x in array:\n        if target - x exists in seen:\n            return index of target - x and i\n        store seen[x] = i\n    return empty",
        "nextAction": "Convert to code",
    }
    is_valid, issues = validate_hint_payload(payload, [], 1)
    assert is_valid is False
    assert any("Leakage detected" in i for i in issues)


def test_excessive_implementation_detail_caught():
    """Verify code snippets exceeding 8 lines are caught as excessive detail."""
    payload = {
        "hintTitle": "Long snippet",
        "hint": "Look at this snippet:\n```python\nline 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9\nline 10\n```",
        "nextAction": "Review",
    }
    is_valid, issues = validate_hint_payload(payload, [], 1)
    assert is_valid is False
    assert any("exceeds maximum allowable tutorial length" in i for i in issues)


def test_legitimate_short_code_and_concept_allowed():
    """Verify legitimate short syntax tips and conceptual guidance are NOT blocked."""
    payload = {
        "hintTitle": "Use a Hash Map",
        "hint": "To achieve O(N) lookup time, consider using `unordered_map<int, int>` to store elements you have already seen. When you inspect `nums[i]`, you can check if `target - nums[i]` is in the map.",
        "nextAction": "Declare an unordered_map before your main loop.",
    }
    is_valid, issues = validate_hint_payload(payload, [], 1)
    assert is_valid is True
    assert len(issues) == 0


def test_short_loop_snippet_allowed():
    """Verify 2-3 line syntax references are allowed."""
    payload = {
        "hintTitle": "Reverse Iteration",
        "hint": "Try iterating backwards through the array:\n```cpp\nfor (int i = n - 1; i >= 0; --i) {\n    // check condition\n}\n```\nThis avoids shifting elements.",
        "nextAction": "Update your loop header.",
    }
    is_valid, issues = validate_hint_payload(payload, [], 3)
    assert is_valid is True
    assert len(issues) == 0
