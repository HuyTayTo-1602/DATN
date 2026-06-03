"""API-level tests for /api/v1/notifications endpoints using FastAPI TestClient."""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime

from fastapi.testclient import TestClient

from app.main import app
from app.db.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.notification import Notification


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(user_id: int = 1, role: str = "job_seeker") -> User:
    user = MagicMock(spec=User)
    user.id = user_id
    user.status = "active"
    role_obj = MagicMock()
    role_obj.name = role
    user.role = role_obj
    return user


def _make_notif(notif_id=1, user_id=1, is_read=False) -> Notification:
    n = MagicMock(spec=Notification)
    n.id = notif_id
    n.user_id = user_id
    n.type = "application_submitted"
    n.title = "Đơn mới"
    n.message = "Ứng viên A đã nộp đơn"
    n.is_read = is_read
    n.read_at = None
    n.related_id = 5
    n.related_type = "job_application"
    n.created_at = datetime(2024, 6, 1, 10, 0)
    return n


def _override_auth(user: User):
    app.dependency_overrides[get_current_user] = lambda: user


def _override_db(db):
    app.dependency_overrides[get_db] = lambda: db


def _clear_overrides():
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# GET /notifications
# ---------------------------------------------------------------------------

class TestListNotifications:
    def setup_method(self):
        _clear_overrides()

    def test_returns_401_without_auth(self):
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/api/v1/notifications")
        assert resp.status_code == 401

    def test_returns_empty_list(self):
        user = _make_user(1)
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
        _override_auth(user)
        _override_db(db)
        client = TestClient(app)
        resp = client.get("/api/v1/notifications")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_notification_list(self):
        user = _make_user(1)
        db = MagicMock()
        notifs = [_make_notif(1, user_id=1), _make_notif(2, user_id=1, is_read=True)]
        db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = notifs
        _override_auth(user)
        _override_db(db)
        client = TestClient(app)
        resp = client.get("/api/v1/notifications")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["id"] == 1
        assert data[1]["is_read"] is True

    def teardown_method(self):
        _clear_overrides()


# ---------------------------------------------------------------------------
# GET /notifications/unread-count
# ---------------------------------------------------------------------------

class TestUnreadCount:
    def setup_method(self):
        _clear_overrides()

    def test_returns_count(self):
        user = _make_user(1)
        db = MagicMock()
        db.query.return_value.filter.return_value.count.return_value = 3
        _override_auth(user)
        _override_db(db)
        client = TestClient(app)
        resp = client.get("/api/v1/notifications/unread-count")
        assert resp.status_code == 200
        assert resp.json()["count"] == 3

    def test_returns_zero(self):
        user = _make_user(1)
        db = MagicMock()
        db.query.return_value.filter.return_value.count.return_value = 0
        _override_auth(user)
        _override_db(db)
        client = TestClient(app)
        resp = client.get("/api/v1/notifications/unread-count")
        assert resp.json()["count"] == 0

    def teardown_method(self):
        _clear_overrides()


# ---------------------------------------------------------------------------
# POST /notifications/{id}/read
# ---------------------------------------------------------------------------

class TestMarkRead:
    def setup_method(self):
        _clear_overrides()

    def test_marks_notification_as_read(self):
        user = _make_user(1)
        db = MagicMock()
        notif = _make_notif(7, user_id=1, is_read=False)
        db.query.return_value.filter.return_value.first.return_value = notif
        _override_auth(user)
        _override_db(db)

        with patch("app.services.notification_service.mark_as_read", return_value=notif):
            client = TestClient(app)
            resp = client.post("/api/v1/notifications/7/read")
        assert resp.status_code == 200
        assert resp.json()["id"] == 7

    def test_returns_404_when_not_found(self):
        user = _make_user(1)
        db = MagicMock()
        _override_auth(user)
        _override_db(db)

        with patch("app.services.notification_service.mark_as_read", return_value=None):
            client = TestClient(app)
            resp = client.post("/api/v1/notifications/999/read")
        assert resp.status_code == 404

    def teardown_method(self):
        _clear_overrides()


# ---------------------------------------------------------------------------
# POST /notifications/read-all
# ---------------------------------------------------------------------------

class TestMarkAllRead:
    def setup_method(self):
        _clear_overrides()

    def test_marks_all_read(self):
        user = _make_user(1)
        db = MagicMock()
        _override_auth(user)
        _override_db(db)

        with patch("app.services.notification_service.mark_all_as_read", return_value=5):
            client = TestClient(app)
            resp = client.post("/api/v1/notifications/read-all")
        assert resp.status_code == 200
        assert resp.json()["marked"] == 5

    def test_marks_all_read_zero(self):
        user = _make_user(1)
        db = MagicMock()
        _override_auth(user)
        _override_db(db)

        with patch("app.services.notification_service.mark_all_as_read", return_value=0):
            client = TestClient(app)
            resp = client.post("/api/v1/notifications/read-all")
        assert resp.json()["marked"] == 0

    def teardown_method(self):
        _clear_overrides()
