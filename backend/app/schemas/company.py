# =============================================================================
# schemas/company.py
# Mục đích: Định nghĩa Pydantic schemas cho thông tin doanh nghiệp (Company).
# Dùng cho chức năng UC06: Nhà tuyển dụng cập nhật hồ sơ công ty.
# =============================================================================

from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import Optional


class CompanyUpdateRequest(BaseModel):
    """Dữ liệu gửi lên khi nhà tuyển dụng cập nhật thông tin công ty."""
    name: str                            # Tên công ty (bắt buộc khi cập nhật)
    description: Optional[str] = None
    size: Optional[str] = None           # Vd: "1-50", "51-200", "201-500", "500+"
    type: Optional[str] = None           # Loại hình doanh nghiệp
    address: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    phone: Optional[str] = None


class CompanyResponse(BaseModel):
    """Dữ liệu trả về khi client lấy thông tin công ty."""
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    size: Optional[str] = None
    type: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CompanyBriefResponse(BaseModel):
    """Thông tin tóm tắt của công ty, dùng khi hiển thị trong danh sách job."""
    id: int
    name: str
    logo_url: Optional[str] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True
