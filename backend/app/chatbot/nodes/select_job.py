"""
select_job node — Sprint 4 (updated Sprint 5: also returns job_info).

Validates that the recruiter owns the job_id stored in state.
On success, stores job metadata in state["job_info"] so downstream nodes
(single_shot_llm, batch_map) can build rich prompts without re-querying the DB.

DB session is injected via LangGraph RunnableConfig (configurable["db"]).

Possible outcomes:
  • job_id missing in state          → blocked_reason
  • job not found (404)              → blocked_reason
  • job not owned by recruiter (403) → blocked_reason
  • job verified ok                  → {"job_info": {...}}
"""

from fastapi import HTTPException
from langchain_core.runnables import RunnableConfig

from app.chatbot.schemas import ChatState
from app.chatbot.services.applicant_service import verify_job_ownership

_NO_JOB_MSG = (
    "Vui lòng chỉ định job_id để tôi có thể phân tích ứng viên của bạn."
)


async def select_job_node(state: ChatState, config: RunnableConfig) -> dict:
    """
    Ownership gate before loading applicants.
    Returns job_info on success so the LLM nodes have full job context.
    """
    job_id = state.get("job_id")
    if job_id is None:
        return {"blocked_reason": _NO_JOB_MSG}

    db = config["configurable"]["db"]
    user_id = state.get("user_id")

    try:
        job = verify_job_ownership(job_id, user_id, db)
    except HTTPException as exc:
        return {"blocked_reason": exc.detail}

    return {
        "job_info": {
            "id": job.id,
            "title": job.title or "",
            "level": job.level or "",
            "salary": job.salary or "",
            "location": job.location or "",
            "description": job.description or "",
            "requirements": job.requirements or "",
            "benefits": job.benefits or "",
        }
    }
