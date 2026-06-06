# =============================================================================
# models/profile.py
# Mục đích: Định nghĩa bảng `user_profiles` lưu hồ sơ chi tiết của ứng viên.
# Quan hệ 1:1 với bảng users (một user chỉ có một profile và ngược lại).
# Các trường như skills, experience, education được lưu dạng TEXT (JSON string
# hoặc plain text) để linh hoạt mà không cần tạo bảng phụ phức tạp.
# =============================================================================

from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import TSVECTOR

from app.db.database import Base


class UserProfile(Base):
    """Bảng user_profiles: hồ sơ chi tiết dành cho ứng viên (jobseeker)."""

    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)

    # Khóa ngoại liên kết với bảng users, mỗi user chỉ có 1 profile (UNIQUE)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    full_name = Column(String(255))
    phone = Column(String(20))
    address = Column(String(500))
    dob = Column(Date)                    # Ngày sinh
    avatar_url = Column(String(500))      # Đường dẫn ảnh đại diện
    cv_url = Column(String(500))          # Đường dẫn file CV upload lên server

    # Các trường lưu dạng text để linh hoạt (có thể lưu JSON string nếu cần)
    skills = Column(Text)                 # Kỹ năng (vd: "Python, React, Docker")
    experience = Column(Text)             # Kinh nghiệm làm việc
    education = Column(Text)              # Học vấn
    bio = Column(Text)                    # Giới thiệu bản thân

    # Full-text search vector: tổng hợp từ full_name (A), skills (A), experience (B)
    search_vector = Column(TSVECTOR, nullable=True)

    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Quan hệ ngược về User
    user = relationship("User", back_populates="profile")
