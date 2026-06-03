from typing import Optional, Literal
from typing_extensions import TypedDict
from pydantic import BaseModel, Field


class ChatState(TypedDict):
    """LangGraph state passed between nodes in the chatbot graph."""

    user_id: int
    role: Literal["recruiter", "job_seeker"]
    message: str
    job_id: Optional[int]
    intent: Optional[Literal["general_qa", "applicant_query"]]
    job_info: Optional[dict]     # {id, title, level, salary, location, description, requirements, benefits}
    applicants: list[dict]       # [{application_id, user_id, email, full_name, skills, …, cv_text}]
    batch_summaries: list[str]   # intermediate results during map-reduce
    answer: str
    blocked_reason: Optional[str]


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)
    job_id: Optional[int] = None
    thread_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    thread_id: str


class JobSummary(BaseModel):
    id: int
    title: str
    status: str


class ChatHistoryItem(BaseModel):
    """One message turn in a conversation thread."""
    role: str        # "user" | "assistant"
    content: str
    created_at: str  # ISO-8601 UTC, e.g. "2026-05-30T10:00:00Z"
