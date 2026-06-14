# =============================================================================
# routers/jobs.py
# Mục đích: Định nghĩa các endpoint quản lý tin tuyển dụng.
# Endpoints công khai (không cần đăng nhập):
#   GET  /jobs               → Danh sách job có lọc và phân trang (UC04)
#   GET  /jobs/{id}          → Chi tiết một tin tuyển dụng
# Endpoints dành cho nhà tuyển dụng (yêu cầu role employer):
#   GET  /jobs/my            → Danh sách job của nhà tuyển dụng hiện tại (UC08)
#   POST /jobs               → Đăng tin tuyển dụng mới (UC07)
#   PUT  /jobs/{id}          → Cập nhật tin tuyển dụng (UC08)
#   DELETE /jobs/{id}        → Xóa tin tuyển dụng (UC08)
# =============================================================================

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.schemas.job import (
    JobCreateRequest, JobUpdateRequest,
    JobResponse, JobListResponse, JobFilterParams,
)
from app.schemas.job_recommendation import RecommendedJobListResponse
from app.services import job_service
from app.services import job_recommendation_service
from app.middleware.auth import require_recruiter, require_job_seeker
from app.models.user import User

router = APIRouter(prefix="/jobs", tags=["Tin tuyển dụng"])


@router.get("", response_model=JobListResponse)
def get_jobs(
    keyword: Optional[str] = Query(None, description="Tìm theo tên job, kỹ năng"),
    location: Optional[str] = Query(None, description="Lọc theo địa điểm (gộp)"),
    province: Optional[str] = Query(None, description="Lọc theo tỉnh/thành phố"),
    district: Optional[str] = Query(None, description="Lọc theo quận/huyện"),
    level: Optional[str] = Query(None, description="Lọc theo cấp bậc (Junior/Senior...)"),
    salary_min: Optional[int] = Query(None, description="Lương tối thiểu (triệu đồng)"),
    salary_max: Optional[int] = Query(None, description="Lương tối đa (triệu đồng)"),
    company_name: Optional[str] = Query(None, description="Lọc theo tên công ty"),
    only_active_deadline: Optional[bool] = Query(None, description="Chỉ hiện job còn hạn nộp"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    page_size: int = Query(10, ge=1, le=50, description="Số kết quả mỗi trang"),
    db: Session = Depends(get_db),
):
    """
    Danh sách tin tuyển dụng có hỗ trợ lọc và phân trang (UC04).
    Không yêu cầu đăng nhập - public endpoint.
    """
    filters = JobFilterParams(
        keyword=keyword, location=location, province=province, district=district,
        level=level, salary_min=salary_min, salary_max=salary_max,
        company_name=company_name, only_active_deadline=only_active_deadline,
        page=page, page_size=page_size,
    )
    return job_service.get_jobs(filters, db)


@router.get("/recommendations", response_model=RecommendedJobListResponse)
def get_job_recommendations(
    top_n: int = Query(10, ge=1, le=30, description="Số job gợi ý tối đa"),
    current_user: User = Depends(require_job_seeker),
    db: Session = Depends(get_db),
):
    """
    Gợi ý việc làm phù hợp cho ứng viên dựa trên CV active của họ.
    Yêu cầu: đăng nhập với tài khoản job_seeker.
    """
    return job_recommendation_service.get_recommendations(current_user, db, top_n=top_n)


@router.get("/my", response_model=list[JobResponse])
def get_my_jobs(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """
    Danh sách tất cả tin tuyển dụng của nhà tuyển dụng hiện tại (UC08).
    Yêu cầu: đăng nhập với tài khoản employer.
    """
    return job_service.get_jobs_by_employer(current_user, db)


@router.get("/{job_id}", response_model=JobResponse)
def get_job_detail(job_id: int, db: Session = Depends(get_db)):
    """Chi tiết một tin tuyển dụng. Không yêu cầu đăng nhập."""
    return job_service.get_job_by_id(job_id, db)


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    request: JobCreateRequest,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Đăng tin tuyển dụng mới (UC07). Yêu cầu: tài khoản employer."""
    return job_service.create_job(request, current_user, db)


@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    request: JobUpdateRequest,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Cập nhật tin tuyển dụng (UC08). Chỉ chủ sở hữu mới được sửa."""
    return job_service.update_job(job_id, request, current_user, db)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Xóa tin tuyển dụng (UC08). Chỉ chủ sở hữu mới được xóa."""
    job_service.delete_job(job_id, current_user, db)
