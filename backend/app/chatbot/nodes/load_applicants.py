"""
load_applicants node — Sprint 4.

Fetches all applicants for the selected job and enriches each record with
the extracted CV text (downloaded from cv_url in parallel via asyncio.gather).

The enriched list is stored in state["applicants"] for the next node
(single_shot_llm in Sprint 5 or batch_map in Sprint 6).

DB session comes from config["configurable"]["db"] (same pattern as select_job).
"""

import asyncio

from fastapi import HTTPException
from langchain_core.runnables import RunnableConfig

from app.chatbot.schemas import ChatState
from app.chatbot.services.applicant_service import get_applicants_by_job
from app.chatbot.services.pdf_service import extract_text_from_url


async def _enrich_with_cv(applicant: dict) -> dict:
    """Use DB-stored CV text when available; fall back to live PDF download."""
    if applicant.get("cv_text") is not None:
        return applicant
    cv_url = applicant.get("cv_url")
    cv_text = await extract_text_from_url(cv_url) if cv_url else ""
    return {**applicant, "cv_text": cv_text}


async def load_applicants_node(state: ChatState, config: RunnableConfig) -> dict:
    """
    1. Query DB for applicants belonging to job_id (ownership already verified
       by select_job_node, but get_applicants_by_job re-checks as defence-in-depth).
    2. Extract CV text for each applicant in parallel (asyncio.gather).
    3. Return enriched list in state["applicants"].
    """
    db = config["configurable"]["db"]
    job_id = state.get("job_id")
    user_id = state.get("user_id")

    try:
        raw_applicants: list[dict] = get_applicants_by_job(job_id, user_id, db)
    except HTTPException as exc:
        return {"blocked_reason": exc.detail}

    if not raw_applicants:
        return {"applicants": []}

    enriched = await asyncio.gather(*[_enrich_with_cv(a) for a in raw_applicants])
    return {"applicants": list(enriched)}
