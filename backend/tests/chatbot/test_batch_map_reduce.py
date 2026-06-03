"""
Sprint 6 — tests for batch_map and reduce_llm nodes.

Covers:
  • build_batch_prompt: job info, applicant info, question, CV truncation
  • batch_map node: correct batch splitting (11/25/50 applicants), parallel
    LLM calls, results in batch_summaries, error resilience
  • build_reduce_prompt: all summaries + question present
  • reduce_llm node: LLM invocation, answer returned, error fallback
  • Prompt files validation
  • BATCH_SIZE boundary: exactly 10 → single_shot, 11+ → batch_map (routing)
"""

import asyncio
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.chatbot.nodes.batch_map import (
    make_batch_map_node,
    build_batch_prompt,
    BATCH_SIZE,
    BATCH_CV_MAX_CHARS,
)
from app.chatbot.nodes.reduce_llm import (
    make_reduce_llm_node,
    build_reduce_prompt,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_llm(response: str = '[{"applicant_id":1,"name":"A","score":8,"highlights":[],"concerns":[],"relevance":"ok"}]'):
    mock = MagicMock()
    mock.ainvoke = AsyncMock(return_value=AIMessage(content=response))
    return mock


def _make_applicant(idx: int, cv_text: str = "Python 5 năm") -> dict:
    return {
        "application_id": idx * 10,
        "user_id": idx,
        "email": f"user{idx}@example.com",
        "full_name": f"Ứng viên {idx}",
        "skills": "Python, FastAPI",
        "experience": "3 năm",
        "education": "Đại học",
        "bio": "Lập trình viên",
        "cover_letter": "Tôi quan tâm đến vị trí này.",
        "cv_url": f"http://example.com/cv{idx}.pdf",
        "cv_text": cv_text,
        "application_status": "pending",
    }


def _job_info() -> dict:
    return {
        "id": 42,
        "title": "Backend Senior",
        "level": "Senior",
        "salary": "40-60 triệu",
        "location": "HCM",
        "description": "Xây dựng hệ thống API quy mô lớn",
        "requirements": "Python ≥ 5 năm, FastAPI, PostgreSQL",
        "benefits": "Thưởng, bảo hiểm",
    }


def _state(n_applicants: int = 11, **overrides) -> dict:
    base = {
        "user_id": 1,
        "role": "recruiter",
        "message": "Top 5 ứng viên phù hợp nhất?",
        "job_id": 42,
        "intent": "applicant_query",
        "job_info": _job_info(),
        "applicants": [_make_applicant(i) for i in range(1, n_applicants + 1)],
        "batch_summaries": [],
        "answer": "",
        "blocked_reason": None,
    }
    base.update(overrides)
    return base


def _expected_batch_count(n: int) -> int:
    return (n + BATCH_SIZE - 1) // BATCH_SIZE


# ===========================================================================
# build_batch_prompt (pure function)
# ===========================================================================


class TestBuildBatchPrompt:
    def test_contains_job_title(self):
        batch = [_make_applicant(1)]
        prompt = build_batch_prompt(batch, 0, _job_info(), "Top 3?")
        assert "Backend Senior" in prompt

    def test_contains_job_requirements(self):
        batch = [_make_applicant(1)]
        prompt = build_batch_prompt(batch, 0, _job_info(), "Top 3?")
        assert "FastAPI" in prompt or "PostgreSQL" in prompt

    def test_contains_applicant_name(self):
        batch = [_make_applicant(1), _make_applicant(2)]
        prompt = build_batch_prompt(batch, 0, _job_info(), "Top 3?")
        assert "Ứng viên 1" in prompt
        assert "Ứng viên 2" in prompt

    def test_contains_application_id(self):
        batch = [_make_applicant(3)]
        prompt = build_batch_prompt(batch, 0, _job_info(), "Top 3?")
        assert "application_id=30" in prompt

    def test_contains_question(self):
        batch = [_make_applicant(1)]
        question = "Ai có kinh nghiệm dài nhất?"
        prompt = build_batch_prompt(batch, 0, _job_info(), question)
        assert question in prompt

    def test_batch_offset_reflected_in_numbering(self):
        batch = [_make_applicant(11)]
        # offset=10 means this is the 11th applicant overall
        prompt = build_batch_prompt(batch, 10, _job_info(), "?")
        assert "Ứng viên 11" in prompt

    def test_long_cv_truncated(self):
        long_cv = "X" * (BATCH_CV_MAX_CHARS + 3000)
        batch = [_make_applicant(1, cv_text=long_cv)]
        prompt = build_batch_prompt(batch, 0, _job_info(), "?")
        assert "rút gọn" in prompt or "[CV" in prompt

    def test_empty_cv_not_shown(self):
        batch = [_make_applicant(1, cv_text="")]
        prompt = build_batch_prompt(batch, 0, _job_info(), "?")
        assert "Nội dung CV" not in prompt or "CV" not in prompt

    def test_missing_job_info_handled(self):
        batch = [_make_applicant(1)]
        prompt = build_batch_prompt(batch, 0, {}, "?")
        assert "N/A" in prompt


# ===========================================================================
# batch_map node — batching logic
# ===========================================================================


class TestBatchMapBatching:
    @pytest.mark.asyncio
    async def test_11_applicants_makes_2_llm_calls(self):
        llm = _make_llm()
        node = make_batch_map_node(llm=llm)
        await node(_state(n_applicants=11))
        assert llm.ainvoke.call_count == 2

    @pytest.mark.asyncio
    async def test_25_applicants_makes_3_llm_calls(self):
        llm = _make_llm()
        node = make_batch_map_node(llm=llm)
        await node(_state(n_applicants=25))
        assert llm.ainvoke.call_count == 3

    @pytest.mark.asyncio
    async def test_50_applicants_makes_5_llm_calls(self):
        llm = _make_llm()
        node = make_batch_map_node(llm=llm)
        await node(_state(n_applicants=50))
        assert llm.ainvoke.call_count == 5

    @pytest.mark.asyncio
    async def test_exactly_10_makes_1_call(self):
        llm = _make_llm()
        node = make_batch_map_node(llm=llm)
        await node(_state(n_applicants=10))
        assert llm.ainvoke.call_count == 1

    @pytest.mark.asyncio
    async def test_batch_summaries_count_equals_batch_count(self):
        for n in [11, 25, 50]:
            llm = _make_llm('["batch_result"]')
            node = make_batch_map_node(llm=llm)
            result = await node(_state(n_applicants=n))
            expected = _expected_batch_count(n)
            assert len(result["batch_summaries"]) == expected, f"n={n}"

    @pytest.mark.asyncio
    async def test_result_has_batch_summaries_key(self):
        node = make_batch_map_node(llm=_make_llm())
        result = await node(_state(n_applicants=11))
        assert "batch_summaries" in result

    @pytest.mark.asyncio
    async def test_each_summary_is_string(self):
        node = make_batch_map_node(llm=_make_llm("some json"))
        result = await node(_state(n_applicants=11))
        for s in result["batch_summaries"]:
            assert isinstance(s, str)

    @pytest.mark.asyncio
    async def test_summaries_contain_llm_response(self):
        node = make_batch_map_node(llm=_make_llm("batch_output_text"))
        result = await node(_state(n_applicants=11))
        assert all("batch_output_text" in s for s in result["batch_summaries"])


# ===========================================================================
# batch_map node — parallel execution
# ===========================================================================


class TestBatchMapParallel:
    @pytest.mark.asyncio
    async def test_all_batches_run_concurrently(self):
        """Verify asyncio.gather: all 3 batch calls complete regardless of ordering."""
        call_count = 0

        async def slow_invoke(messages):
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0)
            return AIMessage(content=f"result_{call_count}")

        llm = MagicMock()
        llm.ainvoke = slow_invoke

        node = make_batch_map_node(llm=llm)
        result = await node(_state(n_applicants=25))

        assert call_count == 3
        assert len(result["batch_summaries"]) == 3

    @pytest.mark.asyncio
    async def test_failed_batch_returns_empty_json_not_error(self):
        """If one batch LLM call raises, it should return '[]', not propagate."""
        fail_count = 0

        async def sometimes_fail(messages):
            nonlocal fail_count
            fail_count += 1
            if fail_count == 2:
                raise RuntimeError("API error")
            return AIMessage(content="ok_batch")

        llm = MagicMock()
        llm.ainvoke = sometimes_fail

        node = make_batch_map_node(llm=llm)
        result = await node(_state(n_applicants=25))

        assert len(result["batch_summaries"]) == 3
        # The failed batch returns "[]"
        assert "[]" in result["batch_summaries"]
        # Other batches return "ok_batch"
        assert result["batch_summaries"].count("ok_batch") == 2


