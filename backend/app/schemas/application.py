# =============================================================================
# schemas/application.py
# Mục đích: Định nghĩa Pydantic schemas cho chức năng ứng tuyển việc làm.
# Gồm:
#   - ApplyRequest: ứng viên nộp đơn vào một job
#   - ApplicationResponse: thông tin đơn ứng tuyển trả về (kèm tóm tắt job)
#   - StatusUpdateRequest: nhà tuyển dụng cập nhật trạng thái đơn
# =============================================================================

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ApplyRequest(BaseModel):
    """Dữ liệu gửi lên khi ứng viên nộp đơn ứng tuyển vào một job."""
    cover_letter: Optional[str] = None
    cv_id: Optional[int] = None   # Nếu không truyền, dùng CV active


class ApplicationResponse(BaseModel):
    """Thông tin một đơn ứng tuyển trả về cho client."""
    id: int
    job_id: int
    user_id: int
    status: str                          # pending | accepted | rejected
    cover_letter: Optional[str] = None
    cv_url: Optional[str] = None
    created_at: Optional[datetime] = None

    job_title: Optional[str] = None
    company_name: Optional[str] = None

    # Thông tin ứng viên (dành cho recruiter xem danh sách ứng tuyển)
    applicant_email: Optional[str] = None
    applicant_name: Optional[str] = None
    applicant_phone: Optional[str] = None

    class Config:
        from_attributes = True


class StatusUpdateRequest(BaseModel):
    """Dữ liệu nhà tuyển dụng gửi lên để cập nhật trạng thái đơn ứng tuyển."""
    status: str   # Giá trị hợp lệ: "accepted" | "rejected"
