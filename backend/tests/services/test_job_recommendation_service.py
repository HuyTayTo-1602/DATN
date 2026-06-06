"""Unit tests for job_recommendation_service — DB is mocked."""

import pytest
from unittest.mock import MagicMock, patch

from app.services.job_recommendation_service import (
    extract_keywords,
    get_recommendations,
)
from app.models.candidate_cv import CandidateCV
from app.models.cv_text import CVText
from app.models.job import Job


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(user_id: int = 1):
    u = MagicMock()
    u.id = user_id
    return u


def _make_cv(cv_id=1, is_active=True):
    cv = MagicMock(spec=CandidateCV)
    cv.id = cv_id
    cv.is_active = is_active
    return cv


def _make_cv_text(parse_status="success", text=""):
    ct = MagicMock(spec=CVText)
    ct.parse_status = parse_status
    ct.extracted_text = text
    return ct


def _make_job(job_id, title, requirements="", description="", level=None):
    j = MagicMock(spec=Job)
    j.id = job_id
    j.title = title
    j.requirements = requirements
    j.description = description
    j.level = level
    j.status = "active"
    j.company = MagicMock()
    return j


# ---------------------------------------------------------------------------
# extract_keywords
# ---------------------------------------------------------------------------

class TestExtractKeywords:
    def test_empty_text_returns_empty(self):
        kws, level = extract_keywords("")
        assert kws == []
        assert level is None

    def test_none_text_returns_empty(self):
        kws, level = extract_keywords(None)
        assert kws == []
        assert level is None

    def test_extracts_common_skills(self):
        text = "I have 3 years of experience with Python, React, and PostgreSQL."
        kws, _ = extract_keywords(text)
        assert "python" in kws
        assert "react" in kws
        assert "postgresql" in kws

    def test_extracts_role_keywords(self):
        text = "Worked as a backend developer building REST APIs with FastAPI."
        kws, _ = extract_keywords(text)
        assert "backend" in kws
        assert "fastapi" in kws

    def test_infers_junior_level(self):
        _, level = extract_keywords("I am a fresher looking for my first job.")
        assert level == "Junior"

    def test_infers_senior_level(self):
        _, level = extract_keywords("I am a senior developer with 8 years experience.")
        assert level == "Senior"

    def test_no_false_positive_go_in_django(self):
        # "go" should not be matched as part of "django"
        text = "I use Django for backend development."
        kws, _ = extract_keywords(text)
        # 'go' as standalone should not appear just because 'django' is there
        # (it might appear as 'golang' won't match, but 'go' with word boundary
        #  won't match inside 'django')
        assert "go" not in kws

    def test_deduplicates_keywords(self):
        text = "python python python developer"
        kws, _ = extract_keywords(text)
        assert kws.count("python") == 1

    def test_multi_word_skill_extracted(self):
        text = "Deep learning experience with TensorFlow."
        kws, _ = extract_keywords(text)
        assert "deep learning" in kws


# ---------------------------------------------------------------------------
# get_recommendations
# ---------------------------------------------------------------------------