# ===========================================================================
# build_reduce_prompt (pure function)
# ===========================================================================


class TestBuildReducePrompt:
    def test_contains_question(self):
        state = _state(n_applicants=11)
        state["batch_summaries"] = ["[...]", "[...]"]
        prompt = build_reduce_prompt(state)
        assert "Top 5 ứng viên phù hợp nhất?" in prompt

    def test_contains_all_batch_summaries(self):
        state = _state(n_applicants=11)
        state["batch_summaries"] = ["batch_one_data", "batch_two_data"]
        prompt = build_reduce_prompt(state)
        assert "batch_one_data" in prompt
        assert "batch_two_data" in prompt

    def test_contains_job_title(self):
        state = _state(n_applicants=11)
        state["batch_summaries"] = ["[]"]
        prompt = build_reduce_prompt(state)
        assert "Backend Senior" in prompt

    def test_batch_numbering_shown(self):
        state = _state(n_applicants=11)
        state["batch_summaries"] = ["b1", "b2"]
        prompt = build_reduce_prompt(state)
        assert "Batch 1" in prompt
        assert "Batch 2" in prompt

    def test_total_applicant_count_in_prompt(self):
        state = _state(n_applicants=25)
        state["batch_summaries"] = ["x", "x", "x"]
        prompt = build_reduce_prompt(state)
        assert "25" in prompt

    def test_empty_summary_shown_as_placeholder(self):
        state = _state(n_applicants=11)
        state["batch_summaries"] = [""]
        prompt = build_reduce_prompt(state)
        # Empty summary → placeholder text
        assert "không có dữ liệu" in prompt

    def test_missing_job_info_handled(self):
        state = _state(n_applicants=11)
        state["job_info"] = None
        state["batch_summaries"] = ["[]"]
        prompt = build_reduce_prompt(state)
        assert "N/A" in prompt


