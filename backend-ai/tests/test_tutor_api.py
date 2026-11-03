import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings

SECRET_HEADER = {"X-Service-Secret": settings.ai_service_secret}


@pytest.mark.asyncio
async def test_1_health_endpoint():
    """1. Test FastAPI health endpoint."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "ai-coding-tutor"
        assert data["model"] == settings.groq_model


@pytest.mark.asyncio
async def test_2_valid_hint_request():
    """2. Test valid hint request."""
    payload = {
        "problem": {
            "title": "Two Sum",
            "description": "Given an array of integers, return indices of two numbers that add up to target.",
            "inputFormat": "Array of integers and target integer",
            "outputFormat": "Two space-separated indices",
            "constraints": "2 <= n <= 10^5",
        },
        "code": "vector<int> twoSum(vector<int>& nums, int target) {",
        "language": "cpp",
        "testResults": {"passed": 0, "failed": 5, "total": 5, "verdict": "Wrong Answer"},
        "previousHints": [],
        "requestedHintLevel": 1,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/tutor/hint", json=payload, headers=SECRET_HEADER)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["hintLevel"] == 1
        assert "hintTitle" in data and len(data["hintTitle"]) > 0
        assert "hint" in data and len(data["hint"]) > 0
        assert "nextAction" in data and len(data["nextAction"]) > 0
        assert data["solved"] is False


@pytest.mark.asyncio
async def test_3_invalid_language():
    """3. Test invalid language rejection."""
    payload = {
        "problem": {
            "title": "Two Sum",
            "description": "Problem description here",
            "inputFormat": "Input",
            "outputFormat": "Output",
        },
        "code": "puts 'hello'",
        "language": "ruby",  # unsupported language
        "requestedHintLevel": 1,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/tutor/hint", json=payload, headers=SECRET_HEADER)
        assert response.status_code == 422
        data = response.json()
        assert "Unsupported language 'ruby'" in str(data)


@pytest.mark.asyncio
async def test_4_missing_problem_description():
    """4. Test missing problem description rejection."""
    payload = {
        "problem": {
            "title": "Two Sum",
            "description": "",  # empty description
            "inputFormat": "Input",
            "outputFormat": "Output",
        },
        "code": "print(1)",
        "language": "python",
        "requestedHintLevel": 1,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/tutor/hint", json=payload, headers=SECRET_HEADER)
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_11_correct_response_schema():
    """11. Test correct response schema matches specification."""
    payload = {
        "problem": {
            "title": "Binary Search",
            "description": "Find target in sorted array in O(log N) time.",
            "inputFormat": "Array and target",
            "outputFormat": "Index",
        },
        "code": "int l = 0, r = n - 1;",
        "language": "cpp",
        "requestedHintLevel": 2,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/tutor/hint", json=payload, headers=SECRET_HEADER)
        assert response.status_code == 200
        data = response.json()
        expected_keys = {"success", "progressCategory", "hintLevel", "hintTitle", "hint", "nextAction", "solved"}
        assert expected_keys.issubset(data.keys())
        assert isinstance(data["success"], bool)
        assert data["hintLevel"] == 2
        assert isinstance(data["hintTitle"], str)
        assert isinstance(data["hint"], str)
        assert isinstance(data["nextAction"], str)
        assert isinstance(data["solved"], bool)


@pytest.mark.asyncio
async def test_12_invalid_requested_hint_level():
    """12. Test invalid requested hint level rejection."""
    payload = {
        "problem": {
            "title": "Problem",
            "description": "Description",
            "inputFormat": "Input",
            "outputFormat": "Output",
        },
        "code": "print(1)",
        "language": "python",
        "requestedHintLevel": 0,  # Invalid: must be >= 1
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/tutor/hint", json=payload, headers=SECRET_HEADER)
        assert response.status_code == 422

    # Verify that hint numbers > 4 (e.g. 5, 10) are successfully accepted
    payload["requestedHintLevel"] = 5
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/tutor/hint", json=payload, headers=SECRET_HEADER)
        assert response.status_code == 200
        assert response.json()["hintLevel"] == 5


@pytest.mark.asyncio
async def test_13_oversized_request_rejection():
    """13. Test oversized request rejection (> 60000 chars)."""
    payload = {
        "problem": {
            "title": "Problem",
            "description": "A" * 25000,
            "inputFormat": "Input",
            "outputFormat": "Output",
        },
        "code": "B" * 38000,  # Total = 63,000 chars > 60,000 max limit
        "language": "python",
        "requestedHintLevel": 1,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/tutor/hint", json=payload, headers=SECRET_HEADER)
        assert response.status_code == 413


@pytest.mark.asyncio
async def test_14_missing_internal_service_authentication():
    """14. Test missing internal service authentication."""
    payload = {
        "problem": {
            "title": "Problem",
            "description": "Description",
            "inputFormat": "Input",
            "outputFormat": "Output",
        },
        "code": "print(1)",
        "language": "python",
        "requestedHintLevel": 1,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # No header
        resp_no_header = await client.post("/api/tutor/hint", json=payload)
        assert resp_no_header.status_code == 401

        # Wrong secret
        resp_wrong_secret = await client.post(
            "/api/tutor/hint",
            json=payload,
            headers={"X-Service-Secret": "invalid_secret_key"},
        )
        assert resp_wrong_secret.status_code == 401
