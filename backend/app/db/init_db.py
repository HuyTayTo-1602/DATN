# =============================================================================
# db/init_db.py
# Mục đích: Khởi tạo cơ sở dữ liệu lần đầu (tạo bảng + seed dữ liệu mặc định).
# File này được gọi khi ứng dụng khởi động (trong main.py - startup event).
# Bao gồm:
#   - Tạo tất cả các bảng từ các Model đã định nghĩa
#   - Seed dữ liệu mặc định: các Role (jobseeker, employer, admin)
# =============================================================================

from sqlalchemy import text
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


def migrate_search_vectors() -> None:
    """
    Thêm cột search_vector vào user_profiles và cv_text nếu chưa có,
    tạo GIN index và trigger tự động cập nhật, rồi backfill dữ liệu cũ.
    Dùng IF NOT EXISTS nên an toàn khi chạy nhiều lần.
    """
    statements = [
        # user_profiles
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS search_vector tsvector",
        "CREATE INDEX IF NOT EXISTS idx_user_profiles_search_vector ON user_profiles USING GIN(search_vector)",
        """
        CREATE OR REPLACE FUNCTION update_user_profile_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.search_vector :=
            setweight(to_tsvector('simple', COALESCE(NEW.full_name, '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(NEW.skills,     '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(NEW.experience, '')), 'B');
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        """,
        "DROP TRIGGER IF EXISTS trg_user_profiles_search_vector ON user_profiles",
        """
        CREATE TRIGGER trg_user_profiles_search_vector
          BEFORE INSERT OR UPDATE ON user_profiles
          FOR EACH ROW EXECUTE FUNCTION update_user_profile_search_vector()
        """,
        """
        UPDATE user_profiles
        SET search_vector =
          setweight(to_tsvector('simple', COALESCE(full_name,  '')), 'A') ||
          setweight(to_tsvector('simple', COALESCE(skills,     '')), 'A') ||
          setweight(to_tsvector('simple', COALESCE(experience, '')), 'B')
        WHERE search_vector IS NULL
        """,
        # cv_text
        "ALTER TABLE cv_text ADD COLUMN IF NOT EXISTS search_vector tsvector",
        "CREATE INDEX IF NOT EXISTS idx_cv_text_search_vector ON cv_text USING GIN(search_vector)",
        """
        CREATE OR REPLACE FUNCTION update_cv_text_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.search_vector := to_tsvector('simple', COALESCE(NEW.extracted_text, ''));
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        """,
        "DROP TRIGGER IF EXISTS trg_cv_text_search_vector ON cv_text",
        """
        CREATE TRIGGER trg_cv_text_search_vector
          BEFORE INSERT OR UPDATE ON cv_text
          FOR EACH ROW EXECUTE FUNCTION update_cv_text_search_vector()
        """,
        """
        UPDATE cv_text
        SET search_vector = to_tsvector('simple', COALESCE(extracted_text, ''))
        WHERE search_vector IS NULL
        """,
    ]
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


def migrate_address_fields() -> None:
    """
    Thêm 3 cột địa chỉ tách (province, district, address_detail) vào
    user_profiles, companies, jobs. Dùng ADD COLUMN IF NOT EXISTS nên an
    toàn khi chạy nhiều lần (idempotent). Không đụng tới cột cũ
    address/location ở bước này.
    """
    tables = ["user_profiles", "companies", "jobs"]
    statements = []
    for table in tables:
        statements.append(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS province VARCHAR(100)"
        )
        statements.append(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS district VARCHAR(100)"
        )
        statements.append(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS address_detail VARCHAR(255)"
        )
    # jobs: thêm work_mode (onsite|hybrid|remote) và bỏ hẳn cột location cũ.
    statements.append(
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_mode VARCHAR(20) DEFAULT 'onsite'"
    )
    statements.append("ALTER TABLE jobs DROP COLUMN IF EXISTS location")
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


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


def migrate_company_unique_user() -> None:
    """
    Thêm unique constraint trên companies.user_id (quan hệ 1:1 với users).
    Dùng IF NOT EXISTS nên an toàn khi chạy nhiều lần.
    Nếu tồn tại dữ liệu trùng lặp, xóa bớt trước khi thêm constraint.
    """
    statements = [
        # Xóa các bản ghi trùng lặp, chỉ giữ lại công ty có id nhỏ nhất cho mỗi user
        """
        DELETE FROM companies
        WHERE id NOT IN (
            SELECT MIN(id) FROM companies GROUP BY user_id
        )
        """,
        # Thêm unique constraint nếu chưa có
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'uq_companies_user_id'
            ) THEN
                ALTER TABLE companies ADD CONSTRAINT uq_companies_user_id UNIQUE (user_id);
            END IF;
        END $$
        """,
    ]
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


def migrate_job_statuses() -> None:
    """
    Chuẩn hóa trạng thái job về 2 giá trị: 'active' và 'closed'.
    Các job còn ở trạng thái 'draft' (đã bỏ) được chuyển thành 'closed'.
    Dùng UPDATE có điều kiện nên an toàn khi chạy nhiều lần.
    """
    with engine.begin() as conn:
        conn.execute(text("UPDATE jobs SET status = 'closed' WHERE status = 'draft'"))


def init_db() -> None:
    """
    Hàm tổng hợp: tạo bảng, chạy migration nhỏ, và seed dữ liệu ban đầu.
    Được gọi một lần duy nhất khi ứng dụng khởi động.
    """
    create_tables()
    migrate_search_vectors()
    migrate_company_unique_user()
    migrate_job_statuses()
    migrate_address_fields()
    db = SessionLocal()
    try:
        seed_roles(db)
        seed_admin(db)
    finally:
        db.close()
