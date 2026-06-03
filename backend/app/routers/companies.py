# =============================================================================
# routers/companies.py
# Endpoints quản lý công ty:
#   POST /companies              → Recruiter tạo công ty mới
#   GET  /companies/my           → Danh sách công ty của recruiter đang đăng nhập
#   GET  /companies/{id}         → Xem thông tin công ty công khai (không cần login)
#   PUT  /companies/{id}         → Cập nhật công ty (chỉ chủ sở hữu)
# =============================================================================

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
    """Recruiter tạo công ty mới. Một recruiter có thể có nhiều công ty."""
    return company_service.create_company(request, current_user, db)


@router.get("/my", response_model=list[CompanyResponse])
def get_my_companies(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Lấy danh sách tất cả công ty thuộc quyền sở hữu của recruiter hiện tại."""
    return company_service.get_companies_by_user(current_user, db)


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
