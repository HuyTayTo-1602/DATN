"""
Master seed script: runs all seeds in dependency order.

Usage:
  cd backend
  python scripts/seed/run_full_seed.py           # seed only (idempotent)
  python scripts/seed/run_full_seed.py --truncate # truncate then re-seed
  python scripts/seed/run_full_seed.py --truncate --yes  # skip confirmation
"""
import sys
import os
import time
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.database import SessionLocal, engine, Base
from app.models import user as _user_models  # noqa: F401
from app.models import company as _company_models  # noqa: F401
from app.models import job as _job_models  # noqa: F401
from app.models import application as _app_models  # noqa: F401
from app.models import profile as _profile_models  # noqa: F401
from app.models import candidate_cv as _cv_models  # noqa: F401
from app.models import cv_text as _cvtext_models  # noqa: F401
from app.models import notification as _notif_models  # noqa: F401

from scripts.seed import seed_base_data
from scripts.seed import seed_companies
from scripts.seed import seed_jobs
from scripts.seed import seed_candidates
from scripts.seed import seed_applications
from scripts.seed import seed_notifications


# Tables in safe truncation order (child before parent)
TRUNCATE_ORDER = [
    "notifications",
    "job_applications",
    "cv_text",
    "candidate_cvs",
    "user_profiles",
    "jobs",
    "companies",
    "users",
    "roles",
]


def truncate_all(db) -> None:
    """Truncate all seed tables in correct FK order."""
    print("Truncating tables...")
    conn = db.connection()
    for table in TRUNCATE_ORDER:
        try:
            conn.execute(
                __import__("sqlalchemy", fromlist=["text"]).text(
                    f'TRUNCATE TABLE "{table}" CASCADE'
                )
            )
            print(f"  truncated: {table}")
        except Exception as e:
            print(f"  WARNING: could not truncate {table}: {e}")
    db.commit()
    print("Truncation complete.\n")


def ensure_tables() -> None:
    """Create tables if they don't exist (calls init_db internals)."""
    Base.metadata.create_all(bind=engine)


def run_seed(truncate: bool = False, skip_confirm: bool = False) -> None:
    t_start = time.time()

    ensure_tables()

    db = SessionLocal()
    try:
        if truncate:
            if not skip_confirm:
                answer = input(
                    "WARNING: This will DELETE all existing seed data. Type 'yes' to confirm: "
                )
                if answer.strip().lower() != "yes":
                    print("Aborted.")
                    return
            truncate_all(db)

        print("\n" + "=" * 55)
        print("  FULL SEED START")
        print("=" * 55 + "\n")

        # 1. Base data (roles + users)
        base_result = seed_base_data.run(db)
        roles = base_result["roles"]
        recruiters = base_result["recruiters"]

        # 2. Companies
        companies_with_domain = seed_companies.run(db, recruiters)

        # 3. Jobs
        jobs_with_domain = seed_jobs.run(db, companies_with_domain)

        # 4. Candidates
        candidates = seed_candidates.run(db, roles)

        # 5. Applications
        applications = seed_applications.run(db, candidates, jobs_with_domain)

        # 6. Notifications
        seed_notifications.run(db, applications)

        # Summary
        elapsed = time.time() - t_start
        print("\n" + "=" * 55)
        print("  SEED COMPLETE")
        print("=" * 55)
        print(f"  Elapsed: {elapsed:.1f}s")

        # Count summary
        from sqlalchemy import text
        counts = {
            "roles": db.execute(text("SELECT COUNT(*) FROM roles")).scalar(),
            "users": db.execute(text("SELECT COUNT(*) FROM users")).scalar(),
            "companies": db.execute(text("SELECT COUNT(*) FROM companies")).scalar(),
            "jobs": db.execute(text("SELECT COUNT(*) FROM jobs")).scalar(),
            "user_profiles": db.execute(text("SELECT COUNT(*) FROM user_profiles")).scalar(),
            "candidate_cvs": db.execute(text("SELECT COUNT(*) FROM candidate_cvs")).scalar(),
            "cv_text": db.execute(text("SELECT COUNT(*) FROM cv_text")).scalar(),
            "job_applications": db.execute(text("SELECT COUNT(*) FROM job_applications")).scalar(),
            "notifications": db.execute(text("SELECT COUNT(*) FROM notifications")).scalar(),
        }
        print("\n  Database row counts:")
        for table, count in counts.items():
            print(f"    {table:<22} {count:>6}")
        print()

    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run full database seed")
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Truncate all data before seeding (clean re-seed)",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip truncation confirmation prompt",
    )
    args = parser.parse_args()
    run_seed(truncate=args.truncate, skip_confirm=args.yes)


if __name__ == "__main__":
    main()
