from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.middleware.auth import require_admin
from app.models.user import User
from app.schemas.admin import (
    AdminUserCreate, AdminUserUpdate, AdminUserListResponse, AdminUserResponse,
    AdminCompanyCreate, AdminCompanyUpdate, AdminCompanyListResponse,
    AdminJobCreate, AdminJobUpdate, AdminJobListResponse,
)
from app.schemas.company import CompanyResponse
from app.schemas.job import JobResponse
from app.services import admin_service
from app.services import admin_dashboard_service
from app.schemas.admin_dashboard import DashboardSummary

router = APIRouter(prefix="/admin", tags=["Admin"])


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard/summary", response_model=DashboardSummary, summary="[Admin] Dashboard tổng quan")
def get_dashboard_summary(
    period: str = Query("30d", description="today | 7d | 30d"),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_dashboard_service.get_dashboard_summary(db, period)


# ═══════════════════════════════════════════════════════════════════════════════
# QUẢN LÝ USER
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/users", response_model=AdminUserListResponse, summary="[Admin] Danh sách user")
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    role: Optional[str] = Query(None, description="Lọc theo role: job_seeker | recruiter | admin"),
    status: Optional[str] = Query(None, description="Lọc theo status: active | inactive | banned"),
    search: Optional[str] = Query(None, description="Tìm theo email"),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.list_users(db, page, page_size, role, status, search)


@router.get("/users/{user_id}", response_model=AdminUserResponse, summary="[Admin] Chi tiết user")
def get_user(
    user_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.get_user(user_id, db)


@router.post(
    "/users",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Admin] Tạo user mới",
)
def create_user(
    request: AdminUserCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.create_user(request, db)


@router.put("/users/{user_id}", response_model=AdminUserResponse, summary="[Admin] Cập nhật user")
def update_user(
    user_id: int,
    request: AdminUserUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.update_user(user_id, request, db)


@router.delete("/users/{user_id}", summary="[Admin] Xóa user")
def delete_user(
    user_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.delete_user(user_id, db)


# ═══════════════════════════════════════════════════════════════════════════════
# QUẢN LÝ CÔNG TY
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/companies", response_model=AdminCompanyListResponse, summary="[Admin] Danh sách công ty")
def list_companies(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None, description="Tìm theo tên công ty"),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.list_companies(db, page, page_size, search)


@router.get("/companies/{company_id}", response_model=CompanyResponse, summary="[Admin] Chi tiết công ty")
def get_company(
    company_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.get_company(company_id, db)


@router.post(
    "/companies",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Admin] Tạo công ty mới",
)
def create_company(
    request: AdminCompanyCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.create_company(request, db)


@router.put("/companies/{company_id}", response_model=CompanyResponse, summary="[Admin] Cập nhật công ty")
def update_company(
    company_id: int,
    request: AdminCompanyUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.update_company(company_id, request, db)


@router.delete("/companies/{company_id}", summary="[Admin] Xóa công ty")
def delete_company(
    company_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.delete_company(company_id, db)


# ═══════════════════════════════════════════════════════════════════════════════
# QUẢN LÝ JOB
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/jobs", response_model=AdminJobListResponse, summary="[Admin] Danh sách job")
def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None, description="Lọc theo status: active | closed | draft"),
    search: Optional[str] = Query(None, description="Tìm theo tiêu đề"),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.list_jobs(db, page, page_size, status, search)


@router.get("/jobs/{job_id}", response_model=JobResponse, summary="[Admin] Chi tiết job")
def get_job(
    job_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.get_job(job_id, db)


@router.post(
    "/jobs",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Admin] Tạo job mới",
)
def create_job(
    request: AdminJobCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.create_job(request, db)


@router.put("/jobs/{job_id}", response_model=JobResponse, summary="[Admin] Cập nhật job")
def update_job(
    job_id: int,
    request: AdminJobUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.update_job(job_id, request, db)


@router.delete("/jobs/{job_id}", summary="[Admin] Xóa job")
def delete_job(
    job_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.delete_job(job_id, db)
