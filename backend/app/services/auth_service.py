# =============================================================================
# services/auth_service.py
# Sửa: đổi role names (job_seeker, recruiter), bỏ auto-tạo company khi recruiter
#       đăng ký, thêm kiểm tra user.status khi đăng nhập, thêm email vào JWT payload.
# =============================================================================

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User, Role
from app.models.profile import UserProfile
from app.schemas.user import RegisterRequest, LoginRequest
from app.utils.hashing import hash_password, verify_password
from app.utils.jwt import create_access_token, create_refresh_token, decode_refresh_token

# Các role được phép đăng ký qua public API (admin không được đăng ký công khai)
PUBLIC_REGISTER_ROLES = {"job_seeker", "recruiter"}


def _build_user_response(user: User) -> dict:
    """
    Chuyển SQLAlchemy User object thành dict phù hợp với UserResponse schema.
    Dùng chung cho cả register và login để tránh lặp code.
    """
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.name,
        "status": user.status,
        "created_at": user.created_at,
    }


def register_user(request: RegisterRequest, db: Session) -> dict:
    """
    Xử lý đăng ký tài khoản mới.
    Luồng:
      1. Validator ở schema đã chặn role admin và password yếu
      2. Kiểm tra email trùng
      3. Tìm role trong DB
      4. Tạo user với status='active'
      5. Nếu là job_seeker → tạo profile rỗng
      6. recruiter KHÔNG tạo company tự động (recruiter tự tạo sau)
    Returns:
        dict {"message": ..., "user": UserResponse}
    """
    # Kiểm tra email đã tồn tại chưa
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được sử dụng",
        )

    # Lấy role từ DB — đảm bảo tên role khớp với bảng roles
    role = db.query(Role).filter(Role.name == request.role).first()
    if not role:
        # Trường hợp role hợp lệ về format nhưng chưa có trong DB (hiếm)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vai trò '{request.role}' chưa được cấu hình trong hệ thống",
        )

    # Tạo user mới
    new_user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        role_id=role.id,
        status="active",
    )
    db.add(new_user)
    db.flush()  # Lấy new_user.id trước khi commit

    # Tự động tạo profile rỗng cho job_seeker
    if request.role == "job_seeker":
        db.add(UserProfile(user_id=new_user.id))

    # recruiter KHÔNG tự tạo company — recruiter tự tạo qua /companies

    db.commit()
    db.refresh(new_user)

    return {
        "message": "Đăng ký tài khoản thành công",
        "user": _build_user_response(new_user),
    }


def login_user(request: LoginRequest, db: Session) -> dict:
    """
    Xử lý đăng nhập: xác minh thông tin, kiểm tra status, tạo JWT token.
    Luồng:
      1. Tìm user theo email
      2. Xác minh password
      3. Kiểm tra status (từ chối nếu bị khóa)
      4. Tạo JWT chứa user_id, email, role
    Returns:
        dict {"access_token": ..., "token_type": ..., "user": UserResponse}
    Raises:
        401: Email/password sai (thông báo chung, không tiết lộ email có tồn tại không)
        403: Tài khoản bị khóa/vô hiệu hoá
    """
    user = db.query(User).filter(User.email == request.email).first()

    # Thông báo chung để tránh user enumeration attack
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
        )

    # Kiểm tra trạng thái tài khoản SAU KHI đã xác minh mật khẩu
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa hoặc vô hiệu hoá. Vui lòng liên hệ quản trị viên.",
        )

    token_data = {
        "sub": str(user.id),   # subject: user ID dạng string (chuẩn JWT RFC 7519)
        "email": user.email,
        "role": user.role.name,
    }

    return {
        "access_token": create_access_token(data=token_data),
        "refresh_token": create_refresh_token(data=token_data),
        "token_type": "bearer",
        "user": _build_user_response(user),
    }


def refresh_access_token(refresh_token: str, db: Session) -> dict:
    """
    Cấp access token mới từ refresh token hợp lệ.
    Raises:
        401: Refresh token không hợp lệ hoặc đã hết hạn
        403: Tài khoản bị khóa
    """
    payload = decode_refresh_token(refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token không hợp lệ hoặc đã hết hạn",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token không hợp lệ hoặc đã hết hạn",
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa hoặc vô hiệu hoá",
        )

    new_access_token = create_access_token(data={
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.name,
    })

    return {"access_token": new_access_token, "token_type": "bearer"}
