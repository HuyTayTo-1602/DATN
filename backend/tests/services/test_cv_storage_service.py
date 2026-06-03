"""Unit tests for cv_storage_service — MinIO client is mocked."""

import pytest
from unittest.mock import MagicMock, patch, call

from app.services.cv_storage_service import upload_cv, get_my_cvs, activate_cv
from app.models.candidate_cv import CandidateCV
from app.models.cv_text import CVText


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(user_id: int = 1):
    user = MagicMock()
    user.id = user_id
    return user


def _make_cv(cv_id: int = 1, user_id: int = 1, is_active: bool = True, parse_status: str = "success"):
    cv = MagicMock(spec=CandidateCV)
    cv.id = cv_id
    cv.user_id = user_id
    cv.file_name = "resume.pdf"
    cv.object_key = f"{user_id}/2024-01-01/uuid-resume.pdf"
    cv.bucket_name = "cv-files"
    cv.mime_type = "application/pdf"
    cv.file_size = 1024
    cv.is_active = is_active
    cv.uploaded_at = None
    cv_text = MagicMock()
    cv_text.parse_status = parse_status
    cv.cv_text = cv_text
    return cv


# ---------------------------------------------------------------------------
# upload_cv
# ---------------------------------------------------------------------------

@patch("app.services.cv_storage_service.upload_file")
@patch("app.services.cv_storage_service.build_object_key", return_value="1/2024-01-01/uuid-resume.pdf")
def test_upload_cv_stores_metadata_and_returns_cv(mock_key, mock_upload):
    user = _make_user(1)
    db = MagicMock()

    # Simulate db.flush assigning cv.id
    created_cv = None

    def _flush():
        nonlocal created_cv
        # Find the CandidateCV that was added
        for c in db.add.call_args_list:
            obj = c[0][0]
            if isinstance(obj, CandidateCV):
                obj.id = 42
                created_cv = obj

    db.flush.side_effect = _flush

    result = upload_cv(b"%PDF fake", "resume.pdf", 1024, user, db)

    mock_upload.assert_called_once_with(b"%PDF fake", "1/2024-01-01/uuid-resume.pdf")
    db.commit.assert_called_once()
    db.refresh.assert_called_once()


@patch("app.services.cv_storage_service.upload_file", side_effect=Exception("MinIO down"))
@patch("app.services.cv_storage_service.build_object_key", return_value="1/2024-01-01/uuid.pdf")
def test_upload_cv_propagates_minio_error(mock_key, mock_upload):
    db = MagicMock()
    with pytest.raises(Exception, match="MinIO down"):
        upload_cv(b"data", "file.pdf", 4, _make_user(), db)
    db.commit.assert_not_called()


# ---------------------------------------------------------------------------
# get_my_cvs
# ---------------------------------------------------------------------------

def test_get_my_cvs_returns_list_with_parse_status():
    user = _make_user(1)
    db = MagicMock()
    cv = _make_cv(cv_id=5, parse_status="success")

    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [cv]

    result = get_my_cvs(user, db)

    assert len(result) == 1
    assert result[0]["id"] == 5
    assert result[0]["parse_status"] == "success"
    assert result[0]["is_active"] is True


def test_get_my_cvs_empty():
    user = _make_user(99)
    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
    assert get_my_cvs(user, db) == []


# ---------------------------------------------------------------------------
# activate_cv
# ---------------------------------------------------------------------------

def test_activate_cv_sets_is_active_true():
    user = _make_user(1)
    db = MagicMock()
    cv = _make_cv(cv_id=10, is_active=False)
    db.query.return_value.filter.return_value.first.return_value = cv
    db.query.return_value.filter.return_value.update.return_value = None

    result = activate_cv(10, user, db)

    assert result["cv_id"] == 10
    assert cv.is_active is True
    db.commit.assert_called_once()


def test_activate_cv_raises_404_when_not_found():
    from fastapi import HTTPException
    user = _make_user(1)
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        activate_cv(999, user, db)
    assert exc_info.value.status_code == 404
