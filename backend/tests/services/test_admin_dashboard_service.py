"""Unit tests for admin_dashboard_service — each aggregation function tested independently."""

import pytest
from unittest.mock import MagicMock, patch

from app.services import admin_dashboard_service


def _make_db():
    return MagicMock()


# ---------------------------------------------------------------------------
# get_totals
# ---------------------------------------------------------------------------

class TestGetTotals:
    def test_returns_all_counts(self):
        db = _make_db()
        seeker_role = MagicMock()
        seeker_role.id = 1
        recruiter_role = MagicMock()
        recruiter_role.id = 2

        # Role lookups via .filter().first()
        db.query.return_value.filter.return_value.first.side_effect = [seeker_role, recruiter_role]

        # candidates and recruiters use .filter().scalar()
        db.query.return_value.filter.return_value.scalar.side_effect = [6, 3]

        # total_users, companies, jobs, applications use .scalar() directly
        db.query.return_value.scalar.side_effect = [10, 4, 12, 20]

        result = admin_dashboard_service.get_totals(db)

        assert result["users"] == 10
        assert result["candidates"] == 6
        assert result["recruiters"] == 3
        assert result["companies"] == 4
        assert result["jobs"] == 12
        assert result["applications"] == 20

    def test_returns_zeros_when_roles_missing(self):
        db = _make_db()
        db.query.return_value.filter.return_value.first.return_value = None
        db.query.return_value.scalar.side_effect = [0, 0, 0, 0]

        result = admin_dashboard_service.get_totals(db)

        assert result["candidates"] == 0
        assert result["recruiters"] == 0

    def test_handles_none_scalar(self):
        db = _make_db()
        db.query.return_value.filter.return_value.first.return_value = None
        db.query.return_value.scalar.return_value = None

        result = admin_dashboard_service.get_totals(db)

        assert result["users"] == 0
        assert result["companies"] == 0


# ---------------------------------------------------------------------------
# get_jobs_by_status
# ---------------------------------------------------------------------------

class TestGetJobsByStatus:
    def test_maps_status_counts(self):
        db = _make_db()
        db.query.return_value.group_by.return_value.all.return_value = [
            ("active", 5),
            ("closed", 3),
        ]

        result = admin_dashboard_service.get_jobs_by_status(db)

        assert result == {"active": 5, "closed": 3}

    def test_unknown_status_ignored(self):
        db = _make_db()
        db.query.return_value.group_by.return_value.all.return_value = [
            ("active", 2),
            ("unknown_status", 99),
        ]

        result = admin_dashboard_service.get_jobs_by_status(db)

        assert result["active"] == 2
        assert "unknown_status" not in result

    def test_returns_zeros_when_empty(self):
        db = _make_db()
        db.query.return_value.group_by.return_value.all.return_value = []

        result = admin_dashboard_service.get_jobs_by_status(db)

        assert result == {"active": 0, "closed": 0}


# ---------------------------------------------------------------------------
# get_applications_by_status
# ---------------------------------------------------------------------------

class TestGetApplicationsByStatus:
    def test_maps_all_statuses(self):
        db = _make_db()
        db.query.return_value.group_by.return_value.all.return_value = [
            ("pending", 10),
            ("accepted", 2),
            ("rejected", 3),
        ]

        result = admin_dashboard_service.get_applications_by_status(db)

        assert result == {"pending": 10, "accepted": 2, "rejected": 3}

    def test_returns_zeros_when_empty(self):
        db = _make_db()
        db.query.return_value.group_by.return_value.all.return_value = []

        result = admin_dashboard_service.get_applications_by_status(db)

        assert result == {"pending": 0, "accepted": 0, "rejected": 0}


# ---------------------------------------------------------------------------
# get_top_companies
# ---------------------------------------------------------------------------

