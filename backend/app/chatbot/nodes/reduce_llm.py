"""
reduce_llm node — Sprint 6.

Handles the REDUCE phase of map-reduce.
Receives all batch evaluation strings from state["batch_summaries"],
assembles a synthesis prompt, and calls the LLM once to produce the
final answer to the recruiter's original question.

Usage:
    Production : reduce_llm_node   (uses real Claude client)
    Tests      : make_reduce_llm_node(llm=mock)
"""

from pathlib import Path
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.chatbot.schemas import ChatState

_SYSTEM_PROMPT_PATH = (
    Path(__file__).parent.parent / "prompts" / "reduce_llm_system.txt"
)

_SAFE_ERROR_ANSWER = (
    "Xin lỗi, đã xảy ra lỗi khi tổng hợp kết quả phân tích ứng viên. Vui lòng thử lại."
)


# ---------------------------------------------------------------------------
# Prompt builder (exported for testing)
# ---------------------------------------------------------------------------


def build_reduce_prompt(state: ChatState) -> str:
    """
    Assemble the synthesis prompt from all batch summaries.
    Exported so tests can inspect prompt content without a real LLM.
    """
    job_info: dict = state.get("job_info") or {}
    summaries: list[str] = state.get("batch_summaries") or []
    question: str = state.get("message") or ""
    total: int = len(state.get("applicants") or [])

    lines: list[str] = []

    lines.append("=== THÔNG TIN VỊ TRÍ TUYỂN DỤNG ===")
    lines.append(f"Chức danh: {job_info.get('title') or 'N/A'}")
    if job_info.get("requirements"):
        lines.append(f"Yêu cầu  : {job_info['requirements']}")

    lines.append(
        f"\n=== KẾT QUẢ ĐÁNH GIÁ TỪ {total} ỨNG VIÊN "
        f"({len(summaries)} batch) ==="
    )
    for i, summary in enumerate(summaries, 1):
        lines.append(f"\n[Batch {i} / {len(summaries)}]")
        lines.append(summary.strip() if summary.strip() else "(không có dữ liệu)")

    lines.append("\n=== CÂU HỎI GỐC CỦA NHÀ TUYỂN DỤNG ===")
    lines.append(question)
    lines.append(
        "\nDựa trên toàn bộ kết quả đánh giá trên, hãy trả lời câu hỏi "
        "một cách tổng hợp, rõ ràng và có cấu trúc."
    )

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Node factory
# ---------------------------------------------------------------------------


def make_reduce_llm_node(llm: Any = None):
    """
    Factory returning a LangGraph-compatible async node.
    Pass llm=<mock> in tests to avoid real API calls.
    """
    system_prompt: str = _SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
    _llm: Any = llm

    async def _node(state: ChatState) -> dict:
        nonlocal _llm
        if _llm is None:
            from app.chatbot.services.llm_factory import build_llm
            _llm = build_llm()

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=build_reduce_prompt(state)),
        ]
        try:
            response = await _llm.ainvoke(messages)
            return {"answer": response.content}
        except Exception:
            return {"answer": _SAFE_ERROR_ANSWER}

    return _node


# Module-level singleton for the production graph.
reduce_llm_node = make_reduce_llm_node()
