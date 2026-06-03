"""
Chatbot routes — Sprint 7: adds GET /history and PII-free request logging.

Endpoints:
  POST /message      — send a message through the LangGraph pipeline
  GET  /my-jobs      — list jobs owned by the authenticated recruiter
  GET  /history      — return conversation history for a thread_id

Logging policy (no PII):
  Logged  : user_id (int), role, thread_id, message length, answer length, elapsed ms
  NOT logged : message content, answer content, applicant data
"""

import logging
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.chatbot.schemas import ChatRequest, ChatResponse, ChatHistoryItem, JobSummary
from app.chatbot.graph import build_graph
from app.chatbot.services.job_service import get_jobs_by_recruiter
from app.chatbot.services.history_service import append_turn, get_history
from app.chatbot.services.rate_limiter import check_rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chatbot", tags=["Chatbot AI"])

# Compiled graph — built once at startup, shared across requests.
# MemorySaver stores LangGraph checkpoint state in-process (dev mode).
# To switch to Postgres in prod, replace MemorySaver in graph.py with:
#   from langgraph.checkpoint.postgres import PostgresSaver
#   checkpointer = PostgresSaver.from_conn_string(settings.DATABASE_URL)
_graph = build_graph()

_ALLOWED_ROLES = {"recruiter", "job_seeker"}


# ---------------------------------------------------------------------------
# POST /message
# ---------------------------------------------------------------------------

@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Main chatbot endpoint.

    Requires a valid JWT (401 if missing/expired).
    Only recruiter and job_seeker roles are allowed (403 for admin).
    Passes the message through the LangGraph pipeline and returns the answer.
    Each exchange is appended to the in-memory history store.
    """
    role = current_user.role.name
    if role not in _ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chatbot chỉ dành cho nhà tuyển dụng và ứng viên",
        )

    if not check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.",
        )

    thread_id = request.thread_id or str(uuid.uuid4())
    t_start = time.monotonic()

    initial_state = {
        "user_id": current_user.id,
        "role": role,
        "message": request.message,
        "job_id": request.job_id,
        "intent": None,
        "job_info": None,
        "applicants": [],
        "batch_summaries": [],
        "answer": "",
        "blocked_reason": None,
    }

    # db forwarded via config so DB-dependent nodes can query without
    # breaking the serialisable ChatState contract.
    config = {"configurable": {"thread_id": thread_id, "db": db}}

    final_state = await _graph.ainvoke(initial_state, config=config)
    answer = final_state.get("answer") or "Không có câu trả lời"

    # Persist to history (in-memory; ownership-scoped)
    append_turn(thread_id, current_user.id, request.message, answer)

    # Structured log — no PII content
    elapsed_ms = round((time.monotonic() - t_start) * 1000)
    logger.info(
        "chatbot_message completed",
        extra={
            "user_id": current_user.id,
            "role": role,
            "thread_id": thread_id,
            "msg_len": len(request.message),
            "answer_len": len(answer),
            "elapsed_ms": elapsed_ms,
        },
    )

    return ChatResponse(answer=answer, thread_id=thread_id)


# ---------------------------------------------------------------------------
# GET /my-jobs
# ---------------------------------------------------------------------------

@router.get("/my-jobs", response_model=list[JobSummary])
async def get_my_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return all jobs (id, title, status) owned by the authenticated recruiter.
    Returns 403 for job_seeker and admin.
    """
    if current_user.role.name != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhà tuyển dụng mới có danh sách job",
        )
    return get_jobs_by_recruiter(current_user.id, db)


# ---------------------------------------------------------------------------
# GET /history
# ---------------------------------------------------------------------------

@router.get("/history", response_model=list[ChatHistoryItem])
async def get_chat_history(
    thread_id: str = Query(..., description="UUID của thread cần lấy lịch sử"),
    current_user: User = Depends(get_current_user),
):
    """
    Return the message history for a thread_id.

    • 200 []   — thread not found (no messages yet)
    • 200 [...] — list of {role, content, created_at} pairs
    • 403      — thread exists but belongs to a different user
    • 401      — not authenticated
    """
    messages = get_history(thread_id, current_user.id)
    if messages is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền xem lịch sử của thread này",
        )
    logger.debug(
        "chatbot_history fetched",
        extra={"user_id": current_user.id, "thread_id": thread_id, "count": len(messages)},
    )
    return messages
