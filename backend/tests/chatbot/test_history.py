"""
Sprint 7 — tests for conversation history (service + endpoint) and logging.

Covers:
  • history_service: append_turn, get_history, ownership isolation, clear helpers
  • GET /api/v1/chatbot/history: auth, ownership, correct data shape
  • POST /api/v1/chatbot/message: history appended after each exchange
  • Logging: PII-free fields present, content NOT logged
"""

import logging
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.middleware.auth import get_current_user
from app.db.database import get_db
from app.chatbot.services.history_service import (
    append_turn,
    get_history,
    clear_all,
    clear_thread,
    thread_count,
)


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


def _mock_user(user_id: int = 1, role_name: str = "job_seeker") -> MagicMock:
    user = MagicMock()
    user.id = user_id
    user.role.name = role_name
    return user


def _graph_result(answer: str = "Mock answer") -> dict:
    return {
        "user_id": 1,
        "role": "job_seeker",
        "message": "test",
        "job_id": None,
        "intent": "general_qa",
        "job_info": None,
        "applicants": [],
        "batch_summaries": [],
        "answer": answer,
        "blocked_reason": None,
    }


@pytest.fixture(autouse=True)
def reset_history_store():
    """Clear the in-memory store before every test."""
    clear_all()
    yield
    clear_all()


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = lambda: MagicMock()
    yield TestClient(app, raise_server_exceptions=True)
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_client(client):
    app.dependency_overrides[get_current_user] = lambda: _mock_user(user_id=1)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


# ===========================================================================
# history_service — unit tests
# ===========================================================================


class TestHistoryServiceAppend:
    def test_append_creates_new_thread(self):
        append_turn("t-1", 1, "Hello", "Hi there")
        assert thread_count() == 1

    def test_append_stores_two_messages_per_turn(self):
        append_turn("t-1", 1, "User msg", "Bot msg")
        msgs = get_history("t-1", 1)
        assert len(msgs) == 2

    def test_append_first_message_is_user(self):
        append_turn("t-1", 1, "User msg", "Bot msg")
        msgs = get_history("t-1", 1)
        assert msgs[0]["role"] == "user"
        assert msgs[0]["content"] == "User msg"

    def test_append_second_message_is_assistant(self):
        append_turn("t-1", 1, "User msg", "Bot msg")
        msgs = get_history("t-1", 1)
        assert msgs[1]["role"] == "assistant"
        assert msgs[1]["content"] == "Bot msg"

    def test_append_adds_created_at_field(self):
        append_turn("t-1", 1, "A", "B")
        msgs = get_history("t-1", 1)
        assert "created_at" in msgs[0]
        assert "created_at" in msgs[1]

    def test_created_at_is_iso8601(self):
        append_turn("t-1", 1, "A", "B")
        ts = get_history("t-1", 1)[0]["created_at"]
        # Basic check: should end with "Z" and contain "T"
        assert "T" in ts and ts.endswith("Z")

    def test_multiple_turns_accumulate(self):
        append_turn("t-1", 1, "Q1", "A1")
        append_turn("t-1", 1, "Q2", "A2")
        msgs = get_history("t-1", 1)
        assert len(msgs) == 4

    def test_different_threads_are_isolated(self):
        append_turn("t-A", 1, "msg A", "ans A")
        append_turn("t-B", 2, "msg B", "ans B")
        assert len(get_history("t-A", 1)) == 2
        assert len(get_history("t-B", 2)) == 2


class TestHistoryServiceOwnership:
    def test_wrong_user_cannot_write_to_existing_thread(self):
        append_turn("t-1", 1, "Owner msg", "Bot")
        # Different user tries to append
        append_turn("t-1", 99, "Intruder msg", "Bot")
        msgs = get_history("t-1", 1)
        # Only the owner's turn is stored
        assert len(msgs) == 2
        assert all(m["content"] != "Intruder msg" for m in msgs)

    def test_get_history_returns_none_for_wrong_user(self):
        append_turn("t-1", 1, "Msg", "Ans")
        result = get_history("t-1", user_id=99)
        assert result is None

    def test_get_history_returns_empty_for_unknown_thread(self):
        result = get_history("no-such-thread", 1)
        assert result == []

    def test_get_history_returns_messages_for_correct_user(self):
        append_turn("t-1", 5, "Hi", "Hello")
        msgs = get_history("t-1", 5)
        assert len(msgs) == 2

    def test_ownership_bound_on_first_append(self):
        append_turn("t-new", 7, "first", "reply")
        # Same thread, different user → no-op
        append_turn("t-new", 8, "second", "reply2")
        msgs = get_history("t-new", 7)
        assert len(msgs) == 2  # only first turn


