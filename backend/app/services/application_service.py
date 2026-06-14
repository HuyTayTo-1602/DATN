# =============================================================================
# services/application_service.py
# Mục đích: Xử lý nghiệp vụ ứng tuyển việc làm.
# =============================================================================

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.application import JobApplication
from app.models.candidate_cv import CandidateCV
from app.models.job import Job
from app.models.user import User
from app.schemas.application import ApplyRequest, StatusUpdateRequest
from urllib.parse import quote
from app.integrations.minio_client import get_minio_client
from app.config import get_settings as _get_settings


VALID_STATUSES = {"accepted", "rejected"}


def _to_dict(app: JobApplication, include_recruiter_id: bool = False) -> dict:
    """Chuyển JobApplication ORM thành dict, populate thêm job_title, company_name và thông tin ứng viên."""
    profile = app.user.profile if app.user else None
    result = {
        "id": app.id,
        "job_id": app.job_id,
        "user_id": app.user_id,
        "status": app.status,
        "cover_letter": app.cover_letter,
        "cv_url": app.cv_url,
        "created_at": app.created_at,
        "job_title": app.job.title if app.job else None,
        "company_name": app.job.company.name if (app.job and app.job.company) else None,
        "applicant_email": app.user.email if app.user else None,
        "applicant_name": profile.full_name if profile else None,
        "applicant_phone": profile.phone if profile else None,
    }
    if include_recruiter_id:
        result["recruiter_id"] = app.job.company.user_id if (app.job and app.job.company) else None
    return result


def apply_job(job_id: int, request: ApplyRequest, current_user: User, db: Session) -> dict:
    """Ứng viên nộp đơn vào một job."""
    job = db.query(Job).filter(Job.id == job_id, Job.status == "active").first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tin tuyển dụng không tồn tại hoặc đã đóng",
        )

    # Chọn CV: dùng cv_id nếu được chỉ định, ngược lại dùng CV active
    if request.cv_id:
        active_cv = db.query(CandidateCV).filter(
            CandidateCV.id == request.cv_id,
            CandidateCV.user_id == current_user.id,
        ).first()
        if not active_cv:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CV không tồn tại hoặc không thuộc về bạn",
            )
    else:
        active_cv = db.query(CandidateCV).filter(
            CandidateCV.user_id == current_user.id,
            CandidateCV.is_active == True,
        ).first()
    if not active_cv:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn cần upload CV trong trang Hồ sơ trước khi ứng tuyển",
        )

    existing = db.query(JobApplication).filter(
        JobApplication.user_id == current_user.id,
        JobApplication.job_id == job_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn đã ứng tuyển vào vị trí này rồi",
        )

    application = JobApplication(
        job_id=job_id,
        user_id=current_user.id,
        cover_letter=request.cover_letter,
        cv_url=active_cv.object_key,   # lưu object_key MinIO của CV active
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return _to_dict(application, include_recruiter_id=True)


def get_my_applications(current_user: User, db: Session) -> list[dict]:
    """Lấy danh sách đơn ứng tuyển của ứng viên, kèm tên job và công ty."""
    apps = (
        db.query(JobApplication)
        .filter(JobApplication.user_id == current_user.id)
        .order_by(JobApplication.created_at.desc())
        .all()
    )
    return [_to_dict(app) for app in apps]


def get_applications_for_job(job_id: int, current_user: User, db: Session) -> list[dict]:
    """Nhà tuyển dụng xem danh sách ứng viên của một job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy job")

    if job.company.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem ứng viên của job này",
        )

    apps = db.query(JobApplication).filter(JobApplication.job_id == job_id).all()
    return [_to_dict(app) for app in apps]


def get_cv_stream(application_id: int, current_user: User, db: Session):
    """Trả về (file_stream, filename) của CV. Backend proxy từ MinIO — browser không cần kết nối MinIO trực tiếp."""
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đơn ứng tuyển")

    is_owner_recruiter = (
        application.job
        and application.job.company
        and application.job.company.user_id == current_user.id
    )
    is_applicant = application.user_id == current_user.id
    if not is_owner_recruiter and not is_applicant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem CV này")

    if not application.cv_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Đơn ứng tuyển này không có CV đính kèm")

    settings = _get_settings()
    client = get_minio_client()
    try:
        response = client.get_object(settings.MINIO_BUCKET_NAME, application.cv_url)
    except Exception:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="CV không tồn tại trong hệ thống lưu trữ")

    # Lấy tên file từ object_key (phần sau dấu / cuối cùng, bỏ uuid prefix)
    raw_name = application.cv_url.split("/")[-1]
    # object_key dạng: uuid-filename.pdf  → bỏ uuid- prefix
    parts = raw_name.split("-", 5)
    filename = parts[-1] if len(parts) > 4 else raw_name
    encoded_name = quote(filename)

    return response, encoded_name


def update_application_status(
    application_id: int,
    request: StatusUpdateRequest,
    current_user: User,
    db: Session,
) -> dict:
    """Nhà tuyển dụng cập nhật trạng thái đơn ứng tuyển."""
    if request.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trạng thái không hợp lệ. Chỉ chấp nhận: {', '.join(VALID_STATUSES)}",
        )

    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đơn ứng tuyển")

    if application.job.company.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền thao tác")

    application.status = request.status
    db.commit()
    db.refresh(application)
    return _to_dict(application)
