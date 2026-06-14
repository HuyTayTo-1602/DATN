"""
Fix two issues in existing seed data:
  1. Clear external/broken company logo_urls so the UI renders first-letter avatars
  2. Update all job deadlines to be after October 2026

Run: cd backend && python scripts/fix_logos_and_deadlines.py
"""
import sys
import os
import random
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.company import Company
from app.models.job import Job


# After-September-2026 deadline range
DEADLINE_MIN = date(2026, 10, 1)
DEADLINE_MAX = date(2027, 6, 30)


def random_deadline() -> date:
    delta = (DEADLINE_MAX - DEADLINE_MIN).days
    return DEADLINE_MIN + timedelta(days=random.randint(0, delta))


def fix_logos(db) -> int:
    """Clear external/broken logo URLs so the UI renders a first-letter avatar.

    Previous seed data pointed logo_url at external services (clearbit /
    ui-avatars) that no longer load, leaving blank boxes. We null them out and
    let the frontend draw the company's initial instead — no external deps.
    """
    companies = db.query(Company).filter(Company.logo_url.isnot(None)).all()
    updated = 0
    for c in companies:
        c.logo_url = None
        updated += 1
    db.commit()
    print(f"  [logos] {updated} companies cleared (UI shows first-letter avatar)")
    return updated


def fix_deadlines(db) -> int:
    active_jobs = db.query(Job).filter(Job.status == "active").all()
    updated = 0
    for job in active_jobs:
        new_deadline = random_deadline()
        if job.deadline != new_deadline:
            job.deadline = new_deadline
            updated += 1
    db.commit()
    print(f"  [deadlines] {updated} jobs updated (all after 2026-10-01)")
    return updated


def run() -> None:
    db = SessionLocal()
    try:
        print("=== Fixing logos and deadlines ===")
        fix_logos(db)
        fix_deadlines(db)
        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