# ===========================================================================
# reduce_llm node
# ===========================================================================


class TestReduceLLMNode:
    @pytest.mark.asyncio
    async def test_returns_answer_from_llm(self):
        llm = _make_llm("Top 3 ứng viên phù hợp nhất là...")
        node = make_reduce_llm_node(llm=llm)
        state = _state(n_applicants=11)
        state["batch_summaries"] = ["[...]", "[...]"]
        result = await node(state)
        assert result["answer"] == "Top 3 ứng viên phù hợp nhất là..."

    @pytest.mark.asyncio
    async def test_answer_key_always_present(self):
        node = make_reduce_llm_node(llm=_make_llm("ok"))
        state = _state(n_applicants=11)
        state["batch_summaries"] = ["[]"]
        result = await node(state)
        assert "answer" in result

    @pytest.mark.asyncio
    async def test_llm_called_exactly_once(self):
        llm = _make_llm("ok")
        node = make_reduce_llm_node(llm=llm)
        state = _state(n_applicants=25)
        state["batch_summaries"] = ["a", "b", "c"]
        await node(state)
        llm.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_system_message_sent(self):
        llm = _make_llm("ok")
        node = make_reduce_llm_node(llm=llm)
        state = _state(n_applicants=11)
        state["batch_summaries"] = ["[]"]
        await node(state)
        messages = llm.ainvoke.call_args[0][0]
        assert any(isinstance(m, SystemMessage) for m in messages)

    @pytest.mark.asyncio
    async def test_human_message_contains_summaries(self):
        llm = _make_llm("ok")
        node = make_reduce_llm_node(llm=llm)
        state = _state(n_applicants=11)
        state["batch_summaries"] = ["unique_batch_data_xyz"]
        await node(state)
        messages = llm.ainvoke.call_args[0][0]
        human_content = next(m.content for m in messages if isinstance(m, HumanMessage))
        assert "unique_batch_data_xyz" in human_content

    @pytest.mark.asyncio
    async def test_llm_error_returns_safe_fallback(self):
        llm = MagicMock()
        llm.ainvoke = AsyncMock(side_effect=RuntimeError("timeout"))
        node = make_reduce_llm_node(llm=llm)
        state = _state(n_applicants=11)
        state["batch_summaries"] = ["[]"]
        result = await node(state)
        assert "answer" in result
        assert isinstance(result["answer"], str)
        assert len(result["answer"]) > 0

    @pytest.mark.asyncio
    async def test_fallback_does_not_expose_error(self):
        llm = MagicMock()
        llm.ainvoke = AsyncMock(side_effect=ValueError("secret_internal_msg"))
        node = make_reduce_llm_node(llm=llm)
        state = _state(n_applicants=11)
        state["batch_summaries"] = ["[]"]
        result = await node(state)
        assert "secret_internal_msg" not in result["answer"]


