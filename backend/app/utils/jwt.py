# =============================================================================
# utils/jwt.py
# Mục đích: Cung cấp các hàm tạo và giải mã JWT (JSON Web Token).
# Có hai loại token:
#   - Access token:  tồn tại ngắn (30 phút), dùng để xác thực mỗi request
#   - Refresh token: tồn tại dài (7 ngày), dùng để lấy access token mới
# Phân biệt bằng claim "type": "access" | "refresh"
# =============================================================================

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt, JWTError

from app.config import get_settings

settings = get_settings()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Tạo JWT access token từ payload data.
    Args:
        data: Dict chứa thông tin cần mã hóa.
              Phải có tối thiểu: {"sub": user_id, "role": role_name, "email": email}
        expires_delta: Thời gian sống của token (mặc định lấy từ config)
    Returns:
        Chuỗi JWT đã được ký bằng SECRET_KEY
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Tạo JWT refresh token.
    Chỉ chứa "sub" (user_id) và "type": "refresh" — không chứa role/email
    để giảm thiểu thông tin lộ nếu token bị đánh cắp.
    """
    to_encode = {"sub": data["sub"]}
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Giải mã và xác minh JWT access token.
    Returns:
        Dictionary payload nếu token hợp lệ, chưa hết hạn, và không phải refresh token.
        None nếu token không hợp lệ hoặc hết hạn.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        # Chặn refresh token bị dùng làm access token, nhưng chấp nhận token cũ không có claim type
        if payload.get("type") == "refresh":
            return None
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[dict]:
    """
    Giải mã và xác minh JWT refresh token.
    Returns:
        Dictionary payload nếu token hợp lệ, chưa hết hạn, và đúng type.
        None nếu không hợp lệ.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None
