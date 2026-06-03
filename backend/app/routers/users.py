# =============================================================================
# routers/users.py
# Mục đích: Định nghĩa các endpoint quản lý hồ sơ cá nhân của ứng viên.
# Endpoints:
#   GET  /users/profile      → Lấy hồ sơ cá nhân (UC03), trả None nếu chưa có
#   PUT  /users/profile      → Upsert hồ sơ cá nhân (UC03)
# Yêu cầu xác thực: phải là ứng viên (job_seeker)
# =============================================================================

from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.profile import ProfileUpdateRequest, ProfileResponse
from app.services import profile_service
from app.middleware.auth import require_job_seeker
from app.models.user import User

router = APIRouter(prefix="/users", tags=["Ứng viên - Hồ sơ cá nhân"])


@router.get("/profile", response_model=Optional[ProfileResponse])
def get_profile(
    current_user: User = Depends(require_job_seeker),
    db: Session = Depends(get_db),
):
    """Lấy hồ sơ cá nhân của ứng viên hiện tại. Trả về null nếu chưa có."""
    return profile_service.get_profile(current_user, db)


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    request: ProfileUpdateRequest,
    current_user: User = Depends(require_job_seeker),
    db: Session = Depends(get_db),
):
    """Upsert hồ sơ cá nhân: tạo mới nếu chưa có, cập nhật nếu đã có (UC03)."""
    return profile_service.update_profile(request, current_user, db)
