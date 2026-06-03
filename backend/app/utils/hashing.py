# =============================================================================
# utils/hashing.py
# Mục đích: Cung cấp các hàm tiện ích để mã hóa và xác minh mật khẩu.
# Sử dụng thư viện passlib với thuật toán bcrypt - tiêu chuẩn bảo mật hiện đại.
# Mật khẩu người dùng KHÔNG BAO GIỜ được lưu dạng plain text trong database,
# mà phải được hash trước khi lưu và verify khi đăng nhập.
# =============================================================================

import bcrypt


def hash_password(plain_password: str) -> str:
    """
    Nhận mật khẩu gốc (plain text) và trả về chuỗi đã hash bằng bcrypt.
    Kết quả thay đổi mỗi lần gọi do salt ngẫu nhiên.
    Dùng khi: đăng ký tài khoản, đổi mật khẩu.
    """
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    So sánh mật khẩu người dùng nhập với chuỗi hash đã lưu trong DB.
    Trả về True nếu khớp, False nếu sai.
    Dùng khi: đăng nhập.
    """
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
