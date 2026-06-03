"""
Sprint 4 — unit tests for role_check, select_job, load_applicants nodes.

DB and PDF service calls are mocked — no real network or database required.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException, status
from langchain_core.runnables import RunnableConfig

from app.chatbot.nodes.role_check import role_check_node
from app.chatbot.nodes.select_job import select_job_node
from app.chatbot.nodes.load_applicants import load_applicants_node


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _state(**overrides) -> dict:
    base = {
        "user_id": 1,
        "role": "recruiter",
        "message": "Top ứng viên phù hợp nhất?",
        "job_id": 42,
        "intent": "applicant_query",
        "applicants": [],
        "batch_summaries": [],
        "answer": "",
        "blocked_reason": None,
    }
    base.update(overrides)
    return base


def _config(db=None) -> RunnableConfig:
    return RunnableConfig(configurable={"db": db or MagicMock(), "thread_id": "t-test"})


def _is_blocked(result: dict) -> bool:
    return bool(result.get("blocked_reason"))


def _make_raw_applicant(user_id: int = 10, cv_url: str | None = None) -> dict:
    return {
        "application_id": user_id * 100,
        "user_id": user_id,
        "email": f"user{user_id}@example.com",
        "full_name": f"User {user_id}",
        "skills": "Python, SQL",
        "experience": "3 years",
        "education": "Bachelor CS",
        "bio": "Experienced developer",
        "cv_url": cv_url,
        "application_status": "pending",
        "cover_letter": "I am interested in this role.",
    }


# ===========================================================================
# role_check_node
# ===========================================================================


class TestRoleCheckNode:
    def test_passes_for_recruiter(self):
        result = role_check_node(_state(role="recruiter"))
        assert not _is_blocked(result)

    def test_blocks_for_job_seeker(self):
        result = role_check_node(_state(role="job_seeker"))
        assert _is_blocked(result)

    def test_blocks_for_admin(self):
        result = role_check_node(_state(role="admin"))
        assert _is_blocked(result)

    def test_blocks_for_empty_role(self):
        result = role_check_node(_state(role=""))
        assert _is_blocked(result)

    def test_blocked_reason_is_non_empty_string(self):
        result = role_check_node(_state(role="job_seeker"))
        assert isinstance(result["blocked_reason"], str)
        assert len(result["blocked_reason"]) > 10

    def test_recruiter_returns_empty_dict(self):
        result = role_check_node(_state(role="recruiter"))
        assert result == {}

    def test_blocked_reason_mentions_recruiter(self):
        result = role_check_node(_state(role="job_seeker"))
        assert "recruiter" in result["blocked_reason"].lower() or "tuyển dụng" in result["blocked_reason"]


# ===========================================================================
# select_job_node
# ===========================================================================


class TestSelectJobNode:
    @pytest.mark.asyncio
    async def test_blocks_when_job_id_is_none(self):
        result = await select_job_node(_state(job_id=None), _config())
        assert _is_blocked(result)

    @pytest.mark.asyncio
    async def test_blocked_reason_when_no_job_id_is_non_empty(self):
        result = await select_job_node(_state(job_id=None), _config())
        assert isinstance(result["blocked_reason"], str)
        assert len(result["blocked_reason"]) > 0

    @pytest.mark.asyncio
    async def test_passes_when_job_is_owned(self):
        mock_job = MagicMock()
        with patch(
            "app.chatbot.nodes.select_job.verify_job_ownership",
            return_value=mock_job,
        ):
            result = await select_job_node(_state(job_id=42), _config())
        assert not _is_blocked(result)
        # Sprint 5: node now also returns job_info for downstream LLM nodes
        assert "job_info" in result

    @pytest.mark.asyncio
    async def test_returns_job_info_with_correct_fields(self):
        mock_job = MagicMock()
        mock_job.id = 42
        mock_job.title = "Backend Senior"
        mock_job.level = "Senior"
        mock_job.salary = "30-50 triệu"
        mock_job.location = "Hà Nội"
        mock_job.description = "Xây dựng API"
        mock_job.requirements = "Python 3 năm"
        mock_job.benefits = "Bảo hiểm, thưởng"
        with patch(
            "app.chatbot.nodes.select_job.verify_job_ownership",
            return_value=mock_job,
        ):
            result = await select_job_node(_state(job_id=42), _config())
        info = result["job_info"]
        assert info["title"] == "Backend Senior"
        assert info["level"] == "Senior"
        assert info["requirements"] == "Python 3 năm"

    @pytest.mark.asyncio
    async def test_blocks_when_job_not_found_404(self):
        with patch(
            "app.chatbot.nodes.select_job.verify_job_ownership",
            side_effect=HTTPException(status_code=404, detail="Job không tồn tại"),
        ):
            result = await select_job_node(_state(job_id=999), _config())
        assert _is_blocked(result)
        assert "tồn tại" in result["blocked_reason"] or result["blocked_reason"] != ""

    @pytest.mark.asyncio
    async def test_blocks_when_job_not_owned_403(self):
        with patch(
            "app.chatbot.nodes.select_job.verify_job_ownership",
            side_effect=HTTPException(
                status_code=403, detail="Bạn không có quyền xem job này"
            ),
        ):
            result = await select_job_node(_state(job_id=42, user_id=99), _config())
        assert _is_blocked(result)
        assert result["blocked_reason"] == "Bạn không có quyền xem job này"

    @pytest.mark.asyncio
    async def test_uses_job_id_and_user_id_from_state(self):
        captured = {}

        def _capture(job_id, user_id, db):
            captured["job_id"] = job_id
            captured["user_id"] = user_id
            return MagicMock()

        with patch("app.chatbot.nodes.select_job.verify_job_ownership", side_effect=_capture):
            await select_job_node(_state(job_id=7, user_id=3), _config())

        assert captured["job_id"] == 7
        assert captured["user_id"] == 3

    @pytest.mark.asyncio
    async def test_passes_db_from_config_to_service(self):
        mock_db = MagicMock()
        captured = {}

        def _capture(job_id, user_id, db):
            captured["db"] = db
            return MagicMock()

        with patch("app.chatbot.nodes.select_job.verify_job_ownership", side_effect=_capture):
            await select_job_node(_state(), _config(db=mock_db))

        assert captured["db"] is mock_db


# ===========================================================================
# load_applicants_node
# ===========================================================================


class TestLoadApplicantsNode:
    @pytest.mark.asyncio
    async def test_returns_applicants_list_in_state(self):
        raw = [_make_raw_applicant(1), _make_raw_applicant(2)]
        with (
            patch("app.chatbot.nodes.load_applicants.get_applicants_by_job", return_value=raw),
            patch("app.chatbot.nodes.load_applicants.extract_text_from_url", new=AsyncMock(return_value="")),
        ):
            result = await load_applicants_node(_state(), _config())
        assert "applicants" in result
        assert len(result["applicants"]) == 2

    @pytest.mark.asyncio
    async def test_each_applicant_has_cv_text_field(self):
        raw = [_make_raw_applicant(1, cv_url="http://example.com/cv1.pdf")]
        with (
            patch("app.chatbot.nodes.load_applicants.get_applicants_by_job", return_value=raw),
            patch(
                "app.chatbot.nodes.load_applicants.extract_text_from_url",
                new=AsyncMock(return_value="Kinh nghiệm Python 5 năm"),
            ),
        ):
            result = await load_applicants_node(_state(), _config())
        assert result["applicants"][0]["cv_text"] == "Kinh nghiệm Python 5 năm"

    @pytest.mark.asyncio
    async def test_cv_text_empty_when_no_cv_url(self):
        raw = [_make_raw_applicant(1, cv_url=None)]
        with (
            patch("app.chatbot.nodes.load_applicants.get_applicants_by_job", return_value=raw),
            patch("app.chatbot.nodes.load_applicants.extract_text_from_url", new=AsyncMock()) as mock_extract,
        ):
            result = await load_applicants_node(_state(), _config())
        mock_extract.assert_not_called()
        assert result["applicants"][0]["cv_text"] == ""

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_applicants(self):
        with patch("app.chatbot.nodes.load_applicants.get_applicants_by_job", return_value=[]):
            result = await load_applicants_node(_state(), _config())
        assert result == {"applicants": []}

    @pytest.mark.asyncio
    async def test_pdf_extraction_runs_in_parallel(self):
        """Verify asyncio.gather is used: all extractions complete regardless of order."""
        import asyncio

        call_count = 0

        async def slow_extract(url: str) -> str:
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0)   # yield control
            return f"text-for-{url}"

        raw = [
            _make_raw_applicant(i, cv_url=f"http://example.com/cv{i}.pdf")
            for i in range(5)
        ]
        with (
            patch("app.chatbot.nodes.load_applicants.get_applicants_by_job", return_value=raw),
            patch("app.chatbot.nodes.load_applicants.extract_text_from_url", side_effect=slow_extract),
        ):
            result = await load_applicants_node(_state(), _config())

        assert call_count == 5
        for applicant in result["applicants"]:
            assert applicant["cv_text"].startswith("text-for-")

    @pytest.mark.asyncio
    async def test_blocks_when_db_raises_403(self):
        with patch(
            "app.chatbot.nodes.load_applicants.get_applicants_by_job",
            side_effect=HTTPException(status_code=403, detail="Bạn không có quyền xem job này"),
        ):
            result = await load_applicants_node(_state(), _config())
        assert _is_blocked(result)

    @pytest.mark.asyncio
    async def test_original_applicant_fields_preserved(self):
        raw = [_make_raw_applicant(5, cv_url="http://example.com/cv.pdf")]
        with (
            patch("app.chatbot.nodes.load_applicants.get_applicants_by_job", return_value=raw),
            patch("app.chatbot.nodes.load_applicants.extract_text_from_url", new=AsyncMock(return_value="ok")),
        ):
            result = await load_applicants_node(_state(), _config())
        enriched = result["applicants"][0]
        assert enriched["user_id"] == 5
        assert enriched["email"] == "user5@example.com"
        assert enriched["skills"] == "Python, SQL"

    @pytest.mark.asyncio
    async def test_multiple_applicants_each_get_their_cv_text(self):
        raw = [
            _make_raw_applicant(1, cv_url="http://example.com/cv1.pdf"),
            _make_raw_applicant(2, cv_url="http://example.com/cv2.pdf"),
        ]

        async def mock_extract(url: str) -> str:
            return f"text:{url.split('/')[-1]}"

        with (
            patch("app.chatbot.nodes.load_applicants.get_applicants_by_job", return_value=raw),
            patch("app.chatbot.nodes.load_applicants.extract_text_from_url", side_effect=mock_extract),
        ):
            result = await load_applicants_node(_state(), _config())

        texts = {a["user_id"]: a["cv_text"] for a in result["applicants"]}
        assert texts[1] == "text:cv1.pdf"
        assert texts[2] == "text:cv2.pdf"
