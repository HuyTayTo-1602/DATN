# =============================================================================
# models/application.py
# Mục đích: Định nghĩa bảng `job_applications` lưu thông tin ứng tuyển.
# Đây là bảng trung gian (junction table) thể hiện quan hệ N:N giữa
# User (ứng viên) và Job, với các thông tin bổ sung như trạng thái, thời gian.
# Ràng buộc: mỗi ứng viên chỉ ứng tuyển một job một lần (unique user_id + job_id).
# =============================================================================

from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class JobApplication(Base):
    """Bảng job_applications: lưu thông tin mỗi lần ứng viên nộp đơn vào job."""

    __tablename__ = "job_applications"

    # Ràng buộc: một ứng viên không thể nộp đơn hai lần cho cùng một job
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_user_job"),
    )

    id = Column(Integer, primary_key=True, index=True)

    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Trạng thái đơn: pending | reviewed | accepted | rejected
    status = Column(String(50), default="pending", nullable=False)

    # Thư xin việc hoặc ghi chú kèm theo
    cover_letter = Column(Text)

    # Đường dẫn CV ứng viên đính kèm khi nộp đơn (có thể khác CV profile chính)
    cv_url = Column(String(500))

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Quan hệ về Job và User
    job = relationship("Job", back_populates="applications")
    user = relationship("User", back_populates="applications")
