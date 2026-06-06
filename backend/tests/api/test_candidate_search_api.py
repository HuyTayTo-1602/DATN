"""
API tests for GET /api/v1/recruiter/candidates/search
Kiểm tra: phân quyền, kết quả thành công, case nhiều skill, case không kết quả.
"""

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

def _make_user(role_name: str, user_id: int = 1) -> User:
    user = MagicMock(spec=User)
    user.id = user_id
    user.status = "active"
    role = MagicMock()
    role.name = role_name
    user.role = role
    return user


_EMPTY_RESULT = {"total": 0, "page": 1, "page_size": 10, "items": []}

_SAMPLE_RESULT = {
    "total": 2,
    "page": 1,
    "page_size": 10,
    "items": [
        {
            "user_id": 10,
            "email": "alice@example.com",
            "full_name": "Alice Dev",
            "skills": "Python, Django, PostgreSQL",
            "experience": "3 years backend",
            "bio": None,
            "avatar_url": None,
            "cv_id": 5,
            "cv_file_name": "alice_cv.pdf",
            "score": 0.6,
        },
        {
            "user_id": 11,
            "email": "bob@example.com",
            "full_name": "Bob Engineer",
            "skills": "Java, Spring Boot",
            "experience": "5 years Java",
            "bio": None,
            "avatar_url": None,
            "cv_id": 6,
            "cv_file_name": "bob_cv.pdf",
            "score": 0.3,
        },
    ],
}


def _override_auth(user):
    app.dependency_overrides[get_current_user] = lambda: user


def _override_db(db):
    app.dependency_overrides[get_db] = lambda: db


def _clear():
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Phân quyền
# ---------------------------------------------------------------------------

class TestCandidateSearchAuth:
    def setup_method(self):
        _clear()

    def test_401_without_token(self):
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/api/v1/recruiter/candidates/search")
        assert resp.status_code == 401

    def test_403_for_job_seeker(self):
        _override_auth(_make_user("job_seeker"))
        _override_db(MagicMock())
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/api/v1/recruiter/candidates/search")
        assert resp.status_code == 403

    def test_200_for_recruiter(self):
        _override_auth(_make_user("recruiter"))
        _override_db(MagicMock())
        with patch(
            "app.services.candidate_search_service.search_candidates",
            return_value=_EMPTY_RESULT,
        ):
            client = TestClient(app)
            resp = client.get("/api/v1/recruiter/candidates/search")
        assert resp.status_code == 200

    def test_200_for_admin(self):
        _override_auth(_make_user("admin"))
        _override_db(MagicMock())
        with patch(
            "app.services.candidate_search_service.search_candidates",
            return_value=_EMPTY_RESULT,
        ):
            client = TestClient(app)
            resp = client.get("/api/v1/recruiter/candidates/search")
        assert resp.status_code == 200

    def teardown_method(self):
        _clear()


# ---------------------------------------------------------------------------
# Kết quả tìm kiếm
# ---------------------------------------------------------------------------

class TestCandidateSearchResults:
    def setup_method(self):
        _clear()

    def test_returns_matching_candidates(self):
        _override_auth(_make_user("recruiter"))
        _override_db(MagicMock())
        with patch(
            "app.services.candidate_search_service.search_candidates",
            return_value=_SAMPLE_RESULT,
        ):
            client = TestClient(app)
            resp = client.get("/api/v1/recruiter/candidates/search?q=python")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2
        assert data["items"][0]["user_id"] == 10
        assert data["items"][0]["score"] == 0.6

    def test_empty_result_when_no_match(self):
        _override_auth(_make_user("recruiter"))
        _override_db(MagicMock())
        with patch(
            "app.services.candidate_search_service.search_candidates",
            return_value=_EMPTY_RESULT,
        ):
            client = TestClient(app)
            resp = client.get("/api/v1/recruiter/candidates/search?q=cobol_dinosaur_lang")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_multi_skill_query_passed_to_service(self):
        _override_auth(_make_user("recruiter"))
        _override_db(MagicMock())
        captured = {}
        def fake_search(q, db, page, page_size):
            captured["q"] = q
            return _EMPTY_RESULT
        with patch("app.services.candidate_search_service.search_candidates", side_effect=fake_search):
            client = TestClient(app)
            client.get("/api/v1/recruiter/candidates/search?q=java+python+backend")
        assert captured["q"] == "java python backend"

    def test_pagination_params_passed_to_service(self):
        _override_auth(_make_user("recruiter"))
        _override_db(MagicMock())
        captured = {}
        def fake_search(q, db, page, page_size):
            captured["page"] = page
            captured["page_size"] = page_size
            return _EMPTY_RESULT
        with patch("app.services.candidate_search_service.search_candidates", side_effect=fake_search):
            client = TestClient(app)
            client.get("/api/v1/recruiter/candidates/search?q=java&page=2&page_size=5")
        assert captured["page"] == 2
        assert captured["page_size"] == 5

    def test_response_schema_has_required_fields(self):
        _override_auth(_make_user("recruiter"))
        _override_db(MagicMock())
        with patch(
            "app.services.candidate_search_service.search_candidates",
            return_value=_SAMPLE_RESULT,
        ):
            client = TestClient(app)
            resp = client.get("/api/v1/recruiter/candidates/search?q=python")
        data = resp.json()
        for key in ("total", "page", "page_size", "items"):
            assert key in data
        item = data["items"][0]
        for key in ("user_id", "email", "full_name", "skills", "score"):
            assert key in item

    def teardown_method(self):
        _clear()
