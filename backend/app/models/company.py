# =============================================================================
# models/company.py
# Mục đích: Định nghĩa bảng `companies` lưu thông tin doanh nghiệp tuyển dụng.
# Quan hệ 1:1 với bảng users (một tài khoản employer sở hữu một công ty).
# Quan hệ 1:N với bảng jobs (một công ty có thể đăng nhiều tin tuyển dụng).
# =============================================================================

from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Company(Base):
    """Bảng companies: thông tin hồ sơ doanh nghiệp của nhà tuyển dụng."""

    __tablename__ = "companies"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_companies_user_id"),
    )

    id = Column(Integer, primary_key=True, index=True)

    # Liên kết với tài khoản recruiter (1:1 — mỗi recruiter chỉ sở hữu một công ty)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String(255), nullable=False)    # Tên công ty (bắt buộc)
    description = Column(Text)                    # Mô tả về công ty
    size = Column(String(50))                     # Quy mô: "1-50", "51-200", "200+"
    type = Column(String(100))                    # Loại hình: Công ty CP, TNHH,...
    address = Column(String(500))                 # Địa chỉ trụ sở (tự ghép từ 3 cột dưới)
    # Địa chỉ tách cột để lọc/search theo tỉnh, quận
    province = Column(String(100))                # Tỉnh/Thành phố
    district = Column(String(100))                # Quận/Huyện
    address_detail = Column(String(255))          # Số nhà + tên đường
    website = Column(String(255))                 # Website chính thức
    logo_url = Column(String(500))                # Đường dẫn logo công ty
    phone = Column(String(20))                    # Số điện thoại liên hệ

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Quan hệ ngược về User (back_populates phải khớp với User.company)
    user = relationship("User", back_populates="company")

    # Một công ty có nhiều tin tuyển dụng
    jobs = relationship("Job", back_populates="company")
