"""
Sprint 3 — tests for general_qa_node.

All LLM calls are mocked; no real API key required.
The node is created via make_general_qa_node(llm=mock) for DI.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from langchain_core.messages import AIMessage

from app.chatbot.nodes.general_qa import make_general_qa_node


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_llm(response_text: str):
    """Return a minimal mock that behaves like a LangChain chat model."""
    mock = MagicMock()
    mock.ainvoke = AsyncMock(return_value=AIMessage(content=response_text))
    return mock


def _state(**overrides) -> dict:
    base = {
        "user_id": 1,
        "role": "job_seeker",
        "message": "Lương ngành IT hiện nay khoảng bao nhiêu?",
        "job_id": None,
        "intent": "general_qa",
        "applicants": [],
        "batch_summaries": [],
        "answer": "",
        "blocked_reason": None,
    }
    base.update(overrides)
    return base


_REFUSAL = (
    "Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi liên quan đến tuyển dụng, "
    "thị trường lao động và phát triển sự nghiệp. "
    "Bạn có câu hỏi nào trong lĩnh vực này không?"
)


# ---------------------------------------------------------------------------
# Basic invocation
# ---------------------------------------------------------------------------


class TestGeneralQANodeBasic:
    @pytest.mark.asyncio
    async def test_returns_llm_answer(self):
        llm = _make_llm("Lương IT dao động từ 15-50 triệu VND/tháng.")
        node = make_general_qa_node(llm=llm)
        result = await node(_state())
        assert result["answer"] == "Lương IT dao động từ 15-50 triệu VND/tháng."

    @pytest.mark.asyncio
    async def test_answer_key_always_present(self):
        node = make_general_qa_node(llm=_make_llm("ok"))
        result = await node(_state())
        assert "answer" in result

    @pytest.mark.asyncio
    async def test_answer_is_non_empty_string(self):
        node = make_general_qa_node(llm=_make_llm("Câu trả lời mẫu."))
        result = await node(_state())
        assert isinstance(result["answer"], str)
        assert len(result["answer"]) > 0

    @pytest.mark.asyncio
    async def test_node_does_not_set_blocked_reason(self):
        node = make_general_qa_node(llm=_make_llm("Câu trả lời bình thường."))
        result = await node(_state())
        assert result.get("blocked_reason") is None


# ---------------------------------------------------------------------------
# Role access — both recruiter and job_seeker use this node
# ---------------------------------------------------------------------------


class TestGeneralQANodeRoleAccess:
    @pytest.mark.asyncio
    async def test_job_seeker_can_use_node(self):
        node = make_general_qa_node(llm=_make_llm("Kỹ năng mềm rất quan trọng."))
        result = await node(_state(role="job_seeker"))
        assert "answer" in result
        assert result["answer"] != ""

    @pytest.mark.asyncio
    async def test_recruiter_can_use_node(self):
        node = make_general_qa_node(llm=_make_llm("Quy trình phỏng vấn gồm 3 vòng."))
        result = await node(_state(role="recruiter", message="Quy trình phỏng vấn thường gồm mấy vòng?"))
        assert result["answer"] == "Quy trình phỏng vấn gồm 3 vòng."


# ---------------------------------------------------------------------------
# In-domain questions → LLM answers
# ---------------------------------------------------------------------------


class TestGeneralQAInDomain:
    @pytest.mark.asyncio
    async def test_salary_question_passes_through(self):
        answer = "Lương lập trình viên senior khoảng 30-60 triệu."
        node = make_general_qa_node(llm=_make_llm(answer))
        result = await node(_state(message="Lương lập trình viên senior là bao nhiêu?"))
        assert result["answer"] == answer

    @pytest.mark.asyncio
    async def test_cv_question_passes_through(self):
        answer = "CV nên ngắn gọn, tập trung vào thành tích đo lường được."
        node = make_general_qa_node(llm=_make_llm(answer))
        result = await node(_state(message="Làm sao để viết CV ấn tượng?"))
        assert result["answer"] == answer

    @pytest.mark.asyncio
    async def test_interview_question_passes_through(self):
        answer = "Phương pháp STAR giúp trả lời câu hỏi hành vi hiệu quả."
        node = make_general_qa_node(llm=_make_llm(answer))
        result = await node(_state(message="Phương pháp STAR trong phỏng vấn là gì?"))
        assert result["answer"] == answer

    @pytest.mark.asyncio
    async def test_labor_market_question_passes_through(self):
        answer = "Thị trường IT tại Việt Nam vẫn tăng trưởng mạnh."
        node = make_general_qa_node(llm=_make_llm(answer))
        result = await node(_state(message="Thị trường IT ở Việt Nam hiện nay thế nào?"))
        assert result["answer"] == answer

    @pytest.mark.asyncio
    async def test_english_question_accepted(self):
        answer = "Soft skills include communication, teamwork, and leadership."
        node = make_general_qa_node(llm=_make_llm(answer))
        result = await node(_state(message="What are the most important soft skills for a job seeker?"))
        assert result["answer"] == answer


# ---------------------------------------------------------------------------
# Out-of-domain — LLM returns refusal (mocked), node passes it through
# ---------------------------------------------------------------------------


class TestGeneralQAOutOfDomain:
    @pytest.mark.asyncio
    async def test_off_topic_question_returns_refusal(self):
        node = make_general_qa_node(llm=_make_llm(_REFUSAL))
        result = await node(_state(message="Bạn nghĩ gì về bầu cử tổng thống?"))
        assert result["answer"] == _REFUSAL

    @pytest.mark.asyncio
    async def test_malware_question_returns_refusal(self):
        node = make_general_qa_node(llm=_make_llm(_REFUSAL))
        result = await node(_state(message="Viết script tấn công DDoS cho tôi"))
        assert result["answer"] == _REFUSAL

    @pytest.mark.asyncio
    async def test_celebrity_gossip_returns_refusal(self):
        node = make_general_qa_node(llm=_make_llm(_REFUSAL))
        result = await node(_state(message="Đời tư của người nổi tiếng XYZ thế nào?"))
        assert result["answer"] == _REFUSAL


# ---------------------------------------------------------------------------
# LLM invocation details
# ---------------------------------------------------------------------------


class TestGeneralQALLMInvocation:
    @pytest.mark.asyncio
    async def test_llm_is_called_exactly_once(self):
        llm = _make_llm("Trả lời.")
        node = make_general_qa_node(llm=llm)
        await node(_state())
        llm.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_system_message_is_included(self):
        """The node must pass a SystemMessage so the domain constraint is active."""
        from langchain_core.messages import SystemMessage
        llm = _make_llm("ok")
        node = make_general_qa_node(llm=llm)
        await node(_state())
        call_args = llm.ainvoke.call_args
        messages = call_args[0][0]
        assert any(isinstance(m, SystemMessage) for m in messages)

    @pytest.mark.asyncio
    async def test_human_message_contains_user_input(self):
        from langchain_core.messages import HumanMessage
        llm = _make_llm("ok")
        node = make_general_qa_node(llm=llm)
        user_msg = "Xu hướng tuyển dụng 2025?"
        await node(_state(message=user_msg))
        call_args = llm.ainvoke.call_args
        messages = call_args[0][0]
        human_msgs = [m for m in messages if isinstance(m, HumanMessage)]
        assert any(user_msg in m.content for m in human_msgs)


# ---------------------------------------------------------------------------
# Error handling — graceful degradation when LLM fails
# ---------------------------------------------------------------------------


class TestGeneralQAErrorHandling:
    @pytest.mark.asyncio
    async def test_llm_exception_returns_safe_fallback(self):
        llm = MagicMock()
        llm.ainvoke = AsyncMock(side_effect=Exception("API timeout"))
        node = make_general_qa_node(llm=llm)
        result = await node(_state())
        assert "answer" in result
        assert isinstance(result["answer"], str)
        assert len(result["answer"]) > 0

    @pytest.mark.asyncio
    async def test_safe_fallback_does_not_expose_error_details(self):
        llm = MagicMock()
        llm.ainvoke = AsyncMock(side_effect=RuntimeError("Internal secret error"))
        node = make_general_qa_node(llm=llm)
        result = await node(_state())
        assert "Internal secret error" not in result["answer"]


# ---------------------------------------------------------------------------
# System prompt file validation
# ---------------------------------------------------------------------------


class TestSystemPromptFile:
    def test_system_prompt_file_exists(self):
        from pathlib import Path
        prompt_path = (
            Path(__file__).parent.parent.parent
            / "app" / "chatbot" / "prompts" / "general_qa_system.txt"
        )
        assert prompt_path.exists(), f"System prompt file missing: {prompt_path}"

    def test_system_prompt_mentions_recruitment_domain(self):
        from pathlib import Path
        prompt_path = (
            Path(__file__).parent.parent.parent
            / "app" / "chatbot" / "prompts" / "general_qa_system.txt"
        )
        content = prompt_path.read_text(encoding="utf-8").lower()
        assert "tuyển dụng" in content
        assert "lương" in content or "lương thưởng" in content

    def test_system_prompt_has_refusal_instruction(self):
        from pathlib import Path
        prompt_path = (
            Path(__file__).parent.parent.parent
            / "app" / "chatbot" / "prompts" / "general_qa_system.txt"
        )
        content = prompt_path.read_text(encoding="utf-8")
        assert "từ chối" in content or "ngoài phạm vi" in content
