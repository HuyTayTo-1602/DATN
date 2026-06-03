"""
Unit tests for app.chatbot.services.applicant_service.

All database interaction is mocked — no real DB connection required.
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

from app.chatbot.services.applicant_service import (
    verify_job_ownership,
    get_applicants_by_job,
)
from app.models.job import Job
from app.models.application import JobApplication
from app.models.user import User
from app.models.profile import UserProfile


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mock_job(id: int = 1, title: str = "Backend Senior") -> MagicMock:
    job = MagicMock(spec=Job)
    job.id = id
    job.title = title
    job.status = "active"
    return job


def _mock_applicant_row(
    user_id: int = 10,
    app_cv_url: str | None = "http://s.com/cv.pdf",
    profile_cv_url: str | None = None,
) -> tuple:
    application = MagicMock(spec=JobApplication)
    application.id = 100 + user_id
    application.user_id = user_id
    application.cv_url = app_cv_url
    application.status = "pending"
    application.cover_letter = "Cover letter text"

    user = MagicMock(spec=User)
    user.id = user_id
    user.email = f"user{user_id}@test.com"

    profile = MagicMock(spec=UserProfile)
    profile.full_name = f"User {user_id}"
    profile.skills = "Python, FastAPI"
    profile.experience = "3 years"
    profile.education = "BSc Computer Science"
    profile.bio = "Developer bio"
    profile.cv_url = profile_cv_url

    return (application, user, profile)


def _make_ownership_db(owned_job: MagicMock | None, fallback_job: MagicMock | None = None):
    """
    Build a mock Session where:
    - First db.query(...) chain returns owned_job (ownership check)
    - Second db.query(...) chain (existence check) returns fallback_job
    """
    db = MagicMock()
    ownership_q = MagicMock()
    ownership_q.join.return_value = ownership_q
    ownership_q.filter.return_value = ownership_q
    ownership_q.first.return_value = owned_job

    existence_q = MagicMock()
    existence_q.filter.return_value = existence_q
    existence_q.first.return_value = fallback_job

    call_count = {"n": 0}

    def _query(*args):
        call_count["n"] += 1
        return ownership_q if call_count["n"] == 1 else existence_q

    db.query.side_effect = _query
    return db


def _make_full_db(owned_job: MagicMock, rows: list) -> MagicMock:
    """
    Build a mock Session for get_applicants_by_job:
    - Ownership query returns owned_job
    - Applicants query returns rows
    """
    db = MagicMock()

    ownership_q = MagicMock()
    ownership_q.join.return_value = ownership_q
    ownership_q.filter.return_value = ownership_q
    ownership_q.first.return_value = owned_job

    applicants_q = MagicMock()
    applicants_q.join.return_value = applicants_q
    applicants_q.outerjoin.return_value = applicants_q
    applicants_q.filter.return_value = applicants_q
    applicants_q.all.return_value = rows

    call_count = {"n": 0}

    def _query(*args):
        call_count["n"] += 1
        # verify_job_ownership calls db.query(Job) twice when not found;
        # in the happy path it calls once (ownership) then once (applicants).
        return ownership_q if call_count["n"] == 1 else applicants_q

    db.query.side_effect = _query
    return db


# ---------------------------------------------------------------------------
# verify_job_ownership
# ---------------------------------------------------------------------------


def test_verify_ownership_returns_job_when_owned():
    job = _mock_job()
    db = _make_ownership_db(owned_job=job)

    result = verify_job_ownership(job_id=1, recruiter_id=5, db=db)

    assert result is job


def test_verify_ownership_raises_404_when_job_missing():
    db = _make_ownership_db(owned_job=None, fallback_job=None)

    with pytest.raises(HTTPException) as exc:
        verify_job_ownership(job_id=999, recruiter_id=5, db=db)

    assert exc.value.status_code == 404


def test_verify_ownership_raises_403_when_not_owner():
    # Ownership query returns None, but job exists for someone else
    db = _make_ownership_db(owned_job=None, fallback_job=_mock_job())

    with pytest.raises(HTTPException) as exc:
        verify_job_ownership(job_id=1, recruiter_id=5, db=db)

    assert exc.value.status_code == 403


# ---------------------------------------------------------------------------
# get_applicants_by_job
# ---------------------------------------------------------------------------


def test_get_applicants_returns_list_of_dicts():
    job = _mock_job()
    rows = [_mock_applicant_row(user_id=10), _mock_applicant_row(user_id=11)]
    db = _make_full_db(owned_job=job, rows=rows)

    result = get_applicants_by_job(job_id=1, recruiter_id=5, db=db)

    assert len(result) == 2
    assert result[0]["user_id"] == 10
    assert result[1]["user_id"] == 11


def test_get_applicants_returns_empty_list_when_no_applicants():
    job = _mock_job()
    db = _make_full_db(owned_job=job, rows=[])

    result = get_applicants_by_job(job_id=1, recruiter_id=5, db=db)

    assert result == []


def test_get_applicants_uses_application_cv_url_first():
    job = _mock_job()
    row = _mock_applicant_row(app_cv_url="http://app.com/cv.pdf", profile_cv_url="http://profile.com/cv.pdf")
    db = _make_full_db(owned_job=job, rows=[row])

    result = get_applicants_by_job(job_id=1, recruiter_id=5, db=db)

    assert result[0]["cv_url"] == "http://app.com/cv.pdf"


def test_get_applicants_falls_back_to_profile_cv_url():
    """When application has no cv_url, profile cv_url is used."""
    job = _mock_job()
    row = _mock_applicant_row(app_cv_url=None, profile_cv_url="http://profile.com/cv.pdf")
    db = _make_full_db(owned_job=job, rows=[row])

    result = get_applicants_by_job(job_id=1, recruiter_id=5, db=db)

    assert result[0]["cv_url"] == "http://profile.com/cv.pdf"


def test_get_applicants_cv_url_is_none_when_both_missing():
    job = _mock_job()
    row = _mock_applicant_row(app_cv_url=None, profile_cv_url=None)
    db = _make_full_db(owned_job=job, rows=[row])

    result = get_applicants_by_job(job_id=1, recruiter_id=5, db=db)

    assert result[0]["cv_url"] is None


def test_get_applicants_dict_has_expected_keys():
    job = _mock_job()
    row = _mock_applicant_row()
    db = _make_full_db(owned_job=job, rows=[row])

    result = get_applicants_by_job(job_id=1, recruiter_id=5, db=db)

    expected_keys = {
        "application_id", "user_id", "email", "full_name",
        "skills", "experience", "education", "bio",
        "cv_url", "application_status", "cover_letter",
    }
    assert expected_keys == result[0].keys()


def test_get_applicants_raises_403_when_not_owner():
    db = _make_ownership_db(owned_job=None, fallback_job=_mock_job())

    with pytest.raises(HTTPException) as exc:
        get_applicants_by_job(job_id=1, recruiter_id=99, db=db)

    assert exc.value.status_code == 403
