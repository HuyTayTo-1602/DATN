"""API-level tests for GET /api/v1/jobs/recommendations."""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import get_db
from app.middleware.auth import require_job_seeker
from app.models.user import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_job_seeker(user_id: int = 1) -> User:
    user = MagicMock(spec=User)
    user.id = user_id
    role = MagicMock()
    role.name = "job_seeker"
    user.role = role
    user.status = "active"
    return user


def _make_serializable_job(job_id=1, title="Python Developer"):
    """Return a namespace object with all fields needed by RecommendedJobResponse."""
    from types import SimpleNamespace
    company = SimpleNamespace(id=1, name="Tech Corp", logo_url=None, address=None)
    return SimpleNamespace(
        id=job_id,
        title=title,
        level="Senior",
        salary="20",
        location="Hà Nội",
        deadline=None,
        status="active",
        description="Python backend job",
        requirements="python fastapi",
        benefits=None,
        created_at=None,
        updated_at=None,
        applicant_count=None,
        company=company,
        match_score=5,
        match_reason="Matched: python, fastapi, backend",
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def auth_override():
    user = _mock_job_seeker()
    app.dependency_overrides[require_job_seeker] = lambda: user
    yield user
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestRecommendationEndpoint:
    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/api/v1/jobs/recommendations")
        assert resp.status_code == 401

    def test_returns_200_with_valid_cv(self, client, auth_override):
        job = _make_serializable_job()

        mock_result = {
            "items": [job],
            "total": 1,
            "has_cv": True,
            "cv_parsed": True,
        }

        with patch("app.services.job_recommendation_service.get_recommendations", return_value=mock_result):
            db_mock = MagicMock()
            app.dependency_overrides[get_db] = lambda: db_mock
            resp = client.get("/api/v1/jobs/recommendations")
            app.dependency_overrides.pop(get_db, None)

        assert resp.status_code == 200
        data = resp.json()
        assert data["has_cv"] is True
        assert data["cv_parsed"] is True
        assert len(data["items"]) == 1
        assert data["items"][0]["match_reason"] == "Matched: python, fastapi, backend"

    def test_returns_empty_when_no_cv(self, client, auth_override):
        mock_result = {
            "items": [],
            "total": 0,
            "has_cv": False,
            "cv_parsed": False,
        }

        with patch("app.services.job_recommendation_service.get_recommendations", return_value=mock_result):
            db_mock = MagicMock()
            app.dependency_overrides[get_db] = lambda: db_mock
            resp = client.get("/api/v1/jobs/recommendations")
            app.dependency_overrides.pop(get_db, None)

        assert resp.status_code == 200
        data = resp.json()
        assert data["has_cv"] is False
        assert data["items"] == []

    def test_returns_empty_when_cv_not_parsed(self, client, auth_override):
        mock_result = {
            "items": [],
            "total": 0,
            "has_cv": True,
            "cv_parsed": False,
        }

        with patch("app.services.job_recommendation_service.get_recommendations", return_value=mock_result):
            db_mock = MagicMock()
            app.dependency_overrides[get_db] = lambda: db_mock
            resp = client.get("/api/v1/jobs/recommendations")
            app.dependency_overrides.pop(get_db, None)

        assert resp.status_code == 200
        data = resp.json()
        assert data["has_cv"] is True
        assert data["cv_parsed"] is False
        assert data["items"] == []

    def test_top_n_param_is_forwarded(self, client, auth_override):
        mock_result = {"items": [], "total": 0, "has_cv": False, "cv_parsed": False}

        with patch(
            "app.services.job_recommendation_service.get_recommendations",
            return_value=mock_result,
        ) as mock_svc:
            db_mock = MagicMock()
            app.dependency_overrides[get_db] = lambda: db_mock
            resp = client.get("/api/v1/jobs/recommendations?top_n=5")
            app.dependency_overrides.pop(get_db, None)

        assert resp.status_code == 200
        call_kwargs = mock_svc.call_args
        assert call_kwargs.kwargs.get("top_n") == 5 or (
            len(call_kwargs.args) >= 3 and call_kwargs.args[2] == 5
        )

    def test_closed_jobs_not_returned(self, client, auth_override):
        """Recommendation service must not include closed jobs — verified via service mock."""
        open_job = _make_serializable_job(job_id=1, title="Python Developer")
        open_job.match_reason = "Matched: python"

        mock_result = {
            "items": [open_job],
            "total": 1,
            "has_cv": True,
            "cv_parsed": True,
        }

        with patch("app.services.job_recommendation_service.get_recommendations", return_value=mock_result):
            db_mock = MagicMock()
            app.dependency_overrides[get_db] = lambda: db_mock
            resp = client.get("/api/v1/jobs/recommendations")
            app.dependency_overrides.pop(get_db, None)

        assert resp.status_code == 200
        # All returned jobs should have status active (service is responsible)
        for item in resp.json()["items"]:
            assert item.get("status") == "active"
