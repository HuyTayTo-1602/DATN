"""
Router: /recruiter/candidates
Chỉ dành cho recruiter và admin.
"""

from urllib.parse import quote

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from fastapi import HTTPException

from app.config import get_settings
from app.db.database import get_db
from app.middleware.auth import require_roles
from app.models.user import User
from app.models.candidate_cv import CandidateCV
from app.models.job import Job
from app.models.company import Company
from app.schemas.candidate_search import CandidateSearchResponse
from app.services import candidate_search_service
from app.services import job_candidate_match_service
from app.services.notification_dispatcher import notify
from app.websocket.notification_hub import hub
from app.integrations.minio_client import get_minio_client


class InviteRequest(BaseModel):
    job_id: int
    message: str = ""

router = APIRouter(prefix="/recruiter/candidates", tags=["Tìm kiếm ứng viên"])

_ALLOWED_ROLES = ["recruiter", "admin"]


@router.get(
    "/match/{job_id}",
    summary="Top ứng viên phù hợp nhất với một công việc (PostgreSQL ts_rank)",
)
def match_candidates_for_job(
    job_id: int,
    top_n: int = Query(default=5, ge=1, le=20),
    current_user: User = Depends(require_roles(_ALLOWED_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Trả về top N ứng viên phù hợp nhất với job_id.
    Sử dụng PostgreSQL ts_rank trên search_vector của profile và CV text.
    """
    return job_candidate_match_service.match_candidates_for_job(job_id, db, top_n)


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
    except Exception:
        raise HTTPException(status_code=502, detail="CV không tồn tại trong hệ thống lưu trữ")

    encoded_name = quote(cv.file_name)
    return StreamingResponse(
        response,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{encoded_name}"},
    )


@router.post("/{user_id}/invite", summary="Mời ứng viên ứng tuyển một công việc")
async def invite_candidate(
    user_id: int,
    body: InviteRequest,
    current_user: User = Depends(require_roles(_ALLOWED_ROLES)),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == body.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")

    company = (
        db.query(Company)
        .filter(Company.id == job.company_id, Company.user_id == current_user.id)
        .first()
    )
    if not company:
        raise HTTPException(status_code=403, detail="Bạn không có quyền mời ứng viên cho công việc này")

    candidate = db.query(User).filter(User.id == user_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên")

    title = f"Lời mời ứng tuyển: {job.title}"
    base_msg = f"Bạn nhận được lời mời ứng tuyển vị trí {job.title} từ công ty {company.name}."
    note = body.message.strip()
    message = f"{base_msg}\n\nLời nhắn từ HR: {note}" if note else base_msg

    payload = notify(
        db,
        user_id=user_id,
        type="job_invitation",
        title=title,
        message=message,
        related_id=job.id,
        related_type="job",
    )
    await hub.push(user_id, payload)
    return {"ok": True}
