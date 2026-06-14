# =============================================================================
# schemas/company.py
# Mục đích: Định nghĩa Pydantic schemas cho thông tin doanh nghiệp (Company).
# Dùng cho chức năng UC06: Nhà tuyển dụng cập nhật hồ sơ công ty.
# =============================================================================

from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime
from typing import Optional


class CompanyUpdateRequest(BaseModel):
    """Dữ liệu gửi lên khi nhà tuyển dụng cập nhật thông tin công ty."""
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    size: Optional[str] = Field(None, max_length=50)
    type: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=300)  # Tự ghép từ 3 cột dưới
    province: Optional[str] = Field(None, max_length=100)         # Tỉnh/Thành phố
    district: Optional[str] = Field(None, max_length=100)         # Quận/Huyện
    address_detail: Optional[str] = Field(None, max_length=255)   # Số nhà + tên đường
    website: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=20)


class CompanyResponse(BaseModel):
    """Dữ liệu trả về khi client lấy thông tin công ty."""
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    size: Optional[str] = None
    type: Optional[str] = None
    address: Optional[str] = None
    province: Optional[str] = None
    district: Optional[str] = None
    address_detail: Optional[str] = None
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
