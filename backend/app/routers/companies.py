# =============================================================================
# routers/companies.py
# Endpoints quản lý công ty:
#   POST /companies              → Recruiter tạo công ty (chỉ được tạo 1)
#   GET  /companies/my           → Công ty của recruiter đang đăng nhập (1:1)
#   GET  /companies/{id}         → Xem thông tin công ty công khai (không cần login)
#   PUT  /companies/{id}         → Cập nhật công ty (chỉ chủ sở hữu)
# =============================================================================

from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.company import CompanyUpdateRequest, CompanyResponse
from app.services import company_service
from app.middleware.auth import require_recruiter
from app.models.user import User

router = APIRouter(prefix="/companies", tags=["Nhà tuyển dụng - Quản lý công ty"])


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    request: CompanyUpdateRequest,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Recruiter tạo công ty. Mỗi tài khoản chỉ được tạo một công ty duy nhất."""
    return company_service.create_company(request, current_user, db)


@router.get("/my", response_model=Optional[CompanyResponse])
def get_my_company(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Lấy thông tin công ty của recruiter hiện tại (null nếu chưa tạo)."""
    return company_service.get_company_by_user(current_user, db)


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company_public(company_id: int, db: Session = Depends(get_db)):
    """Xem thông tin công ty theo ID — không cần đăng nhập."""
    return company_service.get_company_by_id(company_id, db)


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: int,
    request: CompanyUpdateRequest,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Cập nhật thông tin công ty. Chỉ chủ sở hữu mới được phép."""
    return company_service.update_company(company_id, request, current_user, db)
