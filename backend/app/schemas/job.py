# =============================================================================
# schemas/job.py
# Mục đích: Định nghĩa Pydantic schemas cho tin tuyển dụng (Job).
# Gồm schemas cho:
#   - Tạo mới job (UC07)
#   - Cập nhật job (UC08)
#   - Phản hồi job (có kèm thông tin công ty tóm tắt)
#   - Bộ lọc tìm kiếm job (UC04)
# =============================================================================

from pydantic import BaseModel, computed_field
from datetime import date, datetime
from typing import Optional

from app.schemas.company import CompanyBriefResponse
from app.utils.location import format_job_location


class JobCreateRequest(BaseModel):
    """Dữ liệu gửi lên khi nhà tuyển dụng đăng tin mới (UC07)."""
    company_id: int                       # Recruiter chọn đúng công ty khi đăng tuyển (1:N)
    title: str
    level: Optional[str] = None           # Junior | Mid | Senior | Manager
    salary: Optional[int] = None          # Mức lương (triệu đồng), VD: 15
    work_mode: Optional[str] = None       # onsite | hybrid | remote
    province: Optional[str] = None        # Tỉnh/Thành phố
    district: Optional[str] = None        # Quận/Huyện
    address_detail: Optional[str] = None  # Số nhà + tên đường
    deadline: Optional[date] = None       # Hạn nộp hồ sơ
    description: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None


class JobUpdateRequest(BaseModel):
    """Dữ liệu gửi lên khi nhà tuyển dụng chỉnh sửa tin (UC08) - tất cả Optional."""
    title: Optional[str] = None
    level: Optional[str] = None
    salary: Optional[int] = None          # Mức lương (triệu đồng)
    work_mode: Optional[str] = None       # onsite | hybrid | remote
    province: Optional[str] = None
    district: Optional[str] = None
    address_detail: Optional[str] = None
    deadline: Optional[date] = None
    status: Optional[str] = None          # active | closed
    description: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None


class JobResponse(BaseModel):
    """Dữ liệu trả về chi tiết một tin tuyển dụng, kèm thông tin công ty."""
    id: int
    title: str
    level: Optional[str] = None
    salary: Optional[str] = None
    work_mode: Optional[str] = None
    province: Optional[str] = None
    district: Optional[str] = None
    address_detail: Optional[str] = None
    deadline: Optional[date] = None
    status: str
    description: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    company: Optional[CompanyBriefResponse] = None
    applicant_count: Optional[int] = None  # Số ứng viên, chỉ có trong /jobs/my

    @computed_field
    @property
    def location(self) -> Optional[str]:
        """Chuỗi hiển thị địa điểm (tương thích ngược FE) ghép từ địa chỉ + work_mode."""
        return format_job_location(
            self.work_mode, self.province, self.district, self.address_detail
        )

    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    """Phản hồi danh sách job có phân trang."""
    total: int              # Tổng số job thỏa điều kiện lọc
    page: int               # Trang hiện tại
    page_size: int          # Số job mỗi trang
    items: list[JobResponse]


class JobFilterParams(BaseModel):
    """Bộ tham số lọc khi tìm kiếm job (UC04) - tất cả đều tùy chọn."""
    keyword: Optional[str] = None             # Tìm theo tên job hoặc kỹ năng
    location: Optional[str] = None            # Lọc theo địa điểm (gộp - giữ tương thích ngược)
    province: Optional[str] = None            # Lọc theo tỉnh/thành phố
    district: Optional[str] = None            # Lọc theo quận/huyện
    level: Optional[str] = None               # Lọc theo cấp bậc
    salary_min: Optional[int] = None          # Lương tối thiểu (triệu đồng)
    salary_max: Optional[int] = None          # Lương tối đa (triệu đồng)
    company_name: Optional[str] = None        # Lọc theo tên công ty
    only_active_deadline: Optional[bool] = None  # True → chỉ job còn hạn nộp
    page: int = 1
    page_size: int = 10
