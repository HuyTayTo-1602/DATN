from typing import List, Optional
from pydantic import BaseModel, Field


class CandidateResult(BaseModel):
    user_id: int
    email: str
    full_name: Optional[str] = None
    skills: Optional[str] = None
    experience: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    cv_id: Optional[int] = None
    cv_file_name: Optional[str] = None
    score: float = 0.0


class CandidateSearchResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[CandidateResult]
