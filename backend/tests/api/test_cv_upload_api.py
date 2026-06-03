"""API-level tests for /api/v1/cvs endpoints using FastAPI TestClient."""

import io
import pytest
from unittest.mock import MagicMock, patch

import fitz
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import get_db
from app.middleware.auth import require_job_seeker
from app.models.user import User
from app.models.candidate_cv import CandidateCV
from app.models.cv_text import CVText


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_pdf_bytes(text: str = "CV content") -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def _mock_job_seeker(user_id: int = 1) -> User:
    user = MagicMock(spec=User)
    user.id = user_id
    role = MagicMock()
    role.name = "job_seeker"
    user.role = role
    user.status = "active"
    return user


def _make_cv_record(cv_id=1):
    cv = MagicMock(spec=CandidateCV)
    cv.id = cv_id
    cv.file_name = "resume.pdf"
    cv.is_active = True
    cv_text = MagicMock(spec=CVText)
    cv_text.parse_status = "success"
    cv.cv_text = cv_text
    return cv


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def auth_client():
    """TestClient with job_seeker auth and db mocked."""
    fake_user = _mock_job_seeker()
    fake_db = MagicMock()

    app.dependency_overrides[require_job_seeker] = lambda: fake_user
    app.dependency_overrides[get_db] = lambda: fake_db

    yield TestClient(app), fake_user, fake_db

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# POST /api/v1/cvs/upload
# ---------------------------------------------------------------------------

@patch("app.routers.cvs.cv_storage_service.upload_cv")
@patch("app.routers.cvs.parse_and_save")
def test_upload_cv_success(mock_parse, mock_upload_cv, auth_client):
    client, user, db = auth_client
    pdf_bytes = _build_pdf_bytes("Nguyen Van A")
    cv_record = _make_cv_record(cv_id=42)
    mock_upload_cv.return_value = cv_record

    response = client.post(
        "/api/v1/cvs/upload",
        files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 42
    assert body["parse_status"] == "success"
    assert "thành công" in body["message"]
    mock_upload_cv.assert_called_once()
    mock_parse.assert_called_once()


def test_upload_cv_rejects_non_pdf(auth_client):
    client, user, db = auth_client
    response = client.post(
        "/api/v1/cvs/upload",
        files={"file": ("resume.docx", b"fake word content", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert response.status_code == 400
    assert "PDF" in response.json()["detail"]


def test_upload_cv_rejects_oversized_file(auth_client):
    client, user, db = auth_client
    big_bytes = b"%PDF" + b"0" * (11 * 1024 * 1024)  # 11 MB
    response = client.post(
        "/api/v1/cvs/upload",
        files={"file": ("big.pdf", big_bytes, "application/pdf")},
    )
    assert response.status_code == 400
    assert "quá lớn" in response.json()["detail"]


def test_upload_cv_requires_auth(client):
    pdf_bytes = _build_pdf_bytes()
    response = client.post(
        "/api/v1/cvs/upload",
        files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/cvs/me
# ---------------------------------------------------------------------------

@patch("app.routers.cvs.cv_storage_service.get_my_cvs")
def test_get_my_cvs_returns_list(mock_get, auth_client):
    client, user, db = auth_client
    mock_get.return_value = [
        {"id": 1, "file_name": "cv.pdf", "is_active": True, "parse_status": "success"},
    ]
    response = client.get("/api/v1/cvs/me")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["file_name"] == "cv.pdf"


# ---------------------------------------------------------------------------
# POST /api/v1/cvs/{cv_id}/activate
# ---------------------------------------------------------------------------

@patch("app.routers.cvs.cv_storage_service.activate_cv")
def test_activate_cv_success(mock_activate, auth_client):
    client, user, db = auth_client
    mock_activate.return_value = {"message": "Đã kích hoạt CV", "cv_id": 5}
    response = client.post("/api/v1/cvs/5/activate")
    assert response.status_code == 200
    assert response.json()["cv_id"] == 5
