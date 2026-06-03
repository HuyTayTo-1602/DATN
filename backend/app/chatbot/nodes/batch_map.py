"""
batch_map node — Sprint 6.

Handles the MAP phase of map-reduce when len(applicants) > 10.

Algorithm:
  1. Split applicants into batches of BATCH_SIZE (10).
  2. For each batch, call LLM with a structured prompt → JSON evaluation.
  3. Run all batch calls in parallel (asyncio.gather).
  4. Store results in state["batch_summaries"] for reduce_llm.

Each batch LLM call should return a JSON array:
  [{applicant_id, name, score, highlights, concerns, relevance}]

If a batch call fails, an empty JSON array "[]" is stored so reduce_llm
can still produce a partial answer.

Usage:
    Production : batch_map_node   (uses real Claude client)
    Tests      : make_batch_map_node(llm=mock)
"""

import asyncio
from pathlib import Path
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.chatbot.schemas import ChatState
from app.chatbot.nodes.single_shot_llm import truncate_cv

BATCH_SIZE: int = 10
# Smaller per-CV limit than single_shot (4 000 chars) because a batch has up to 10 CVs.
BATCH_CV_MAX_CHARS: int = 4_000

_SYSTEM_PROMPT_PATH = (
    Path(__file__).parent.parent / "prompts" / "batch_map_system.txt"
)


# ---------------------------------------------------------------------------
# Prompt builder (exported for testing)
# ---------------------------------------------------------------------------


def build_batch_prompt(
    batch: list[dict],
    batch_offset: int,
    job_info: dict,
    question: str,
) -> str:
    """
    Build the human-turn message for one batch.

    batch_offset: absolute index of the first applicant in this batch
                  (used for readable numbering: batch 2 → Ứng viên 11..20).
    """
    lines: list[str] = []

    lines.append("=== VỊ TRÍ TUYỂN DỤNG ===")
    lines.append(f"Chức danh: {job_info.get('title') or 'N/A'}")
    if job_info.get("requirements"):
        lines.append(f"Yêu cầu  : {job_info['requirements']}")
    if job_info.get("level"):
        lines.append(f"Cấp bậc  : {job_info['level']}")

    lines.append(f"\n=== CÂU HỎI ===\n{question}\n")

    lines.append(f"=== DANH SÁCH ỨNG VIÊN TRONG BATCH NÀY ({len(batch)} người) ===")

    for local_idx, ap in enumerate(batch):
        global_num = batch_offset + local_idx + 1
        app_id = ap.get("application_id") or ap.get("user_id") or local_idx
        lines.append(
            f"\n--- Ứng viên {global_num} (application_id={app_id}) ---"
        )
        lines.append(f"Tên        : {ap.get('full_name') or 'Không rõ'}")
        if ap.get("skills"):
            lines.append(f"Kỹ năng    : {ap['skills']}")
        if ap.get("experience"):
            lines.append(f"Kinh nghiệm: {ap['experience']}")
        if ap.get("education"):
            lines.append(f"Học vấn    : {ap['education']}")
        if ap.get("bio"):
            lines.append(f"Giới thiệu : {ap['bio']}")
        cv_text = truncate_cv(ap.get("cv_text") or "", max_chars=BATCH_CV_MAX_CHARS)
        if cv_text:
            lines.append(f"CV         :\n{cv_text}")

    lines.append(
        "\nHãy đánh giá từng ứng viên trên và trả về JSON array theo định dạng đã mô tả."
    )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Node factory
# ---------------------------------------------------------------------------


def make_batch_map_node(llm: Any = None):
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

        applicants: list[dict] = state.get("applicants") or []
        job_info: dict = state.get("job_info") or {}
        question: str = state.get("message") or ""

        batches = [
            applicants[i : i + BATCH_SIZE]
            for i in range(0, len(applicants), BATCH_SIZE)
        ]

        async def _process_one(batch: list[dict], offset: int) -> str:
            human_prompt = build_batch_prompt(batch, offset, job_info, question)
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt),
            ]
            try:
                response = await _llm.ainvoke(messages)
                return response.content
            except Exception:
                return "[]"

        summaries = await asyncio.gather(
            *[_process_one(batch, i * BATCH_SIZE) for i, batch in enumerate(batches)]
        )
        return {"batch_summaries": list(summaries)}

    return _node


# Module-level singleton for the production graph.
batch_map_node = make_batch_map_node()
