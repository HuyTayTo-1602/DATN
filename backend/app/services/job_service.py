# =============================================================================
# services/job_service.py
# Mục đích: Xử lý nghiệp vụ liên quan đến tin tuyển dụng.
# =============================================================================

from datetime import date

from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, Integer
from fastapi import HTTPException, status

from app.models.job import Job
from app.models.company import Company
from app.models.user import User
from app.schemas.job import JobCreateRequest, JobUpdateRequest, JobFilterParams


def create_job(request: JobCreateRequest, current_user: User, db: Session) -> Job:
    """
    Tạo tin tuyển dụng mới với status='active' để hiện ngay trong danh sách.
    Recruiter phải chỉ định company_id thuộc quyền sở hữu của mình.
    """
    company = db.query(Company).filter(
        Company.id == request.company_id,
        Company.user_id == current_user.id,
    ).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Công ty không tồn tại hoặc không thuộc quyền sở hữu của bạn",
        )

    job_data = request.model_dump(exclude_none=True)
    job_data.pop("company_id")

    new_job = Job(
        company_id=company.id,
        status="active",  # Active ngay để xuất hiện trong danh sách public
        **job_data,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job


def get_jobs(filters: JobFilterParams, db: Session) -> dict:
    """Lấy danh sách job có hỗ trợ lọc và phân trang."""
    query = db.query(Job).filter(Job.status == "active")

    if filters.keyword:
        kw = f"%{filters.keyword}%"
        query = query.filter(or_(
            Job.title.ilike(kw),
            Job.description.ilike(kw),
            Job.requirements.ilike(kw),
            Job.benefits.ilike(kw),
        ))

    if filters.location:
        query = query.filter(Job.location.ilike(f"%{filters.location}%"))

    if filters.level:
        query = query.filter(Job.level == filters.level)

    if filters.salary_min is not None:
        query = query.filter(cast(Job.salary, Integer) >= filters.salary_min)
    if filters.salary_max is not None:
        query = query.filter(cast(Job.salary, Integer) <= filters.salary_max)

    if filters.company_name:
        query = query.join(Company).filter(Company.name.ilike(f"%{filters.company_name}%"))

    if filters.only_active_deadline:
        today = date.today()
        query = query.filter(or_(Job.deadline == None, Job.deadline >= today))

    total = query.count()

    items = (
        query.order_by(Job.created_at.desc())
        .offset((filters.page - 1) * filters.page_size)
        .limit(filters.page_size)
        .all()
    )

    return {
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "items": items,
    }


def get_job_by_id(job_id: int, db: Session) -> Job:
    """Lấy chi tiết một tin tuyển dụng theo ID. Raise 404 nếu không tìm thấy."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tin tuyển dụng",
        )
    return job


def update_job(job_id: int, request: JobUpdateRequest, current_user: User, db: Session) -> Job:
    """Cập nhật tin tuyển dụng. Chỉ chủ sở hữu job mới được phép."""
    job = get_job_by_id(job_id, db)

    if job.company.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền chỉnh sửa tin tuyển dụng này",
        )

    for field, value in request.model_dump(exclude_none=True).items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    return job


def delete_job(job_id: int, current_user: User, db: Session) -> None:
    """Xóa tin tuyển dụng. Chỉ chủ sở hữu job mới được phép."""
    job = get_job_by_id(job_id, db)

    if job.company.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa tin tuyển dụng này",
        )

    db.delete(job)
    db.commit()


def get_jobs_by_employer(current_user: User, db: Session) -> list[Job]:
    """Lấy toàn bộ tin tuyển dụng từ TẤT CẢ công ty của recruiter hiện tại."""
    companies = db.query(Company).filter(Company.user_id == current_user.id).all()
    if not companies:
        return []
    company_ids = [c.id for c in companies]
    jobs = (
        db.query(Job)
        .filter(Job.company_id.in_(company_ids))
        .order_by(Job.created_at.desc())
        .all()
    )
    for job in jobs:
        job.applicant_count = len(job.applications)
    return jobs
