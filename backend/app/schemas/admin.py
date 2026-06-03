from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional

from app.schemas.user import UserResponse
from app.schemas.company import CompanyResponse
from app.schemas.job import JobResponse


# ─── User management ──────────────────────────────────────────────────────────

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str  # job_seeker | recruiter | admin

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Mật khẩu phải có ít nhất 6 ký tự")
        return v

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in {"job_seeker", "recruiter", "admin"}:
            raise ValueError("Role không hợp lệ. Chấp nhận: job_seeker, recruiter, admin")
        return v


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    status: Optional[str] = None  # active | inactive | banned

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"job_seeker", "recruiter", "admin"}:
            raise ValueError("Role không hợp lệ")
        return v

    @field_validator("status")
    @classmethod
    def status_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"active", "inactive", "banned"}:
            raise ValueError("Status không hợp lệ. Chấp nhận: active, inactive, banned")
        return v


class AdminUserResponse(BaseModel):
    """Thông tin user trả về cho admin — có thêm full_name nếu là job_seeker."""
    id: int
    email: str
    role: str
    status: str
    created_at: datetime
    full_name: Optional[str] = None  # Lấy từ UserProfile nếu có

    class Config:
        from_attributes = True


class AdminUserListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[AdminUserResponse]


# ─── Company management ───────────────────────────────────────────────────────

class AdminCompanyCreate(BaseModel):
    user_id: int   # recruiter sở hữu công ty này
    name: str
    description: Optional[str] = None
    size: Optional[str] = None
    type: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    phone: Optional[str] = None


class AdminCompanyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    size: Optional[str] = None
    type: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    phone: Optional[str] = None


class AdminCompanyListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[CompanyResponse]


# ─── Job management ───────────────────────────────────────────────────────────

class AdminJobCreate(BaseModel):
    company_id: int
    title: str
    level: Optional[str] = None
    salary: Optional[int] = None          # Mức lương (triệu đồng)
    location: Optional[str] = None
    deadline: Optional[str] = None  # ISO date string "YYYY-MM-DD"
    status: Optional[str] = "active"
    description: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None


class AdminJobUpdate(BaseModel):
    title: Optional[str] = None
    level: Optional[str] = None
    salary: Optional[int] = None          # Mức lương (triệu đồng)
    location: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[str] = None  # active | closed | draft
    description: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None


class AdminJobListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[JobResponse]