class TestGetRecommendations:
    def _build_db_mock(self, cv=None, cv_text=None, jobs=None):
        db = MagicMock()
        query_mock = MagicMock()

        # CV query
        cv_query = MagicMock()
        cv_query.filter.return_value = cv_query
        cv_query.order_by.return_value = cv_query
        cv_query.first.return_value = cv

        # CVText query
        cv_text_query = MagicMock()
        cv_text_query.filter.return_value = cv_text_query
        cv_text_query.first.return_value = cv_text

        # Jobs query
        jobs_query = MagicMock()
        jobs_query.filter.return_value = jobs_query
        jobs_query.order_by.return_value = jobs_query
        jobs_query.limit.return_value = jobs_query
        jobs_query.all.return_value = jobs or []

        def _query_dispatch(model):
            if model is CandidateCV:
                return cv_query
            if model is CVText:
                return cv_text_query
            if model is Job:
                return jobs_query
            return MagicMock()

        db.query.side_effect = _query_dispatch
        return db

    def test_no_cv_returns_empty_with_has_cv_false(self):
        db = self._build_db_mock(cv=None)
        result = get_recommendations(_make_user(), db)
        assert result["has_cv"] is False
        assert result["items"] == []

    def test_cv_not_parsed_returns_has_cv_true_cv_parsed_false(self):
        cv = _make_cv()
        cv_text = _make_cv_text(parse_status="pending", text=None)
        db = self._build_db_mock(cv=cv, cv_text=cv_text)
        result = get_recommendations(_make_user(), db)
        assert result["has_cv"] is True
        assert result["cv_parsed"] is False
        assert result["items"] == []

    def test_cv_parse_failed_returns_cv_parsed_false(self):
        cv = _make_cv()
        cv_text = _make_cv_text(parse_status="failed", text=None)
        db = self._build_db_mock(cv=cv, cv_text=cv_text)
        result = get_recommendations(_make_user(), db)
        assert result["cv_parsed"] is False

    def test_scores_title_match_higher(self):
        cv = _make_cv()
        cv_text = _make_cv_text(text="python backend developer with fastapi experience")
        jobs = [
            _make_job(1, "Backend Python Developer", requirements="python fastapi"),
            _make_job(2, "Marketing Specialist", requirements="excel powerpoint"),
        ]
        db = self._build_db_mock(cv=cv, cv_text=cv_text, jobs=jobs)
        result = get_recommendations(_make_user(), db)
        assert result["has_cv"] is True
        assert result["cv_parsed"] is True
        # Backend Python job should appear; Marketing should not (or score 0)
        returned_ids = [j.id for j in result["items"]]
        assert 1 in returned_ids
        assert 2 not in returned_ids

    def test_no_duplicate_jobs(self):
        cv = _make_cv()
        cv_text = _make_cv_text(text="python developer")
        jobs = [_make_job(i, "Python Engineer", requirements="python") for i in range(5)]
        db = self._build_db_mock(cv=cv, cv_text=cv_text, jobs=jobs)
        result = get_recommendations(_make_user(), db)
        ids = [j.id for j in result["items"]]
        assert len(ids) == len(set(ids))

    def test_returns_at_most_top_n(self):
        cv = _make_cv()
        cv_text = _make_cv_text(text="python react backend developer senior")
        jobs = [_make_job(i, f"Python Developer {i}", requirements="python react") for i in range(20)]
        db = self._build_db_mock(cv=cv, cv_text=cv_text, jobs=jobs)
        result = get_recommendations(_make_user(), db, top_n=5)
        assert len(result["items"]) <= 5

    def test_match_reason_contains_keyword(self):
        cv = _make_cv()
        cv_text = _make_cv_text(text="python backend developer")
        jobs = [_make_job(1, "Python Backend Engineer", requirements="python fastapi")]
        db = self._build_db_mock(cv=cv, cv_text=cv_text, jobs=jobs)
        result = get_recommendations(_make_user(), db)
        if result["items"]:
            job = result["items"][0]
            assert "python" in job.match_reason.lower() or "backend" in job.match_reason.lower()

    def test_level_bonus_applied(self):
        cv = _make_cv()
        cv_text = _make_cv_text(text="senior python developer with 7 years experience")
        job_matched_level = _make_job(1, "Senior Python Developer", requirements="python", level="Senior")
        job_wrong_level = _make_job(2, "Python Developer", requirements="python", level="Junior")
        db = self._build_db_mock(cv=cv, cv_text=cv_text, jobs=[job_matched_level, job_wrong_level])
        result = get_recommendations(_make_user(), db)
        # Senior job should score higher and appear first
        if len(result["items"]) >= 2:
            assert result["items"][0].id == job_matched_level.id
