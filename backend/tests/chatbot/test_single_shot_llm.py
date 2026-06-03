"""
Sprint 5 — tests for single_shot_llm node.

Covers:
  • Basic LLM invocation (mocked)
  • CV truncation logic (truncate_cv helper)
  • Prompt content: job info, applicant profiles, question all present
  • Edge cases: 0 / 1 / 5 / 10 applicants, missing job_info
  • Error handling: LLM exception → safe fallback
  • System prompt file validation
  • Size routing helper in graph (_route_after_load_applicants)
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from pathlib import Path

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.chatbot.nodes.single_shot_llm import (
    make_single_shot_node,
    truncate_cv,
    build_human_prompt,
    CV_MAX_CHARS,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_llm(response_text: str = "Đây là câu trả lời mẫu."):
    mock = MagicMock()
    mock.ainvoke = AsyncMock(return_value=AIMessage(content=response_text))
    return mock


def _make_applicant(
    idx: int = 1,
    cv_text: str = "5 năm Python, Django, FastAPI",
) -> dict:
    return {
        "application_id": idx * 10,
        "user_id": idx,
        "email": f"user{idx}@example.com",
        "full_name": f"Nguyễn Văn {idx}",
        "skills": "Python, SQL",
        "experience": "3 năm",
        "education": "Đại học Bách Khoa",
        "bio": "Lập trình viên backend",
        "cover_letter": "Tôi rất hứng thú với vị trí này.",
        "cv_url": f"http://example.com/cv{idx}.pdf",
        "cv_text": cv_text,
        "application_status": "pending",
    }


def _job_info(title: str = "Backend Senior") -> dict:
    return {
        "id": 42,
        "title": title,
        "level": "Senior",
        "salary": "30-50 triệu",
        "location": "Hà Nội",
        "description": "Xây dựng hệ thống API",
        "requirements": "Python ≥ 3 năm, FastAPI",
        "benefits": "Thưởng, bảo hiểm",
    }


def _state(**overrides) -> dict:
    base = {
        "user_id": 1,
        "role": "recruiter",
        "message": "Top 3 ứng viên phù hợp nhất?",
        "job_id": 42,
        "intent": "applicant_query",
        "job_info": _job_info(),
        "applicants": [_make_applicant(i) for i in range(1, 4)],
        "batch_summaries": [],
        "answer": "",
        "blocked_reason": None,
    }
    base.update(overrides)
    return base


# ===========================================================================
# truncate_cv — pure utility
# ===========================================================================


class TestTruncateCV:
    def test_short_text_returned_unchanged(self):
        text = "Kinh nghiệm Python 5 năm."
        assert truncate_cv(text) == text

    def test_text_at_exact_limit_returned_unchanged(self):
        text = "x" * CV_MAX_CHARS
        assert truncate_cv(text) == text

    def test_long_text_is_truncated(self):
        text = "y" * (CV_MAX_CHARS + 1000)
        result = truncate_cv(text)
        assert len(result) < len(text)

    def test_truncated_text_starts_with_original_content(self):
        text = "A" * (CV_MAX_CHARS + 500)
        result = truncate_cv(text)
        assert result.startswith("A" * CV_MAX_CHARS)

    def test_truncated_text_contains_notice(self):
        text = "B" * (CV_MAX_CHARS + 1)
        result = truncate_cv(text)
        assert "rút gọn" in result or "[CV" in result

    def test_empty_string_returned_unchanged(self):
        assert truncate_cv("") == ""

    def test_custom_max_chars_respected(self):
        text = "Z" * 200
        result = truncate_cv(text, max_chars=100)
        assert result.startswith("Z" * 100)
        assert len(result) < 200


# ===========================================================================
# build_human_prompt — pure function
# ===========================================================================


class TestBuildHumanPrompt:
    def test_contains_job_title(self):
        prompt = build_human_prompt(_state())
        assert "Backend Senior" in prompt

    def test_contains_job_requirements(self):
        prompt = build_human_prompt(_state())
        assert "FastAPI" in prompt

    def test_contains_applicant_names(self):
        prompt = build_human_prompt(_state())
        assert "Nguyễn Văn 1" in prompt
        assert "Nguyễn Văn 2" in prompt
        assert "Nguyễn Văn 3" in prompt

    def test_contains_question(self):
        question = "Ai có kinh nghiệm Python nhiều nhất?"
        prompt = build_human_prompt(_state(message=question))
        assert question in prompt

    def test_contains_cv_text(self):
        ap = _make_applicant(1, cv_text="Chuyên gia Docker và Kubernetes")
        prompt = build_human_prompt(_state(applicants=[ap]))
        assert "Chuyên gia Docker và Kubernetes" in prompt

    def test_long_cv_truncated_in_prompt(self):
        long_cv = "X" * (CV_MAX_CHARS + 5000)
        ap = _make_applicant(1, cv_text=long_cv)
        prompt = build_human_prompt(_state(applicants=[ap]))
        # Truncated: original long_cv should not fully appear
        assert "rút gọn" in prompt or "[CV" in prompt

    def test_empty_job_info_handled_gracefully(self):
        prompt = build_human_prompt(_state(job_info=None))
        assert "N/A" in prompt   # title defaults to N/A

    def test_missing_cv_text_does_not_crash(self):
        ap = _make_applicant(1)
        ap.pop("cv_text")
        prompt = build_human_prompt(_state(applicants=[ap]))
        assert "Nguyễn Văn 1" in prompt

    def test_empty_cv_text_not_included(self):
        ap = _make_applicant(1, cv_text="")
        prompt = build_human_prompt(_state(applicants=[ap]))
        # "Nội dung CV" section should not appear for empty cv_text
        assert "Nội dung CV" not in prompt

    def test_applicant_count_shows_in_header(self):
        applicants = [_make_applicant(i) for i in range(1, 6)]
        prompt = build_human_prompt(_state(applicants=applicants))
        assert "5 người" in prompt

    def test_zero_applicants_handled(self):
        prompt = build_human_prompt(_state(applicants=[]))
        assert "0 người" in prompt


# ===========================================================================
# single_shot_llm_node — basic invocation
# ===========================================================================


class TestSingleShotNodeBasic:
    @pytest.mark.asyncio
    async def test_returns_llm_answer(self):
        llm = _make_llm("Ứng viên số 1 phù hợp nhất.")
        node = make_single_shot_node(llm=llm)
        result = await node(_state())
        assert result["answer"] == "Ứng viên số 1 phù hợp nhất."

    @pytest.mark.asyncio
    async def test_answer_key_always_present(self):
        node = make_single_shot_node(llm=_make_llm("ok"))
        result = await node(_state())
        assert "answer" in result

    @pytest.mark.asyncio
    async def test_no_blocked_reason_in_result(self):
        node = make_single_shot_node(llm=_make_llm("ok"))
        result = await node(_state())
        assert result.get("blocked_reason") is None

    @pytest.mark.asyncio
    async def test_llm_called_exactly_once(self):
        llm = _make_llm("ok")
        node = make_single_shot_node(llm=llm)
        await node(_state())
        llm.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_system_message_sent_to_llm(self):
        llm = _make_llm("ok")
        node = make_single_shot_node(llm=llm)
        await node(_state())
        messages = llm.ainvoke.call_args[0][0]
        assert any(isinstance(m, SystemMessage) for m in messages)

    @pytest.mark.asyncio
    async def test_human_message_sent_to_llm(self):
        llm = _make_llm("ok")
        node = make_single_shot_node(llm=llm)
        await node(_state())
        messages = llm.ainvoke.call_args[0][0]
        assert any(isinstance(m, HumanMessage) for m in messages)

    @pytest.mark.asyncio
    async def test_human_message_contains_job_title(self):
        llm = _make_llm("ok")
        node = make_single_shot_node(llm=llm)
        await node(_state(job_info=_job_info("Data Engineer")))
        messages = llm.ainvoke.call_args[0][0]
        human_content = next(m.content for m in messages if isinstance(m, HumanMessage))
        assert "Data Engineer" in human_content

    @pytest.mark.asyncio
    async def test_human_message_contains_question(self):
        question = "Ai có kinh nghiệm dài nhất?"
        llm = _make_llm("ok")
        node = make_single_shot_node(llm=llm)
        await node(_state(message=question))
        messages = llm.ainvoke.call_args[0][0]
        human_content = next(m.content for m in messages if isinstance(m, HumanMessage))
        assert question in human_content


# ===========================================================================
# Applicant-count edge cases
# ===========================================================================


class TestSingleShotApplicantCounts:
    @pytest.mark.asyncio
    async def test_single_applicant(self):
        node = make_single_shot_node(llm=_make_llm("1 ứng viên phù hợp."))
        result = await node(_state(applicants=[_make_applicant(1)]))
        assert result["answer"] != ""

    @pytest.mark.asyncio
    async def test_five_applicants(self):
        applicants = [_make_applicant(i) for i in range(1, 6)]
        node = make_single_shot_node(llm=_make_llm("Top 3 ứng viên..."))
        result = await node(_state(applicants=applicants))
        # Human message should mention all 5
        messages = node.__closure__  # just check node doesn't crash
        assert result["answer"] != ""

    @pytest.mark.asyncio
    async def test_ten_applicants_max_for_single_shot(self):
        applicants = [_make_applicant(i) for i in range(1, 11)]
        node = make_single_shot_node(llm=_make_llm("Phân tích 10 ứng viên."))
        result = await node(_state(applicants=applicants))
        assert result["answer"] != ""

    @pytest.mark.asyncio
    async def test_zero_applicants_does_not_crash(self):
        node = make_single_shot_node(llm=_make_llm("Không có ứng viên nào."))
        result = await node(_state(applicants=[]))
        assert "answer" in result


# ===========================================================================
# Error handling
# ===========================================================================


class TestSingleShotErrorHandling:
    @pytest.mark.asyncio
    async def test_llm_exception_returns_safe_fallback(self):
        llm = MagicMock()
        llm.ainvoke = AsyncMock(side_effect=Exception("API timeout"))
        node = make_single_shot_node(llm=llm)
        result = await node(_state())
        assert "answer" in result
        assert isinstance(result["answer"], str)
        assert len(result["answer"]) > 0

    @pytest.mark.asyncio
    async def test_fallback_does_not_expose_error_message(self):
        llm = MagicMock()
        llm.ainvoke = AsyncMock(side_effect=RuntimeError("secret internal error"))
        node = make_single_shot_node(llm=llm)
        result = await node(_state())
        assert "secret internal error" not in result["answer"]


# ===========================================================================
# System prompt file
# ===========================================================================


class TestSystemPromptFile:
    def test_file_exists(self):
        path = (
            Path(__file__).parent.parent.parent
            / "app" / "chatbot" / "prompts" / "single_shot_system.txt"
        )
        assert path.exists(), f"System prompt missing: {path}"

    def test_file_mentions_applicant_analysis(self):
        path = (
            Path(__file__).parent.parent.parent
            / "app" / "chatbot" / "prompts" / "single_shot_system.txt"
        )
        content = path.read_text(encoding="utf-8").lower()
        assert "ứng viên" in content or "applicant" in content

    def test_file_has_refusal_instruction(self):
        path = (
            Path(__file__).parent.parent.parent
            / "app" / "chatbot" / "prompts" / "single_shot_system.txt"
        )
        content = path.read_text(encoding="utf-8")
        assert "từ chối" in content or "không liên quan" in content


# ===========================================================================
# Size routing (graph helper)
# ===========================================================================


class TestSizeRouting:
    def test_routes_to_single_shot_for_zero_applicants(self):
        from app.chatbot.graph import _route_after_load_applicants
        state = _state(applicants=[], blocked_reason=None)
        assert _route_after_load_applicants(state) == "single_shot"

    def test_routes_to_single_shot_for_one_applicant(self):
        from app.chatbot.graph import _route_after_load_applicants
        state = _state(applicants=[_make_applicant(1)], blocked_reason=None)
        assert _route_after_load_applicants(state) == "single_shot"

    def test_routes_to_single_shot_for_ten_applicants(self):
        from app.chatbot.graph import _route_after_load_applicants
        applicants = [_make_applicant(i) for i in range(1, 11)]
        state = _state(applicants=applicants, blocked_reason=None)
        assert _route_after_load_applicants(state) == "single_shot"

    def test_routes_to_batch_map_for_eleven_applicants(self):
        from app.chatbot.graph import _route_after_load_applicants
        applicants = [_make_applicant(i) for i in range(1, 12)]
        state = _state(applicants=applicants, blocked_reason=None)
        assert _route_after_load_applicants(state) == "batch_map"

    def test_routes_to_batch_map_for_fifty_applicants(self):
        from app.chatbot.graph import _route_after_load_applicants
        applicants = [_make_applicant(i) for i in range(1, 51)]
        state = _state(applicants=applicants, blocked_reason=None)
        assert _route_after_load_applicants(state) == "batch_map"

    def test_routes_to_blocked_when_blocked_reason_set(self):
        from app.chatbot.graph import _route_after_load_applicants
        state = _state(applicants=[_make_applicant(1)], blocked_reason="DB error")
        assert _route_after_load_applicants(state) == "blocked"

    def test_boundary_exactly_ten_is_single_shot(self):
        from app.chatbot.graph import _route_after_load_applicants
        applicants = [_make_applicant(i) for i in range(1, 11)]
        assert len(applicants) == 10
        state = _state(applicants=applicants, blocked_reason=None)
        assert _route_after_load_applicants(state) == "single_shot"

    def test_boundary_eleven_is_batch_map(self):
        from app.chatbot.graph import _route_after_load_applicants
        applicants = [_make_applicant(i) for i in range(1, 12)]
        assert len(applicants) == 11
        state = _state(applicants=applicants, blocked_reason=None)
        assert _route_after_load_applicants(state) == "batch_map"