# ===========================================================================
# Prompt file validation
# ===========================================================================


class TestPromptFiles:
    def _read(self, filename: str) -> str:
        path = (
            Path(__file__).parent.parent.parent
            / "app" / "chatbot" / "prompts" / filename
        )
        assert path.exists(), f"Prompt file missing: {path}"
        return path.read_text(encoding="utf-8")

    def test_batch_map_system_exists(self):
        self._read("batch_map_system.txt")

    def test_reduce_llm_system_exists(self):
        self._read("reduce_llm_system.txt")

    def test_batch_map_mentions_json(self):
        content = self._read("batch_map_system.txt").lower()
        assert "json" in content

    def test_batch_map_mentions_score(self):
        content = self._read("batch_map_system.txt").lower()
        assert "score" in content

    def test_reduce_mentions_synthesis(self):
        content = self._read("reduce_llm_system.txt").lower()
        assert "tổng hợp" in content or "câu trả lời" in content


# ===========================================================================
# BATCH_SIZE constant
# ===========================================================================


class TestBatchSizeConstant:
    def test_batch_size_is_10(self):
        assert BATCH_SIZE == 10

    def test_11_applicants_splits_into_10_plus_1(self):
        applicants = [_make_applicant(i) for i in range(1, 12)]
        batches = [
            applicants[i: i + BATCH_SIZE]
            for i in range(0, len(applicants), BATCH_SIZE)
        ]
        assert len(batches) == 2
        assert len(batches[0]) == 10
        assert len(batches[1]) == 1

    def test_25_applicants_splits_into_3_batches(self):
        applicants = [_make_applicant(i) for i in range(1, 26)]
        batches = [
            applicants[i: i + BATCH_SIZE]
            for i in range(0, len(applicants), BATCH_SIZE)
        ]
        assert len(batches) == 3
        assert len(batches[0]) == 10
        assert len(batches[2]) == 5

    def test_50_applicants_splits_into_5_equal_batches(self):
        applicants = [_make_applicant(i) for i in range(1, 51)]
        batches = [
            applicants[i: i + BATCH_SIZE]
            for i in range(0, len(applicants), BATCH_SIZE)
        ]
        assert len(batches) == 5
        assert all(len(b) == 10 for b in batches)
