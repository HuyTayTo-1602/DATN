# =============================================================================
# services/profile_service.py
# Mục đích: Xử lý nghiệp vụ cập nhật và lấy hồ sơ cá nhân của ứng viên (UC03).
# Profile được tạo tự động khi đăng ký dưới dạng rỗng.
# GET  → trả về profile hoặc None nếu chưa có
# PUT  → upsert: tạo mới nếu chưa có, cập nhật nếu đã có
# =============================================================================

from typing import Optional
from sqlalchemy.orm import Session

from app.models.profile import UserProfile
from app.models.user import User
from app.schemas.profile import ProfileUpdateRequest
from app.utils.location import join_address

# Các cột địa chỉ tách rời — khi cập nhật thì ghép lại thành `address`
_ADDRESS_PARTS = ("province", "district", "address_detail")


def get_profile(current_user: User, db: Session) -> Optional[UserProfile]:
    """Lấy hồ sơ của ứng viên hiện tại. Trả về None nếu chưa có profile."""
    return db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()


def update_profile(request: ProfileUpdateRequest, current_user: User, db: Session) -> UserProfile:
    """
    Upsert hồ sơ ứng viên (UC03):
    - Nếu chưa có profile → tạo mới
    - Nếu đã có → cập nhật các trường được gửi lên (partial update)
    """
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    data = request.model_dump(exclude_none=True)
    for field, value in data.items():
        setattr(profile, field, value)

    # Nếu có cập nhật bất kỳ cột địa chỉ tách rời → ghép lại `address` đầy đủ
    if any(part in data for part in _ADDRESS_PARTS):
        profile.address = join_address(
            profile.province, profile.district, profile.address_detail
        )

    db.commit()
    db.refresh(profile)
    return profile