class TestHistoryServiceHelpers:
    def test_clear_thread_removes_specific_thread(self):
        append_turn("t-A", 1, "msg", "ans")
        append_turn("t-B", 2, "msg", "ans")
        clear_thread("t-A")
        assert get_history("t-A", 1) == []
        assert len(get_history("t-B", 2)) == 2

    def test_clear_all_removes_everything(self):
        append_turn("t-1", 1, "m", "a")
        append_turn("t-2", 2, "m", "a")
        clear_all()
        assert thread_count() == 0

    def test_thread_count_reflects_active_threads(self):
        assert thread_count() == 0
        append_turn("t-1", 1, "m", "a")
        assert thread_count() == 1
        append_turn("t-2", 2, "m", "a")
        assert thread_count() == 2


# ===========================================================================
# GET /api/v1/chatbot/history — endpoint tests
# ===========================================================================


class TestHistoryEndpointAuth:
    def test_returns_401_or_403_without_token(self, client):
        response = client.get("/api/v1/chatbot/history", params={"thread_id": "t-1"})
        assert response.status_code in (401, 403)

    def test_returns_422_without_thread_id(self, auth_client):
        response = auth_client.get("/api/v1/chatbot/history")
        assert response.status_code == 422


class TestHistoryEndpointData:
    def test_returns_empty_list_for_unknown_thread(self, auth_client):
        response = auth_client.get(
            "/api/v1/chatbot/history", params={"thread_id": "unknown-thread"}
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_messages_after_append(self, auth_client):
        append_turn("t-xyz", 1, "User question", "Bot answer")
        response = auth_client.get(
            "/api/v1/chatbot/history", params={"thread_id": "t-xyz"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_message_has_role_content_created_at(self, auth_client):
        append_turn("t-abc", 1, "Question", "Answer")
        response = auth_client.get(
            "/api/v1/chatbot/history", params={"thread_id": "t-abc"}
        )
        item = response.json()[0]
        assert "role" in item
        assert "content" in item
        assert "created_at" in item

    def test_first_item_role_is_user(self, auth_client):
        append_turn("t-r", 1, "Hi", "Hello")
        data = auth_client.get(
            "/api/v1/chatbot/history", params={"thread_id": "t-r"}
        ).json()
        assert data[0]["role"] == "user"

    def test_second_item_role_is_assistant(self, auth_client):
        append_turn("t-r", 1, "Hi", "Hello")
        data = auth_client.get(
            "/api/v1/chatbot/history", params={"thread_id": "t-r"}
        ).json()
        assert data[1]["role"] == "assistant"

    def test_returns_403_for_wrong_owner(self, client):
        append_turn("t-own", 99, "private msg", "private ans")
        # User 1 tries to read thread owned by user 99
        app.dependency_overrides[get_current_user] = lambda: _mock_user(user_id=1)
        response = client.get(
            "/api/v1/chatbot/history", params={"thread_id": "t-own"}
        )
        assert response.status_code == 403

    def test_multiple_turns_returned_in_order(self, auth_client):
        append_turn("t-m", 1, "Q1", "A1")
        append_turn("t-m", 1, "Q2", "A2")
        data = auth_client.get(
            "/api/v1/chatbot/history", params={"thread_id": "t-m"}
        ).json()
        assert len(data) == 4
        assert data[0]["content"] == "Q1"
        assert data[1]["content"] == "A1"
        assert data[2]["content"] == "Q2"
        assert data[3]["content"] == "A2"


# ===========================================================================
# POST /message — history appended after each exchange
# ===========================================================================


class TestMessageAppendsHistory:
    def test_history_contains_turn_after_message(self, auth_client):
        with patch("app.chatbot.routes._graph") as mock_graph:
            mock_graph.ainvoke = AsyncMock(
                return_value=_graph_result("Bot answer here")
            )
            auth_client.post(
                "/api/v1/chatbot/message",
                json={"message": "User question here", "thread_id": "t-post-test"},
            )

        msgs = get_history("t-post-test", 1)
        assert len(msgs) == 2
        assert msgs[0]["role"] == "user"
        assert msgs[0]["content"] == "User question here"
        assert msgs[1]["role"] == "assistant"
        assert msgs[1]["content"] == "Bot answer here"

    def test_history_grows_with_each_message(self, auth_client):
        for i in range(3):
            with patch("app.chatbot.routes._graph") as mock_graph:
                mock_graph.ainvoke = AsyncMock(
                    return_value=_graph_result(f"Answer {i}")
                )
                auth_client.post(
                    "/api/v1/chatbot/message",
                    json={"message": f"Question {i}", "thread_id": "t-multi"},
                )

        msgs = get_history("t-multi", 1)
        assert len(msgs) == 6  # 3 turns × 2 messages


# ===========================================================================
# Logging — PII-free fields verification
# ===========================================================================


class TestLogging:
    def test_post_message_logs_at_info_level(self, auth_client, caplog):
        with patch("app.chatbot.routes._graph") as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value=_graph_result("Answer"))
            with caplog.at_level(logging.INFO, logger="app.chatbot.routes"):
                auth_client.post(
                    "/api/v1/chatbot/message",
                    json={"message": "Test logging", "thread_id": "t-log"},
                )
        # At least one INFO record from the chatbot route
        info_records = [r for r in caplog.records if r.levelno == logging.INFO]
        assert len(info_records) >= 1

    def test_log_record_does_not_contain_message_content(self, auth_client, caplog):
        secret_message = "SUPER_SECRET_USER_MESSAGE_XYZ"
        with patch("app.chatbot.routes._graph") as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value=_graph_result("ok"))
            with caplog.at_level(logging.INFO, logger="app.chatbot.routes"):
                auth_client.post(
                    "/api/v1/chatbot/message",
                    json={"message": secret_message, "thread_id": "t-pii"},
                )
        all_log_text = " ".join(r.getMessage() for r in caplog.records)
        assert secret_message not in all_log_text

    def test_log_record_does_not_contain_answer_content(self, auth_client, caplog):
        secret_answer = "SUPER_SECRET_ANSWER_CONTENT_ABC"
        with patch("app.chatbot.routes._graph") as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value=_graph_result(secret_answer))
            with caplog.at_level(logging.INFO, logger="app.chatbot.routes"):
                auth_client.post(
                    "/api/v1/chatbot/message",
                    json={"message": "q", "thread_id": "t-pii2"},
                )
        all_log_text = " ".join(r.getMessage() for r in caplog.records)
        assert secret_answer not in all_log_text


