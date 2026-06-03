# =============================================================================
# schemas/user.py
# Sửa: bỏ full_name khỏi RegisterRequest (không có trong ERD), đổi role names
#       sang job_seeker/recruiter, thêm status vào UserResponse,
#       chuẩn hoá LoginResponse trả đủ thông tin (token + user + role).
# =============================================================================

from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional


# ---------- Schemas cho Đăng ký ----------

class RegisterRequest(BaseModel):
    """Dữ liệu client gửi lên khi đăng ký tài khoản mới."""
    email: EmailStr
    password: str
    role: str   # Chỉ chấp nhận: "job_seeker" hoặc "recruiter"

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        """Mật khẩu phải có ít nhất 6 ký tự."""
        if len(v) < 6:
            raise ValueError("Mật khẩu phải có ít nhất 6 ký tự")
        return v

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        """Chỉ cho phép đăng ký với role job_seeker hoặc recruiter."""
        allowed = {"job_seeker", "recruiter"}
        if v not in allowed:
            raise ValueError("Vai trò không hợp lệ. Chỉ chấp nhận: job_seeker, recruiter")
        return v


# ---------- Schemas cho Đăng nhập ----------

class LoginRequest(BaseModel):
    """Dữ liệu client gửi lên khi đăng nhập."""
    email: EmailStr
    password: str


# ---------- Schemas thông tin User ----------

class UserResponse(BaseModel):
    """Thông tin user trả về cho client — KHÔNG chứa password_hash."""
    id: int
    email: str
    role: str       # Tên role lấy từ bảng roles: job_seeker | recruiter | admin
    status: str     # active | inactive | banned
    created_at: datetime

    class Config:
        from_attributes = True  # Cho phép khởi tạo từ SQLAlchemy model object


# ---------- Response sau đăng ký thành công ----------

class RegisterResponse(BaseModel):
    """Phản hồi sau khi đăng ký thành công."""
    message: str = "Đăng ký tài khoản thành công"
    user: UserResponse


# ---------- Response sau đăng nhập thành công ----------

class LoginResponse(BaseModel):
    """
    Phản hồi sau khi đăng nhập thành công.
    Trả đủ: access_token + refresh_token + thông tin user + role để frontend tự điều hướng.
    """
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


# ---------- Schemas cho Refresh Token ----------

class RefreshTokenRequest(BaseModel):
    """Client gửi refresh_token để lấy access_token mới."""
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    """Phản hồi khi refresh thành công — chỉ trả access_token mới."""
    access_token: str
    token_type: str = "bearer"
