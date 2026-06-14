"""
Sprint 4 — tests for GET /api/v1/chatbot/my-jobs.

The DB dependency is overridden; get_jobs_by_recruiter is mocked
to avoid real DB queries.
"""

import pytest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.middleware.auth import get_current_user
from app.db.database import get_db


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------


def _mock_user(user_id: int = 1, role_name: str = "recruiter") -> MagicMock:
    user = MagicMock()
    user.id = user_id
    user.role.name = role_name
    return user


def _make_job_dict(job_id: int, title: str, status: str = "active") -> dict:
    return {"id": job_id, "title": title, "status": status}


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = lambda: MagicMock()
    yield TestClient(app, raise_server_exceptions=True)
    app.dependency_overrides.clear()


@pytest.fixture()
def recruiter_client(client):
    app.dependency_overrides[get_current_user] = lambda: _mock_user(role_name="recruiter")
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture()
def seeker_client(client):
    app.dependency_overrides[get_current_user] = lambda: _mock_user(role_name="job_seeker")
    yield client
    app.dependency_overrides.pop(get_current_user, None)


# ---------------------------------------------------------------------------
# Auth / authorisation
# ---------------------------------------------------------------------------


class TestMyJobsAuth:
    def test_returns_401_without_token(self, client):
        response = client.get("/api/v1/chatbot/my-jobs")
        # FastAPI may return 401 or 403 depending on security scheme; both mean unauthenticated.
        assert response.status_code in (401, 403)

    def test_returns_403_for_job_seeker(self, seeker_client):
        response = seeker_client.get("/api/v1/chatbot/my-jobs")
        assert response.status_code == 403

    def test_returns_403_for_admin(self, client):
        app.dependency_overrides[get_current_user] = lambda: _mock_user(role_name="admin")
        response = client.get("/api/v1/chatbot/my-jobs")
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


class TestMyJobsHappyPath:
    def test_returns_200_for_recruiter(self, recruiter_client):
        with patch(
            "app.chatbot.routes.get_jobs_by_recruiter",
            return_value=[_make_job_dict(1, "Backend Senior")],
        ):
            response = recruiter_client.get("/api/v1/chatbot/my-jobs")
        assert response.status_code == 200

    def test_returns_list_of_jobs(self, recruiter_client):
        jobs = [
            _make_job_dict(1, "Backend Senior", "active"),
            _make_job_dict(2, "Frontend Junior", "active"),
        ]
        with patch("app.chatbot.routes.get_jobs_by_recruiter", return_value=jobs):
            response = recruiter_client.get("/api/v1/chatbot/my-jobs")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

    def test_each_job_has_required_fields(self, recruiter_client):
        with patch(
            "app.chatbot.routes.get_jobs_by_recruiter",
            return_value=[_make_job_dict(5, "PM Senior", "active")],
        ):
            response = recruiter_client.get("/api/v1/chatbot/my-jobs")
        job = response.json()[0]
        assert "id" in job
        assert "title" in job
        assert "status" in job

    def test_returns_correct_job_values(self, recruiter_client):
        with patch(
            "app.chatbot.routes.get_jobs_by_recruiter",
            return_value=[_make_job_dict(42, "Data Engineer", "active")],
        ):
            response = recruiter_client.get("/api/v1/chatbot/my-jobs")
        job = response.json()[0]
        assert job["id"] == 42
        assert job["title"] == "Data Engineer"
        assert job["status"] == "active"

    def test_returns_empty_list_when_no_jobs(self, recruiter_client):
        with patch("app.chatbot.routes.get_jobs_by_recruiter", return_value=[]):
            response = recruiter_client.get("/api/v1/chatbot/my-jobs")
        assert response.status_code == 200
        assert response.json() == []

    def test_passes_recruiter_id_to_service(self, client):
        app.dependency_overrides[get_current_user] = lambda: _mock_user(
            user_id=99, role_name="recruiter"
        )
        captured = {}

        def _capture(recruiter_id, db):
            captured["recruiter_id"] = recruiter_id
            return []

        with patch("app.chatbot.routes.get_jobs_by_recruiter", side_effect=_capture):
            client.get("/api/v1/chatbot/my-jobs")

        assert captured.get("recruiter_id") == 99

    def test_returns_jobs_with_different_statuses(self, recruiter_client):
        jobs = [
            _make_job_dict(1, "Active Job", "active"),
            _make_job_dict(2, "Closed Job", "closed"),
        ]
        with patch("app.chatbot.routes.get_jobs_by_recruiter", return_value=jobs):
            response = recruiter_client.get("/api/v1/chatbot/my-jobs")
        statuses = {j["status"] for j in response.json()}
        assert statuses == {"active", "closed"}


# ---------------------------------------------------------------------------
# job_service unit tests (no HTTP)
# ---------------------------------------------------------------------------


class TestGetJobsByRecruiter:
    def test_returns_list_of_dicts(self):
        from app.chatbot.services.job_service import get_jobs_by_recruiter

        mock_job = MagicMock()
        mock_job.id = 1
        mock_job.title = "Backend Dev"
        mock_job.status = "active"

        mock_db = MagicMock()
        mock_db.query.return_value.join.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_job]

        result = get_jobs_by_recruiter(recruiter_id=5, db=mock_db)
        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0] == {"id": 1, "title": "Backend Dev", "status": "active"}

    def test_returns_empty_list_when_no_jobs(self):
        from app.chatbot.services.job_service import get_jobs_by_recruiter

        mock_db = MagicMock()
        mock_db.query.return_value.join.return_value.filter.return_value.order_by.return_value.all.return_value = []

        result = get_jobs_by_recruiter(recruiter_id=5, db=mock_db)
        assert result == []

    def test_each_dict_has_id_title_status_keys(self):
        from app.chatbot.services.job_service import get_jobs_by_recruiter

        mock_job = MagicMock()
        mock_job.id = 10
        mock_job.title = "DevOps"
        mock_job.status = "closed"

        mock_db = MagicMock()
        mock_db.query.return_value.join.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_job]

        result = get_jobs_by_recruiter(recruiter_id=1, db=mock_db)
        assert set(result[0].keys()) == {"id", "title", "status"}
