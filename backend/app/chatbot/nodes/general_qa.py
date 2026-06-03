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
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.chatbot.schemas import ChatState

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT_PATH = (
    Path(__file__).parent.parent / "prompts" / "general_qa_system.txt"
)

_SAFE_ERROR_ANSWER = (
    "Xin lỗi, hiện tại tôi không thể xử lý yêu cầu của bạn. Vui lòng thử lại sau."
)


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

        messages = [
            SystemMessage(content=system_prompt),
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
