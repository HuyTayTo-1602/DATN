"""
General Q&A node — Sprint 3.

Handles recruitment-domain questions for both recruiter and job_seeker.
Off-domain questions are refused by the LLM (guided by system prompt).

Usage:
    Production: `general_qa_node` (uses real Claude client)
    Testing:    `make_general_qa_node(llm=mock)` to inject a stub LLM
"""

import logging
from pathlib import Path
from typing import Any, Optional

from langchain_core.messages import HumanMessage, SystemMessage

from app.chatbot.schemas import ChatState

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT_PATH = (
    Path(__file__).parent.parent / "prompts" / "general_qa_system.txt"
)

_SAFE_ERROR_ANSWER = (
    "Xin lỗi, hiện tại tôi không thể xử lý yêu cầu của bạn. Vui lòng thử lại sau."
)


def _build_candidate_context(
    profile: Optional[dict],
    cv_text: Optional[str],
    cv_note: Optional[str] = None,
) -> str:
    """Build a context block to append to the system prompt for job_seekers."""
    if not profile and not cv_text and not cv_note:
        return ""

    lines = ["---", "THÔNG TIN CÁ NHÂN CỦA ỨNG VIÊN ĐANG CHAT:"]

    if profile:
        fields = [
            ("Họ tên", profile.get("full_name")),
            ("Email", profile.get("email")),
            ("Số điện thoại", profile.get("phone")),
            ("Địa chỉ", profile.get("address")),
            ("Ngày sinh", profile.get("dob")),
            ("Kỹ năng", profile.get("skills")),
            ("Kinh nghiệm", profile.get("experience")),
            ("Học vấn", profile.get("education")),
            ("Giới thiệu bản thân", profile.get("bio")),
        ]
        for label, value in fields:
            if value:
                lines.append(f"- {label}: {value}")

    lines.append("")
    if cv_text:
        lines.append("NỘI DUNG CV CHÍNH CỦA ỨNG VIÊN:")
        lines.append(cv_text)
    elif cv_note:
        lines.append(f"CV của ứng viên: {cv_note}")
    else:
        lines.append("CV của ứng viên: Chưa có thông tin CV.")

    lines += [
        "---",
        "Hãy sử dụng thông tin trên để cá nhân hóa câu trả lời khi phù hợp "
        "(ví dụ: tư vấn dựa trên kỹ năng, kinh nghiệm thực tế của họ). "
        "Khi người dùng hỏi về CV của họ, hãy trả lời dựa trên nội dung CV được cung cấp ở trên. "
        "Không tiết lộ toàn bộ thông tin cá nhân trừ khi người dùng yêu cầu.",
    ]

    return "\n".join(lines)


def make_general_qa_node(llm: Any = None):
    """
    Factory that returns a LangGraph-compatible async node.

    llm: a LangChain chat model instance.  When None, the real Claude
         client is created lazily from application settings on first call
         (avoids import-time API-key validation in tests).
    """
    _llm: Any = llm  # may stay None until first invocation
    system_prompt: str = _SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")

    async def _node(state: ChatState) -> dict:
        nonlocal _llm
        if _llm is None:
            from app.chatbot.services.llm_factory import build_llm
            _llm = build_llm()

        full_system = system_prompt
        candidate_context = _build_candidate_context(
            state.get("candidate_profile"),
            state.get("candidate_cv_text"),
            state.get("candidate_cv_note"),
        )
        if candidate_context:
            full_system = full_system + "\n\n" + candidate_context

        messages = [
            SystemMessage(content=full_system),
            HumanMessage(content=state.get("message", "")),
        ]
        try:
            response = await _llm.ainvoke(messages)
            return {"answer": response.content}
        except Exception as exc:
            logger.exception("general_qa_node LLM call failed: %s", exc)
            return {"answer": _SAFE_ERROR_ANSWER}

    return _node


# Module-level singleton used by the production graph.
general_qa_node = make_general_qa_node()
