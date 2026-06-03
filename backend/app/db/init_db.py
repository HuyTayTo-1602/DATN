# =============================================================================
# db/init_db.py
# Mục đích: Khởi tạo cơ sở dữ liệu lần đầu (tạo bảng + seed dữ liệu mặc định).
# File này được gọi khi ứng dụng khởi động (trong main.py - startup event).
# Bao gồm:
#   - Tạo tất cả các bảng từ các Model đã định nghĩa
#   - Seed dữ liệu mặc định: các Role (jobseeker, employer, admin)
# =============================================================================

from sqlalchemy.orm import Session

from app.db.database import engine, Base, SessionLocal
from app.models.user import Role, User
from app.models.candidate_cv import CandidateCV  # noqa: F401 – ensure table registered
from app.models.cv_text import CVText  # noqa: F401 – ensure table registered
from app.models.notification import Notification  # noqa: F401 – ensure table registered
from app.utils.hashing import hash_password


def create_tables() -> None:
    """
    Tạo tất cả các bảng trong database dựa trên metadata của Base.
    Chỉ tạo bảng nếu chưa tồn tại (checkfirst=True mặc định trong create_all).
    Trong production nên dùng Alembic migrations thay vì hàm này.
    """
    Base.metadata.create_all(bind=engine)


def seed_roles(db: Session) -> None:
    """
    Tạo các role mặc định nếu chưa tồn tại.
    Hệ thống có 3 vai trò:
      - job_seeker: Ứng viên tìm việc
      - recruiter:  Nhà tuyển dụng
      - admin:      Quản trị viên hệ thống
    """
    default_roles = ["job_seeker", "recruiter", "admin"]
    for role_name in default_roles:
        existing = db.query(Role).filter(Role.name == role_name).first()
        if not existing:
            db.add(Role(name=role_name))
    db.commit()


def seed_admin(db: Session) -> None:
    """
    Tạo tài khoản admin mặc định nếu chưa tồn tại.
    Admin KHÔNG đăng ký qua public API, chỉ tồn tại qua seed này.
    Email/password mặc định chỉ dùng cho development — đổi trong production.
    """
    admin_email = "admin@jobcv.vn"
    existing = db.query(User).filter(User.email == admin_email).first()
    if existing:
        return

    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        return

    db.add(User(
        email=admin_email,
        password_hash=hash_password("Admin@123456"),
        role_id=admin_role.id,
        status="active",
    ))
    db.commit()


def init_db() -> None:
    """
    Hàm tổng hợp: tạo bảng và seed dữ liệu ban đầu.
    Được gọi một lần duy nhất khi ứng dụng khởi động.
    """
    create_tables()
    db = SessionLocal()
    try:
        seed_roles(db)
        seed_admin(db)
    finally:
        db.close()
