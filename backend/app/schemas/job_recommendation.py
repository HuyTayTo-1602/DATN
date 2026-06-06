# =============================================================================
# schemas/job_recommendation.py
# Mục đích: Pydantic schemas cho API recommendation.
# =============================================================================

from pydantic import BaseModel
from typing import List

from app.schemas.job import JobResponse


class RecommendedJobResponse(JobResponse):
    """Job response kèm điểm và lý do gợi ý."""
    match_score: int
    match_reason: str  # VD: "Matched: python, backend, fastapi"


class RecommendedJobListResponse(BaseModel):
    """Kết quả recommendation trả về cho ứng viên."""
    items: List[RecommendedJobResponse]
    total: int
    has_cv: bool       # True nếu user có CV active
    cv_parsed: bool    # True nếu CV đã parse thành công
