# =============================================================================
# schemas/profile.py
# Mục đích: Định nghĩa Pydantic schemas cho hồ sơ ứng viên (UserProfile).
# Gồm schema cập nhật (PUT) và schema phản hồi (GET).
# Các trường Optional cho phép cập nhật từng phần mà không cần gửi đủ tất cả.
# =============================================================================

from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class ProfileUpdateRequest(BaseModel):
    """Dữ liệu gửi lên khi ứng viên cập nhật hồ sơ cá nhân (UC03)."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[date] = None       # Ngày sinh, định dạng YYYY-MM-DD
    avatar_url: Optional[str] = None
    cv_url: Optional[str] = None
    skills: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    bio: Optional[str] = None


class ProfileResponse(BaseModel):
    """Dữ liệu trả về khi client lấy thông tin hồ sơ ứng viên."""
    id: int
    user_id: int
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[date] = None
    avatar_url: Optional[str] = None
    cv_url: Optional[str] = None
    skills: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    bio: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
