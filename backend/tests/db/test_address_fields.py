"""
Sprint 1 — Unit tests cho 3 cột địa chỉ tách (province, district, address_detail)
trên user_profiles, companies, jobs.

Chiến lược: tạo bản ghi tạm trong 1 transaction rồi rollback toàn bộ nên DB
không bị thay đổi. Skip nếu DB không sẵn sàng.

Run: cd backend && pytest tests/db/test_address_fields.py -v
"""
import sys
import os
import uuid

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def _db_is_available() -> bool:
    try:
        from app.db.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(not _db_is_available(), reason="Database not available")


@pytest.fixture()
def db():
    """Session bọc trong transaction — luôn rollback ở cuối để không ghi đè dữ liệu."""
    from app.db.init_db import migrate_address_fields
    from app.db.database import SessionLocal
    migrate_address_fields()  # đảm bảo cột tồn tại (idempotent)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def _make_user(db):
    from app.models.user import User, Role
    role = db.query(Role).filter(Role.name == "job_seeker").first()
    if role is None:
        role = Role(name="job_seeker")
        db.add(role)
        db.flush()
    user = User(
        email=f"addr-test-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="x",
        role_id=role.id,
        status="active",
    )
    db.add(user)
    db.flush()
    return user


def test_user_profile_address_columns_roundtrip(db):
    from app.models.profile import UserProfile
    user = _make_user(db)
    profile = UserProfile(
        user_id=user.id,
        full_name="Nguyễn Văn Test",
        province="Hà Nội",
        district="Thanh Xuân",
        address_detail="47 Nguyễn Tuân",
    )
    db.add(profile)
    db.flush()
    db.refresh(profile)
    assert profile.province == "Hà Nội"
    assert profile.district == "Thanh Xuân"
    assert profile.address_detail == "47 Nguyễn Tuân"


def test_company_address_columns_roundtrip(db):
    from app.models.company import Company
    user = _make_user(db)
    company = Company(
        user_id=user.id,
        name="Công ty Test Địa Chỉ",
        province="TP. Hồ Chí Minh",
        district="Quận 1",
        address_detail="2 Hải Triều",
    )
    db.add(company)
    db.flush()
    db.refresh(company)
    assert company.province == "TP. Hồ Chí Minh"
    assert company.district == "Quận 1"
    assert company.address_detail == "2 Hải Triều"


def test_job_address_columns_roundtrip(db):
    from app.models.company import Company
    from app.models.job import Job
    user = _make_user(db)
    company = Company(user_id=user.id, name="Công ty Job Test")
    db.add(company)
    db.flush()
    job = Job(
        company_id=company.id,
        title="Backend Developer",
        province="Đà Nẵng",
        district="Hải Châu",
        address_detail="15 Bạch Đằng",
    )
    db.add(job)
    db.flush()
    db.refresh(job)
    assert job.province == "Đà Nẵng"
    assert job.district == "Hải Châu"
    assert job.address_detail == "15 Bạch Đằng"