# ===========================================================================
# Multi-turn context (MemorySaver thread isolation)
# ===========================================================================


class TestMultiTurnContext:
    def test_same_thread_id_reused_across_requests(self, auth_client):
        """Sending to the same thread_id should accumulate history."""
        for q in ["Q1", "Q2", "Q3"]:
            with patch("app.chatbot.routes._graph") as mock_graph:
                mock_graph.ainvoke = AsyncMock(return_value=_graph_result("ok"))
                resp = auth_client.post(
                    "/api/v1/chatbot/message",
                    json={"message": q, "thread_id": "same-thread"},
                )
                assert resp.json()["thread_id"] == "same-thread"

        msgs = get_history("same-thread", 1)
        assert len(msgs) == 6

    def test_different_thread_ids_are_independent(self, auth_client):
        """Two threads should have separate histories."""
        for tid in ["thread-A", "thread-B"]:
            with patch("app.chatbot.routes._graph") as mock_graph:
                mock_graph.ainvoke = AsyncMock(return_value=_graph_result("ok"))
                auth_client.post(
                    "/api/v1/chatbot/message",
                    json={"message": "Hello", "thread_id": tid},
                )

        assert len(get_history("thread-A", 1)) == 2
        assert len(get_history("thread-B", 1)) == 2

    def test_auto_generated_thread_id_is_uuid(self, auth_client):
        """When no thread_id supplied, a UUID is generated and returned."""
        with patch("app.chatbot.routes._graph") as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value=_graph_result("ok"))
            resp = auth_client.post(
                "/api/v1/chatbot/message",
                json={"message": "Hi"},
            )
        tid = resp.json()["thread_id"]
        import uuid as _uuid
        _uuid.UUID(tid)  # raises ValueError if not a valid UUID
