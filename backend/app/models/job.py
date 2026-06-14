# =============================================================================
# models/job.py
# Mục đích: Định nghĩa bảng `jobs` lưu thông tin các tin tuyển dụng.
# Quan hệ N:1 với bảng companies (nhiều job thuộc một công ty).
# Quan hệ 1:N với bảng job_applications (một job có nhiều đơn ứng tuyển).
# =============================================================================

from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Job(Base):
    """Bảng jobs: thông tin tin tuyển dụng do nhà tuyển dụng đăng."""

    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)

    # Liên kết đến công ty đăng tin
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)

    title = Column(String(255), nullable=False)   # Chức danh tuyển dụng
    level = Column(String(50))                    # Cấp bậc: Junior, Senior, Manager,...
    salary = Column(String(100))                  # Mức lương: "15-25 triệu", "Thỏa thuận"
    # Hình thức làm việc: onsite | hybrid | remote (thay cho cột `location` cũ)
    work_mode = Column(String(20), default="onsite")
    # Địa chỉ văn phòng tách cột
    province = Column(String(100))                # Tỉnh/Thành phố
    district = Column(String(100))                # Quận/Huyện
    address_detail = Column(String(255))          # Số nhà + tên đường
    deadline = Column(Date)                       # Hạn nộp hồ sơ
    status = Column(String(20), default="active") # Trạng thái: active | closed

    description = Column(Text)                    # Mô tả công việc chi tiết
    requirements = Column(Text)                   # Yêu cầu ứng viên
    benefits = Column(Text)                       # Quyền lợi, phúc lợi

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Quan hệ về Company
    company = relationship("Company", back_populates="jobs")

    # Một job có nhiều đơn ứng tuyển
    applications = relationship("JobApplication", back_populates="job")