class TestGetTopCompanies:
    def test_returns_list_of_companies(self):
        db = _make_db()
        row1 = MagicMock()
        row1.id, row1.name, row1.job_count = 1, "Acme Corp", 10
        row2 = MagicMock()
        row2.id, row2.name, row2.job_count = 2, "Beta Ltd", 5

        (db.query.return_value
            .outerjoin.return_value
            .group_by.return_value
            .order_by.return_value
            .limit.return_value
            .all.return_value) = [row1, row2]

        result = admin_dashboard_service.get_top_companies(db, limit=5)

        assert len(result) == 2
        assert result[0] == {"id": 1, "name": "Acme Corp", "job_count": 10}
        assert result[1] == {"id": 2, "name": "Beta Ltd", "job_count": 5}

    def test_returns_empty_list_when_no_companies(self):
        db = _make_db()
        (db.query.return_value
            .outerjoin.return_value
            .group_by.return_value
            .order_by.return_value
            .limit.return_value
            .all.return_value) = []

        result = admin_dashboard_service.get_top_companies(db)

        assert result == []


# ---------------------------------------------------------------------------
# get_cv_parse_stats
# ---------------------------------------------------------------------------

class TestGetCVParseStats:
    def test_returns_stats(self):
        db = _make_db()
        db.query.return_value.scalar.return_value = 15
        db.query.return_value.group_by.return_value.all.return_value = [
            ("success", 10),
            ("failed", 3),
            ("pending", 2),
        ]

        result = admin_dashboard_service.get_cv_parse_stats(db)

        assert result["total"] == 15
        assert result["success"] == 10
        assert result["failed"] == 3
        assert result["pending"] == 2

    def test_handles_empty_cv_text_table(self):
        db = _make_db()
        db.query.return_value.scalar.return_value = 0
        db.query.return_value.group_by.return_value.all.return_value = []

        result = admin_dashboard_service.get_cv_parse_stats(db)

        assert result == {"total": 0, "success": 0, "failed": 0, "pending": 0}


# ---------------------------------------------------------------------------
# get_dashboard_summary (integration of all sub-functions)
# ---------------------------------------------------------------------------

class TestGetDashboardSummary:
    def test_structure_contains_all_keys(self):
        db = _make_db()
        _period = {"period": "30d", "new_users": 0, "new_jobs": 0, "new_applications": 0, "new_companies": 0,
                   "change_users_pct": None, "change_jobs_pct": None, "change_applications_pct": None, "change_companies_pct": None}

        with (
            patch.object(admin_dashboard_service, "get_totals", return_value={"users": 1, "candidates": 0, "recruiters": 0, "companies": 0, "jobs": 0, "applications": 0}),
            patch.object(admin_dashboard_service, "get_period_stats", return_value=_period),
            patch.object(admin_dashboard_service, "get_jobs_by_status", return_value={"active": 0, "closed": 0}),
            patch.object(admin_dashboard_service, "get_applications_by_status", return_value={"pending": 0, "accepted": 0, "rejected": 0}),
            patch.object(admin_dashboard_service, "get_top_companies", return_value=[]),
            patch.object(admin_dashboard_service, "get_cv_parse_stats", return_value={"total": 0, "success": 0, "failed": 0, "pending": 0}),
            patch.object(admin_dashboard_service, "get_weekly_trend", return_value=[]),
            patch.object(admin_dashboard_service, "get_attention_metrics", return_value={"overdue_applications": 0, "inactive_users": 0}),
        ):
            result = admin_dashboard_service.get_dashboard_summary(db)

        assert set(result.keys()) == {
            "totals", "period_stats", "jobs_by_status", "applications_by_status",
            "top_companies", "cv_parse_stats", "weekly_trend", "attention",
        }

    def test_passes_period_to_period_stats(self):
        db = _make_db()
        with patch.object(admin_dashboard_service, "get_period_stats", return_value={}) as mock_ps, \
             patch.object(admin_dashboard_service, "get_totals", return_value={}), \
             patch.object(admin_dashboard_service, "get_jobs_by_status", return_value={}), \
             patch.object(admin_dashboard_service, "get_applications_by_status", return_value={}), \
             patch.object(admin_dashboard_service, "get_top_companies", return_value=[]), \
             patch.object(admin_dashboard_service, "get_cv_parse_stats", return_value={}), \
             patch.object(admin_dashboard_service, "get_weekly_trend", return_value=[]), \
             patch.object(admin_dashboard_service, "get_attention_metrics", return_value={}):
            admin_dashboard_service.get_dashboard_summary(db, period="7d")
        mock_ps.assert_called_once_with(db, "7d")
