# =============================================================================
# routers/auth.py
# Endpoints xác thực người dùng:
#   POST /auth/register  → Đăng ký (job_seeker hoặc recruiter)
#   POST /auth/login     → Đăng nhập, trả về JWT token + thông tin user
#   GET  /auth/me        → Lấy thông tin tài khoản đang đăng nhập (cần token)
# =============================================================================

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.user import RegisterRequest, LoginRequest, RegisterResponse, LoginResponse, UserResponse, RefreshTokenRequest, RefreshTokenResponse
from app.services import auth_service
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Xác thực"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản",
)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Đăng ký tài khoản mới.
    - Chỉ cho phép role: job_seeker, recruiter
    - Admin không đăng ký qua API này
    - Password tối thiểu 6 ký tự (validate ở schema)
    - Không trả token — yêu cầu đăng nhập riêng sau khi đăng ký
    """
    return auth_service.register_user(request, db)


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Đăng nhập",
)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Đăng nhập hệ thống.
    - Kiểm tra email, password và trạng thái tài khoản
    - Trả về JWT access_token + thông tin user + role
    - Token chứa: user_id (sub), email, role
    """
    return auth_service.login_user(request, db)



@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
    summary="Làm mới access token",
)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Cấp access token mới từ refresh token còn hạn.
    - Client gửi refresh_token nhận được khi đăng nhập
    - Trả về access_token mới (refresh_token không đổi)
    - Trả 401 nếu refresh token hết hạn hoặc không hợp lệ
    """
    return auth_service.refresh_access_token(request.refresh_token, db)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Thông tin tài khoản hiện tại",
)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Lấy thông tin tài khoản đang đăng nhập.
    Yêu cầu: Bearer token hợp lệ trong header Authorization.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.name,
        "status": current_user.status,
        "created_at": current_user.created_at,
    }
