"""Unit tests for notification_service — DB is mocked via MagicMock."""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from app.services.notification_service import (
    create_notification,
    get_notifications,
    get_unread_count,
    mark_as_read,
    mark_all_as_read,
)
from app.models.notification import Notification


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_notif(
    notif_id=1, user_id=10, type="application_submitted",
    title="Test", message="msg", is_read=False, related_id=5,
    related_type="job_application",
):
    n = MagicMock(spec=Notification)
    n.id = notif_id
    n.user_id = user_id
    n.type = type
    n.title = title
    n.message = message
    n.is_read = is_read
    n.read_at = None
    n.related_id = related_id
    n.related_type = related_type
    n.created_at = datetime(2024, 1, 1, 12, 0)
    return n


def _make_db():
    return MagicMock()


# ---------------------------------------------------------------------------
# create_notification
# ---------------------------------------------------------------------------

def test_create_notification_adds_and_commits():
    db = _make_db()
    notif = create_notification(
        db,
        user_id=10,
        type="application_submitted",
        title="Đơn mới",
        message="Có đơn ứng tuyển",
        related_id=5,
        related_type="job_application",
    )
    db.add.assert_called_once()
    db.commit.assert_called_once()
    db.refresh.assert_called_once()


def test_create_notification_without_related_fields():
    db = _make_db()
    create_notification(db, user_id=1, type="application_accepted", title="OK", message="chấp nhận")
    added_obj = db.add.call_args[0][0]
    assert added_obj.related_id is None
    assert added_obj.related_type is None


def test_create_notification_sets_correct_fields():
    db = _make_db()
    create_notification(
        db,
        user_id=99,
        type="application_rejected",
        title="Từ chối",
        message="Tiếc quá",
        related_id=42,
        related_type="job_application",
    )
    added_obj = db.add.call_args[0][0]
    assert added_obj.user_id == 99
    assert added_obj.type == "application_rejected"
    assert added_obj.title == "Từ chối"
    assert added_obj.related_id == 42


# ---------------------------------------------------------------------------
# get_notifications
# ---------------------------------------------------------------------------

def test_get_notifications_returns_list():
    db = _make_db()
    expected = [_make_notif(1), _make_notif(2)]
    db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = expected

    result = get_notifications(db, user_id=10)
    assert result == expected


def test_get_notifications_empty():
    db = _make_db()
    db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
    assert get_notifications(db, user_id=99) == []


def test_get_notifications_respects_limit_offset():
    db = _make_db()
    db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []

    get_notifications(db, user_id=1, limit=5, offset=10)
    # Verify offset(10) and limit(5) were called
    db.query.return_value.filter.return_value.order_by.return_value.offset.assert_called_with(10)
    db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.assert_called_with(5)


# ---------------------------------------------------------------------------
# get_unread_count
# ---------------------------------------------------------------------------

def test_get_unread_count_returns_integer():
    db = _make_db()
    db.query.return_value.filter.return_value.count.return_value = 3

    result = get_unread_count(db, user_id=10)
    assert result == 3


def test_get_unread_count_zero():
    db = _make_db()
    db.query.return_value.filter.return_value.count.return_value = 0
    assert get_unread_count(db, user_id=10) == 0


# ---------------------------------------------------------------------------
# mark_as_read
# ---------------------------------------------------------------------------

def test_mark_as_read_sets_is_read_true():
    db = _make_db()
    notif = _make_notif(notif_id=7, is_read=False)
    db.query.return_value.filter.return_value.first.return_value = notif

    result = mark_as_read(db, notification_id=7, user_id=10)

    assert notif.is_read is True
    assert notif.read_at is not None
    db.commit.assert_called_once()
    db.refresh.assert_called_once()


def test_mark_as_read_returns_none_when_not_found():
    db = _make_db()
    db.query.return_value.filter.return_value.first.return_value = None

    result = mark_as_read(db, notification_id=999, user_id=10)
    assert result is None
    db.commit.assert_not_called()


def test_mark_as_read_returns_updated_notification():
    db = _make_db()
    notif = _make_notif(notif_id=3)
    db.query.return_value.filter.return_value.first.return_value = notif

    result = mark_as_read(db, notification_id=3, user_id=10)
    assert result is notif


# ---------------------------------------------------------------------------
# mark_all_as_read
# ---------------------------------------------------------------------------

def test_mark_all_as_read_returns_count():
    db = _make_db()
    unread = [_make_notif(i, is_read=False) for i in range(4)]
    db.query.return_value.filter.return_value.all.return_value = unread

    count = mark_all_as_read(db, user_id=10)
    assert count == 4
    for n in unread:
        assert n.is_read is True
    db.commit.assert_called_once()


def test_mark_all_as_read_zero_when_none():
    db = _make_db()
    db.query.return_value.filter.return_value.all.return_value = []

    count = mark_all_as_read(db, user_id=10)
    assert count == 0
    db.commit.assert_called_once()
