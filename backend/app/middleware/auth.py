# =============================================================================
# middleware/auth.py
# Sửa: đổi role names sang job_seeker/recruiter/admin, thêm kiểm tra user.status
#       trong get_current_user, thêm require_roles() generic để dùng linh hoạt.
# Cơ chế:
#   1. Client gửi "Authorization: Bearer <jwt_token>"
#   2. get_current_user giải mã token → lấy user từ DB → kiểm tra status
#   3. require_* dependency kiểm tra role trước khi vào handler
# =============================================================================

from typing import List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.utils.jwt import decode_access_token

# auto_error=False: let us raise 401 ourselves instead of HTTPBearer's default 403
http_bearer = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Token không hợp lệ hoặc đã hết hạn",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency xác thực: giải mã JWT → lấy user từ DB → kiểm tra status.
    Raise 401 nếu thiếu token / token không hợp lệ / user không tồn tại.
    Raise 403 nếu tài khoản bị khóa.
    """
    if credentials is None:
        raise _UNAUTHORIZED

    token = credentials.credentials

    credentials_exception = _UNAUTHORIZED

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception


    # "sub" chứa user_id dạng string (chuẩn JWT) — chuyển về int để query DB
    sub = payload.get("sub")
    if sub is None:
        raise credentials_exception
    try:
        user_id = int(sub)
    except (ValueError, TypeError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    # Luôn kiểm tra status từ DB (không tin tuyệt đối vào token)
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa hoặc vô hiệu hoá",
        )

    return user


# ---------------------------------------------------------------------------
# Dependency phân quyền cụ thể — dùng trực tiếp trong router
# ---------------------------------------------------------------------------

def require_job_seeker(current_user: User = Depends(get_current_user)) -> User:
    """Chỉ cho phép ứng viên (job_seeker) truy cập."""
    if current_user.role.name != "job_seeker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chức năng này chỉ dành cho ứng viên",
        )
    return current_user


def require_recruiter(current_user: User = Depends(get_current_user)) -> User:
    """Chỉ cho phép nhà tuyển dụng (recruiter) truy cập."""
    if current_user.role.name != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chức năng này chỉ dành cho nhà tuyển dụng",
        )
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Chỉ cho phép quản trị viên (admin) truy cập."""
    if current_user.role.name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chức năng này chỉ dành cho quản trị viên",
        )
    return current_user


def require_roles(allowed_roles: List[str]):
    """
    Dependency phân quyền generic — cho phép nhiều role cùng truy cập một endpoint.
    Cách dùng trong router:
        @router.get("/example")
        def example(user = Depends(require_roles(["admin", "recruiter"]))):
            ...
    """
    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền truy cập. Yêu cầu role: {', '.join(allowed_roles)}",
            )
        return current_user
    return _check
