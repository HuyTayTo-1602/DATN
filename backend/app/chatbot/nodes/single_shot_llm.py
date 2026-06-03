"""
single_shot_llm node — Sprint 5.

Used when len(applicants) <= 10.  Builds a single rich prompt with:
  • Job metadata (title, requirements, …)  ← from state["job_info"]
  • All applicant profiles + extracted CV text  ← from state["applicants"]
  • The recruiter's question  ← from state["message"]

CV text is truncated to CV_MAX_CHARS characters (~2 000 tokens) to avoid
overflowing the context window when a single CV is very long.

Usage:
    Production : single_shot_llm_node  (uses real Claude client)
    Tests      : make_single_shot_node(llm=mock)
"""

from pathlib import Path
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.chatbot.schemas import ChatState

_SYSTEM_PROMPT_PATH = (
    Path(__file__).parent.parent / "prompts" / "single_shot_system.txt"
)

# ~2 000 tokens  (rough: 1 token ≈ 4 chars for mixed Vietnamese/English text)
CV_MAX_CHARS: int = 8_000

_SAFE_ERROR_ANSWER = (
    "Xin lỗi, đã xảy ra lỗi khi phân tích hồ sơ ứng viên. Vui lòng thử lại."
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def truncate_cv(text: str, max_chars: int = CV_MAX_CHARS) -> str:
    """Return text as-is if within limit; otherwise truncate with a notice."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n...[CV bị rút gọn do quá dài]"


def build_human_prompt(state: ChatState) -> str:
    """
    Assemble the human-turn message that includes job info, all applicant
    profiles, and the recruiter's question.
    Exported so tests can inspect prompt content without a real LLM.
    """
    job_info: dict = state.get("job_info") or {}
    applicants: list[dict] = state.get("applicants") or []
    question: str = state.get("message") or ""

    lines: list[str] = []

    # ── Job information ────────────────────────────────────────────────────
    lines.append("=== THÔNG TIN VỊ TRÍ TUYỂN DỤNG ===")
    lines.append(f"Chức danh : {job_info.get('title') or 'N/A'}")
    if job_info.get("level"):
        lines.append(f"Cấp bậc   : {job_info['level']}")
    if job_info.get("salary"):
        lines.append(f"Mức lương  : {job_info['salary']}")
    if job_info.get("location"):
        lines.append(f"Địa điểm  : {job_info['location']}")
    if job_info.get("requirements"):
        lines.append(f"Yêu cầu   :\n{job_info['requirements']}")
    if job_info.get("description"):
        lines.append(f"Mô tả     :\n{job_info['description']}")
    if job_info.get("benefits"):
        lines.append(f"Phúc lợi  : {job_info['benefits']}")

    # ── Applicant list ─────────────────────────────────────────────────────
    lines.append(f"\n=== DANH SÁCH ỨNG VIÊN ({len(applicants)} người) ===")

    for idx, ap in enumerate(applicants, 1):
        lines.append(
            f"\n--- Ứng viên {idx}: {ap.get('full_name') or 'Không rõ'} ---"
        )
        if ap.get("email"):
            lines.append(f"Email       : {ap['email']}")
        if ap.get("skills"):
            lines.append(f"Kỹ năng     : {ap['skills']}")
        if ap.get("experience"):
            lines.append(f"Kinh nghiệm : {ap['experience']}")
        if ap.get("education"):
            lines.append(f"Học vấn     : {ap['education']}")
        if ap.get("bio"):
            lines.append(f"Giới thiệu  : {ap['bio']}")
        if ap.get("cover_letter"):
            lines.append(f"Thư xin việc: {ap['cover_letter']}")
        cv_text = truncate_cv(ap.get("cv_text") or "")
        if cv_text:
            lines.append(f"Nội dung CV :\n{cv_text}")

    # ── Question ───────────────────────────────────────────────────────────
    lines.append("\n=== CÂU HỎI CỦA NHÀ TUYỂN DỤNG ===")
    lines.append(question)
    lines.append("\nHãy trả lời câu hỏi dựa trên thông tin ứng viên ở trên.")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Node factory
# ---------------------------------------------------------------------------


def make_single_shot_node(llm: Any = None):
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
            HumanMessage(content=build_human_prompt(state)),
        ]
        try:
            response = await _llm.ainvoke(messages)
            return {"answer": response.content}
        except Exception:
            return {"answer": _SAFE_ERROR_ANSWER}

    return _node


# Module-level singleton for the production graph.
single_shot_llm_node = make_single_shot_node()
