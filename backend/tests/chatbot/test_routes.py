"""
Integration tests for POST /api/v1/chatbot/message.

The LangGraph _graph is mocked to isolate HTTP/auth logic from graph logic.
Node-level behaviour is covered in test_nodes.py.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.middleware.auth import get_current_user
from app.db.database import get_db


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

def _mock_user(user_id: int = 1, role_name: str = "job_seeker") -> MagicMock:
    user = MagicMock()
    user.id = user_id
    user.role.name = role_name
    return user


def _graph_result(answer: str = "Mock answer", blocked: str | None = None) -> dict:
    return {
        "user_id": 1,
        "role": "job_seeker",
        "message": "test",
        "job_id": None,
        "intent": "general_qa",
        "applicants": [],
        "batch_summaries": [],
        "answer": answer,
        "blocked_reason": blocked,
    }


@pytest.fixture()
def client():
    """TestClient with DB dependency overridden (no real DB needed)."""
    app.dependency_overrides[get_db] = lambda: MagicMock()
    yield TestClient(app, raise_server_exceptions=True)
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_client(client):
    """TestClient that injects a mock job_seeker user."""
    app.dependency_overrides[get_db] = lambda: MagicMock()
    app.dependency_overrides[get_current_user] = lambda: _mock_user()
    yield client
    app.dependency_overrides.clear()


@pytest.fixture()
def recruiter_client(client):
    app.dependency_overrides[get_db] = lambda: MagicMock()
    app.dependency_overrides[get_current_user] = lambda: _mock_user(role_name="recruiter")
    yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Authentication / authorisation
# ---------------------------------------------------------------------------


def test_returns_401_without_token(client):
    """No Authorization header → 401."""
    response = client.post(
        "/api/v1/chatbot/message",
        json={"message": "Hello"},
    )
    assert response.status_code == 401


def test_returns_403_for_admin_role(client):
    """Admin users must not access the chatbot."""
    app.dependency_overrides[get_current_user] = lambda: _mock_user(role_name="admin")
    response = client.post(
        "/api/v1/chatbot/message",
        json={"message": "Hello"},
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Happy path — message sent, answer returned
# ---------------------------------------------------------------------------


def test_returns_200_with_answer(auth_client):
    with patch("app.chatbot.routes._graph") as mock_graph:
        mock_graph.ainvoke = AsyncMock(return_value=_graph_result("Câu trả lời mock"))
        response = auth_client.post(
            "/api/v1/chatbot/message",
            json={"message": "Lương IT ra sao?"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == "Câu trả lời mock"
    assert "thread_id" in data
    assert len(data["thread_id"]) > 0


def test_uses_provided_thread_id(auth_client):
    with patch("app.chatbot.routes._graph") as mock_graph:
        mock_graph.ainvoke = AsyncMock(return_value=_graph_result())
        response = auth_client.post(
            "/api/v1/chatbot/message",
            json={"message": "Hello", "thread_id": "my-thread-123"},
        )
    assert response.status_code == 200
    assert response.json()["thread_id"] == "my-thread-123"


def test_generates_thread_id_when_not_provided(auth_client):
    with patch("app.chatbot.routes._graph") as mock_graph:
        mock_graph.ainvoke = AsyncMock(return_value=_graph_result())
        response = auth_client.post(
            "/api/v1/chatbot/message",
            json={"message": "Hello"},
        )
    assert response.status_code == 200
    assert response.json()["thread_id"] != ""


def test_recruiter_can_send_message_with_job_id(recruiter_client):
    with patch("app.chatbot.routes._graph") as mock_graph:
        mock_graph.ainvoke = AsyncMock(return_value=_graph_result("Kết quả phân tích"))
        response = recruiter_client.post(
            "/api/v1/chatbot/message",
            json={"message": "Top ứng viên?", "job_id": 42},
        )
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Input validation (Pydantic layer — no graph invocation needed)
# ---------------------------------------------------------------------------


def test_returns_422_when_message_too_long(auth_client):
    """Pydantic max_length=2000 rejects overlength messages before graph runs."""
    with patch("app.chatbot.routes._graph") as mock_graph:
        mock_graph.ainvoke = AsyncMock(return_value=_graph_result())
        response = auth_client.post(
            "/api/v1/chatbot/message",
            json={"message": "x" * 2001},
        )
    assert response.status_code == 422


def test_returns_422_when_message_missing(auth_client):
    with patch("app.chatbot.routes._graph") as mock_graph:
        mock_graph.ainvoke = AsyncMock(return_value=_graph_result())
        response = auth_client.post(
            "/api/v1/chatbot/message",
            json={},
        )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Graph invocation details
# ---------------------------------------------------------------------------


def test_graph_receives_correct_initial_state(auth_client):
    """Verify the state dict passed to ainvoke is correctly populated."""
    captured = {}

    async def capture_invoke(state, config=None):
        captured["state"] = state
        captured["config"] = config
        return _graph_result()

    with patch("app.chatbot.routes._graph") as mock_graph:
        mock_graph.ainvoke = capture_invoke
        auth_client.post(
            "/api/v1/chatbot/message",
            json={"message": "Test", "job_id": 5, "thread_id": "t-abc"},
        )

    state = captured["state"]
    assert state["user_id"] == 1
    assert state["role"] == "job_seeker"
    assert state["message"] == "Test"
    assert state["job_id"] == 5
    assert state["intent"] is None
    assert state["applicants"] == []
    assert state["blocked_reason"] is None

    config = captured["config"]
    assert config["configurable"]["thread_id"] == "t-abc"
    assert "db" in config["configurable"]


def test_fallback_answer_when_graph_returns_empty(auth_client):
    with patch("app.chatbot.routes._graph") as mock_graph:
        mock_graph.ainvoke = AsyncMock(return_value=_graph_result(answer=""))
        response = auth_client.post(
            "/api/v1/chatbot/message",
            json={"message": "Hello"},
        )
    assert response.status_code == 200
    assert response.json()["answer"] != ""
