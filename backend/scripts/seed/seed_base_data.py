"""
Seed base data: roles, admin user, recruiter users.
Run standalone: cd backend && python scripts/seed/seed_base_data.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.database import SessionLocal
from app.models.user import Role, User
from app.utils.hashing import hash_password

RECRUITER_COUNT = 70


def seed_roles(db) -> dict:
    """Upsert the 3 system roles. Returns {role_name: Role}."""
    roles = {}
    for name in ["job_seeker", "recruiter", "admin"]:
        role = db.query(Role).filter(Role.name == name).first()
        if not role:
            role = Role(name=name)
            db.add(role)
            db.flush()
        roles[name] = role
    db.commit()
    print(f"  [roles] {len(roles)} roles ensured")
    return roles


def seed_admin_user(db, roles: dict) -> User:
    """Create admin user if not exists."""
    admin_email = "admin@jobcv.vn"
    user = db.query(User).filter(User.email == admin_email).first()
    if not user:
        user = User(
            email=admin_email,
            password_hash=hash_password("Admin@123456"),
            role_id=roles["admin"].id,
            status="active",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"  [admin] created: {admin_email}")
    else:
        print(f"  [admin] already exists: {admin_email}")
    return user


def seed_recruiter_users(db, roles: dict, count: int = RECRUITER_COUNT) -> list:
    """Create recruiter users (idempotent — skips existing emails)."""
    existing_emails = {
        row[0]
        for row in db.query(User.email).filter(User.role_id == roles["recruiter"].id).all()
    }

    new_users: list[User] = []
    for i in range(1, count + 1):
        email = f"recruiter{i:03d}@company.vn"
        if email in existing_emails:
            continue
        u = User(
            email=email,
            password_hash=hash_password("Recruiter@123"),
            role_id=roles["recruiter"].id,
            status="active",
        )
        db.add(u)
        new_users.append(u)

    if new_users:
        db.flush()
        db.commit()

    # Reload all recruiters (created + pre-existing)
    all_recruiters = (
        db.query(User)
        .filter(User.role_id == roles["recruiter"].id)
        .order_by(User.id)
        .all()
    )
    print(f"  [recruiters] {len(new_users)} created, {len(all_recruiters)} total")
    return all_recruiters


def run(db=None) -> dict:
    """Main entry point. Returns {roles, admin, recruiters}."""
    close_db = db is None
    if close_db:
        db = SessionLocal()
    try:
        print("=== Seeding base data ===")
        roles = seed_roles(db)
        admin = seed_admin_user(db, roles)
        recruiters = seed_recruiter_users(db, roles)
        return {"roles": roles, "admin": admin, "recruiters": recruiters}
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    result = run()
    print(f"Done. Recruiters ready: {len(result['recruiters'])}")
