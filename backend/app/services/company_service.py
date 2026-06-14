# =============================================================================
# services/company_service.py
# Mục đích: Xử lý nghiệp vụ quản lý thông tin doanh nghiệp.
# =============================================================================

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyUpdateRequest
from app.utils.location import join_address

# Các cột địa chỉ tách rời — khi cập nhật thì ghép lại thành `address`
_ADDRESS_PARTS = ("province", "district", "address_detail")


def create_company(request: CompanyUpdateRequest, current_user: User, db: Session) -> Company:
    """Recruiter tạo công ty. Mỗi recruiter chỉ được sở hữu một công ty duy nhất."""
    existing = db.query(Company).filter(Company.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bạn đã có công ty. Mỗi tài khoản chỉ được quản lý một công ty duy nhất.",
        )
    data = request.model_dump(exclude_none=True)
    company = Company(user_id=current_user.id, **data)

    # Nếu có cột địa chỉ tách rời → ghép lại `address` đầy đủ
    if any(part in data for part in _ADDRESS_PARTS):
        company.address = join_address(
            company.province, company.district, company.address_detail
        )

    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def get_company_by_user(current_user: User, db: Session) -> Company | None:
    """Lấy công ty của recruiter hiện tại (trả về None nếu chưa tạo)."""
    return db.query(Company).filter(Company.user_id == current_user.id).first()


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

    data = request.model_dump(exclude_none=True)
    for field, value in data.items():
        setattr(company, field, value)

    # Nếu có cập nhật bất kỳ cột địa chỉ tách rời → ghép lại `address` đầy đủ
    if any(part in data for part in _ADDRESS_PARTS):
        company.address = join_address(
            company.province, company.district, company.address_detail
        )

    db.commit()
    db.refresh(company)
    return company
