"""API tests for GET /api/v1/admin/dashboard/summary."""

import pytest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.db.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_admin() -> User:
    user = MagicMock(spec=User)
    user.id = 1
    user.status = "active"
    role = MagicMock()
    role.name = "admin"
    user.role = role
    return user


def _make_non_admin(role_name: str = "job_seeker") -> User:
    user = MagicMock(spec=User)
    user.id = 2
    user.status = "active"
    role = MagicMock()
    role.name = role_name
    user.role = role
    return user


_SUMMARY = {
    "totals": {"users": 10, "candidates": 6, "recruiters": 3, "companies": 4, "jobs": 12, "applications": 20},
    "period_stats": {
        "period": "30d", "new_users": 5, "new_jobs": 10, "new_applications": 20, "new_companies": 2,
        "change_users_pct": 10.0, "change_jobs_pct": -5.0, "change_applications_pct": 15.0,
        "change_companies_pct": None,
    },
    "jobs_by_status": {"active": 8, "closed": 3, "draft": 1},
    "applications_by_status": {"pending": 10, "reviewed": 4, "accepted": 2, "rejected": 4},
    "top_companies": [{"id": 1, "name": "Acme Corp", "job_count": 5}],
    "cv_parse_stats": {"total": 15, "success": 10, "failed": 3, "pending": 2},
    "weekly_trend": [{"week_start": "01/06", "new_jobs": 3, "new_applications": 8}],
    "attention": {"draft_jobs": 1, "overdue_applications": 3, "inactive_users": 2},
}


def _override_auth(user):
    app.dependency_overrides[get_current_user] = lambda: user


def _override_db(db):
    app.dependency_overrides[get_db] = lambda: db


def _clear():
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Auth & permission tests
# ---------------------------------------------------------------------------

class TestDashboardSummaryAuth:
    def setup_method(self):
        _clear()

    def test_returns_401_without_token(self):
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/api/v1/admin/dashboard/summary")
        assert resp.status_code == 401

    def test_returns_403_for_job_seeker(self):
        _override_auth(_make_non_admin("job_seeker"))
        _override_db(MagicMock())
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/api/v1/admin/dashboard/summary")
        assert resp.status_code == 403

    def test_returns_403_for_recruiter(self):
        _override_auth(_make_non_admin("recruiter"))
        _override_db(MagicMock())
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/api/v1/admin/dashboard/summary")
        assert resp.status_code == 403

    def teardown_method(self):
        _clear()


# ---------------------------------------------------------------------------
# Success path
# ---------------------------------------------------------------------------

class TestDashboardSummarySuccess:
    def setup_method(self):
        _clear()

    def test_returns_200_with_full_summary(self):
        _override_auth(_make_admin())
        _override_db(MagicMock())

        with patch(
            "app.services.admin_dashboard_service.get_dashboard_summary",
            return_value=_SUMMARY,
        ):
            client = TestClient(app)
            resp = client.get("/api/v1/admin/dashboard/summary")

        assert resp.status_code == 200
        data = resp.json()
        assert data["totals"]["users"] == 10
        assert data["totals"]["companies"] == 4
        assert data["jobs_by_status"]["active"] == 8
        assert data["applications_by_status"]["pending"] == 10
        assert len(data["top_companies"]) == 1
        assert data["cv_parse_stats"]["total"] == 15

    def test_returns_200_with_empty_data(self):
        _override_auth(_make_admin())
        _override_db(MagicMock())

        empty_summary = {
            "totals": {"users": 0, "candidates": 0, "recruiters": 0, "companies": 0, "jobs": 0, "applications": 0},
            "period_stats": {"period": "30d", "new_users": 0, "new_jobs": 0, "new_applications": 0,
                             "new_companies": 0, "change_users_pct": None, "change_jobs_pct": None,
                             "change_applications_pct": None, "change_companies_pct": None},
            "jobs_by_status": {"active": 0, "closed": 0, "draft": 0},
            "applications_by_status": {"pending": 0, "reviewed": 0, "accepted": 0, "rejected": 0},
            "top_companies": [],
            "cv_parse_stats": {"total": 0, "success": 0, "failed": 0, "pending": 0},
            "weekly_trend": [],
            "attention": {"draft_jobs": 0, "overdue_applications": 0, "inactive_users": 0},
        }

        with patch(
            "app.services.admin_dashboard_service.get_dashboard_summary",
            return_value=empty_summary,
        ):
            client = TestClient(app)
            resp = client.get("/api/v1/admin/dashboard/summary")

        assert resp.status_code == 200
        data = resp.json()
        assert data["totals"]["users"] == 0
        assert data["top_companies"] == []

    def test_response_schema_has_all_keys(self):
        _override_auth(_make_admin())
        _override_db(MagicMock())

        with patch(
            "app.services.admin_dashboard_service.get_dashboard_summary",
            return_value=_SUMMARY,
        ):
            client = TestClient(app)
            resp = client.get("/api/v1/admin/dashboard/summary")

        data = resp.json()
        for key in ("totals", "period_stats", "jobs_by_status", "applications_by_status",
                    "top_companies", "cv_parse_stats", "weekly_trend", "attention"):
            assert key in data

        totals = data["totals"]
        for key in ("users", "candidates", "recruiters", "companies", "jobs", "applications"):
            assert key in totals

    def teardown_method(self):
        _clear()
