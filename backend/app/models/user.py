# =============================================================================
# models/user.py
# Sửa: đổi tên role (job_seeker, recruiter, admin), thêm status vào users,
#       đổi quan hệ company sang 1:1 (uselist=False).
# =============================================================================

from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Role(Base):
    """Bảng roles: lưu danh sách vai trò trong hệ thống."""

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # job_seeker | recruiter | admin

    # Quan hệ ngược: một role có nhiều user
    users = relationship("User", back_populates="role")


class User(Base):
    """Bảng users: lưu thông tin tài khoản người dùng."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)       # Mật khẩu đã được bcrypt hash
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    # status: active | inactive | banned — dùng để khóa/mở tài khoản
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Quan hệ đến Role (nhiều user thuộc một role)
    role = relationship("Role", back_populates="users")

    # Quan hệ 1:1 đến UserProfile (chỉ dành cho job_seeker)
    profile = relationship("UserProfile", back_populates="user", uselist=False)

    # Quan hệ 1:1 đến Company (mỗi recruiter chỉ sở hữu một công ty)
    company = relationship("Company", back_populates="user", uselist=False)

    # Quan hệ 1:N đến JobApplication (các đơn ứng tuyển của user)
    applications = relationship("JobApplication", back_populates="user")

    # Quan hệ 1:N đến CandidateCV (các CV đã upload của ứng viên)
    cvs = relationship("CandidateCV", back_populates="user")

    # Quan hệ 1:N đến Notification
    notifications = relationship("Notification", back_populates="user")
