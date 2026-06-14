from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User, Role
from app.models.profile import UserProfile
from app.models.company import Company
from app.models.job import Job
from app.models.application import JobApplication
from app.schemas.admin import (
    AdminUserCreate, AdminUserUpdate,
    AdminCompanyCreate, AdminCompanyUpdate,
    AdminJobCreate, AdminJobUpdate,
)
from app.utils.hashing import hash_password


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_user_or_404(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User không tồn tại")
    return user


def _get_company_or_404(company_id: int, db: Session) -> Company:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Công ty không tồn tại")
    return company


def _get_job_or_404(job_id: int, db: Session) -> Job:
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job không tồn tại")
    return job


def _build_admin_user_response(user: User) -> dict:
    full_name = user.profile.full_name if user.profile else None
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.name,
        "status": user.status,
        "created_at": user.created_at,
        "full_name": full_name,
    }


# ─── User management ──────────────────────────────────────────────────────────

def list_users(
    db: Session,
    page: int = 1,
    page_size: int = 10,
    role: str = None,
    status: str = None,
    search: str = None,
) -> dict:
    query = db.query(User)

    if role:
        query = query.join(Role).filter(Role.name == role)
    if status:
        query = query.filter(User.status == status)
    if search:
        query = query.filter(User.email.ilike(f"%{search}%"))

    total = query.count()
    users = query.order_by(User.id).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_build_admin_user_response(u) for u in users],
    }


def get_user(user_id: int, db: Session) -> dict:
    return _build_admin_user_response(_get_user_or_404(user_id, db))


def create_user(request: AdminUserCreate, db: Session) -> dict:
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được sử dụng",
        )

    role = db.query(Role).filter(Role.name == request.role).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vai trò '{request.role}' chưa được cấu hình trong hệ thống",
        )

    new_user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        role_id=role.id,
        status="active",
    )
    db.add(new_user)
    db.flush()

    if request.role == "job_seeker":
        db.add(UserProfile(user_id=new_user.id))

    db.commit()
    db.refresh(new_user)
    return _build_admin_user_response(new_user)


def update_user(user_id: int, request: AdminUserUpdate, db: Session) -> dict:
    user = _get_user_or_404(user_id, db)

    if request.email and request.email != user.email:
        if db.query(User).filter(User.email == request.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email này đã được sử dụng",
            )
        user.email = request.email

    if request.role:
        role = db.query(Role).filter(Role.name == request.role).first()
        if not role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role không tồn tại")
        user.role_id = role.id

    if request.status:
        user.status = request.status

    db.commit()
    db.refresh(user)
    return _build_admin_user_response(user)


def delete_user(user_id: int, db: Session) -> dict:
    user = _get_user_or_404(user_id, db)

    # Xóa đơn ứng tuyển của user này (với tư cách ứng viên)
    db.query(JobApplication).filter(JobApplication.user_id == user_id).delete()

    # Xóa các công ty và job liên quan (với tư cách recruiter)
    for company in list(user.companies):
        for job in list(company.jobs):
            db.query(JobApplication).filter(JobApplication.job_id == job.id).delete()
            db.delete(job)
        db.delete(company)

    # Xóa profile nếu có
    if user.profile:
        db.delete(user.profile)

    db.delete(user)
    db.commit()
    return {"message": f"Đã xóa user {user.email}"}


# ─── Company management ───────────────────────────────────────────────────────

def list_companies(
    db: Session,
    page: int = 1,
    page_size: int = 10,
    search: str = None,
) -> dict:
    query = db.query(Company)
    if search:
        query = query.filter(Company.name.ilike(f"%{search}%"))

    total = query.count()
    companies = query.order_by(Company.id).offset((page - 1) * page_size).limit(page_size).all()

    return {"total": total, "page": page, "page_size": page_size, "items": companies}


def get_company(company_id: int, db: Session) -> Company:
    return _get_company_or_404(company_id, db)


def create_company(request: AdminCompanyCreate, db: Session) -> Company:
    owner = db.query(User).filter(User.id == request.user_id).first()
    if not owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User không tồn tại")
    if owner.role.name not in {"recruiter", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ recruiter hoặc admin mới có thể sở hữu công ty",
        )

    company = Company(
        user_id=request.user_id,
        name=request.name,
        description=request.description,
        size=request.size,
        type=request.type,
        address=request.address,
        website=request.website,
        logo_url=request.logo_url,
        phone=request.phone,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def update_company(company_id: int, request: AdminCompanyUpdate, db: Session) -> Company:
    company = _get_company_or_404(company_id, db)

    for field, value in request.model_dump(exclude_none=True).items():
        setattr(company, field, value)

    db.commit()
    db.refresh(company)
    return company


def delete_company(company_id: int, db: Session) -> dict:
    company = _get_company_or_404(company_id, db)

    for job in list(company.jobs):
        db.query(JobApplication).filter(JobApplication.job_id == job.id).delete()
        db.delete(job)

    db.delete(company)
    db.commit()
    return {"message": f"Đã xóa công ty '{company.name}'"}


# ─── Job management ───────────────────────────────────────────────────────────

def list_jobs(
    db: Session,
    page: int = 1,
    page_size: int = 10,
    status: str = None,
    search: str = None,
) -> dict:
    query = db.query(Job)
    if status:
        query = query.filter(Job.status == status)
    if search:
        query = query.filter(Job.title.ilike(f"%{search}%"))

    total = query.count()
    jobs = query.order_by(Job.id.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {"total": total, "page": page, "page_size": page_size, "items": jobs}


def get_job(job_id: int, db: Session) -> Job:
    return _get_job_or_404(job_id, db)


def create_job(request: AdminJobCreate, db: Session) -> Job:
    company = db.query(Company).filter(Company.id == request.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Công ty không tồn tại")

    deadline = None
    if request.deadline:
        try:
            deadline = date.fromisoformat(request.deadline)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Định dạng deadline không hợp lệ. Dùng YYYY-MM-DD",
            )

    job = Job(
        company_id=request.company_id,
        title=request.title,
        level=request.level,
        salary=request.salary,
        work_mode=request.work_mode or "onsite",
        province=request.province,
        district=request.district,
        address_detail=request.address_detail,
        deadline=deadline,
        status=request.status or "active",
        description=request.description,
        requirements=request.requirements,
        benefits=request.benefits,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def update_job(job_id: int, request: AdminJobUpdate, db: Session) -> Job:
    job = _get_job_or_404(job_id, db)

    data = request.model_dump(exclude_none=True)

    if "deadline" in data:
        try:
            data["deadline"] = date.fromisoformat(data["deadline"])
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Định dạng deadline không hợp lệ. Dùng YYYY-MM-DD",
            )

    for field, value in data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    return job


def delete_job(job_id: int, db: Session) -> dict:
    job = _get_job_or_404(job_id, db)
    db.query(JobApplication).filter(JobApplication.job_id == job_id).delete()
    db.delete(job)
    db.commit()
    return {"message": f"Đã xóa job '{job.title}'"}
