"""
Router: /recruiter/candidates
Chỉ dành cho recruiter và admin.
"""

from urllib.parse import quote

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from fastapi import HTTPException

from app.config import get_settings
from app.db.database import get_db
from app.middleware.auth import require_roles
from app.models.user import User
from app.models.candidate_cv import CandidateCV
from app.schemas.candidate_search import CandidateSearchResponse
from app.services import candidate_search_service
from app.integrations.minio_client import get_minio_client

router = APIRouter(prefix="/recruiter/candidates", tags=["Tìm kiếm ứng viên"])

_ALLOWED_ROLES = ["recruiter", "admin"]


@router.get(
    "/search",
    response_model=CandidateSearchResponse,
    summary="Tìm kiếm ứng viên theo skill hoặc keyword",
)
def search_candidates(
    q: str = Query(default="", description="Keyword tìm kiếm, ví dụ: java python"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(require_roles(_ALLOWED_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Recruiter/admin tìm ứng viên theo skill hoặc nội dung CV.
    - Kết quả được sắp xếp theo độ liên quan (profile match > CV text match).
    - Mỗi ứng viên chỉ xuất hiện một lần.
    - q rỗng → trả về tất cả ứng viên active có profile.
    """
    return candidate_search_service.search_candidates(q, db, page, page_size)


@router.get(
    "/{user_id}/cv",
    summary="Stream CV của ứng viên",
)
def stream_candidate_cv(
    user_id: int,
    current_user: User = Depends(require_roles(_ALLOWED_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Recruiter/admin tải CV active (hoặc mới nhất) của ứng viên.
    Trả về file PDF stream — browser có thể mở trực tiếp.
    """
    cv = (
        db.query(CandidateCV)
        .filter(CandidateCV.user_id == user_id, CandidateCV.is_active == True)
        .first()
    )
    if cv is None:
        # Fallback: lấy CV mới nhất nếu không có active
        cv = (
            db.query(CandidateCV)
            .filter(CandidateCV.user_id == user_id)
            .order_by(CandidateCV.id.desc())
            .first()
        )

    if cv is None:
        raise HTTPException(status_code=404, detail="Ứng viên chưa có CV")

    settings = get_settings()
    client = get_minio_client()
    try:
        response = client.get_object(settings.MINIO_BUCKET_NAME, cv.object_key)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Không thể tải CV từ storage: {exc}")

    encoded_name = quote(cv.file_name)
    return StreamingResponse(
        response,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{encoded_name}"},
    )
