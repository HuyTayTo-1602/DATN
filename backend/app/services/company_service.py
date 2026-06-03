# =============================================================================
# services/company_service.py
# Mục đích: Xử lý nghiệp vụ quản lý thông tin doanh nghiệp.
# =============================================================================

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyUpdateRequest


def create_company(request: CompanyUpdateRequest, current_user: User, db: Session) -> Company:
    """Recruiter tạo công ty mới thuộc quyền sở hữu của mình."""
    company = Company(
        user_id=current_user.id,
        **request.model_dump(exclude_none=True),
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def get_companies_by_user(current_user: User, db: Session) -> list[Company]:
    """Lấy danh sách tất cả công ty thuộc quyền sở hữu của recruiter hiện tại."""
    return db.query(Company).filter(Company.user_id == current_user.id).all()


def get_company_by_id(company_id: int, db: Session) -> Company:
    """Lấy thông tin công ty theo ID (dùng cho trang công khai)."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy công ty",
        )
    return company


def update_company(company_id: int, request: CompanyUpdateRequest, current_user: User, db: Session) -> Company:
    """Cập nhật thông tin công ty. Chỉ chủ sở hữu mới được cập nhật."""
    company = get_company_by_id(company_id, db)

    if company.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền chỉnh sửa công ty này",
        )

    for field, value in request.model_dump(exclude_none=True).items():
        setattr(company, field, value)

    db.commit()
    db.refresh(company)
    return company
