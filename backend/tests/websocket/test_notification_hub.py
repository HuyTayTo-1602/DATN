"""Tests for NotificationHub and the /ws WebSocket endpoint."""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.websocket.notification_hub import NotificationHub
from app.main import app
from app.db.database import get_db


# ---------------------------------------------------------------------------
# NotificationHub unit tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_hub_connect_increments_connection_count():
    hub = NotificationHub()
    ws = AsyncMock()
    await hub.connect(user_id=1, ws=ws)
    assert hub.connection_count(1) == 1
    ws.accept.assert_called_once()


@pytest.mark.asyncio
async def test_hub_connect_multiple_sockets_same_user():
    hub = NotificationHub()
    ws1, ws2 = AsyncMock(), AsyncMock()
    await hub.connect(1, ws1)
    await hub.connect(1, ws2)
    assert hub.connection_count(1) == 2


@pytest.mark.asyncio
async def test_hub_disconnect_removes_socket():
    hub = NotificationHub()
    ws = AsyncMock()
    await hub.connect(1, ws)
    hub.disconnect(1, ws)
    assert hub.connection_count(1) == 0


@pytest.mark.asyncio
async def test_hub_disconnect_removes_entry_when_empty():
    hub = NotificationHub()
    ws = AsyncMock()
    await hub.connect(5, ws)
    hub.disconnect(5, ws)
    assert 5 not in hub._connections


@pytest.mark.asyncio
async def test_hub_push_sends_json_to_all_user_sockets():
    hub = NotificationHub()
    ws1, ws2 = AsyncMock(), AsyncMock()
    await hub.connect(3, ws1)
    await hub.connect(3, ws2)

    payload = {"id": 1, "title": "test"}
    await hub.push(3, payload)

    ws1.send_json.assert_called_once_with(payload)
    ws2.send_json.assert_called_once_with(payload)


@pytest.mark.asyncio
async def test_hub_push_silently_removes_dead_socket():
    hub = NotificationHub()
    ws_dead = AsyncMock()
    ws_dead.send_json.side_effect = Exception("closed")
    ws_ok = AsyncMock()

    await hub.connect(7, ws_dead)
    await hub.connect(7, ws_ok)
    await hub.push(7, {"id": 2})

    assert hub.connection_count(7) == 1
    ws_ok.send_json.assert_called_once()


@pytest.mark.asyncio
async def test_hub_push_noop_when_no_connections():
    hub = NotificationHub()
    # Should not raise
    await hub.push(999, {"id": 0})


# ---------------------------------------------------------------------------
# WebSocket endpoint tests via TestClient
# ---------------------------------------------------------------------------

def _make_db_override():
    db = MagicMock()
    app.dependency_overrides[get_db] = lambda: db
    return db


def _clear_overrides():
    app.dependency_overrides.clear()


class TestNotificationWebSocket:
    def setup_method(self):
        _clear_overrides()

    def test_ws_closes_without_token(self):
        from starlette.websockets import WebSocketDisconnect
        client = TestClient(app)
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/api/v1/notifications/ws") as ws:
                ws.receive_text()

    def test_ws_closes_with_invalid_token(self):
        client = TestClient(app)
        with pytest.raises(Exception):
            with client.websocket_connect("/api/v1/notifications/ws?token=not_a_jwt") as ws:
                ws.receive_text()

    def test_ws_accepts_valid_token(self):
        _make_db_override()
        valid_payload = {"sub": "42"}

        with patch("app.routers.notifications.decode_access_token", return_value=valid_payload):
            client = TestClient(app)
            with client.websocket_connect("/api/v1/notifications/ws?token=valid") as ws:
                # Connection accepted — send a ping and verify server stays alive
                ws.send_text("ping")
                # No exception means connection is open

    def teardown_method(self):
        _clear_overrides()
