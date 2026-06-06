"""
Fix two issues in existing seed data:
  1. Update all company logo_urls to use UI Avatars (always loads, no external dependency)
  2. Update all job deadlines to be after October 2026

Run: cd backend && python scripts/fix_logos_and_deadlines.py
"""
import sys
import os
import random
from datetime import date, timedelta
from urllib.parse import quote_plus

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.company import Company
from app.models.job import Job

# Consistent color palette for company avatars
PALETTE = [
    "2563EB",  # blue      – tech / backend
    "16A34A",  # green     – healthcare / education
    "1E3A8A",  # navy      – finance / banking
    "7C3AED",  # purple    – creative / media
    "EA580C",  # orange    – fnb / hospitality
    "DC2626",  # red       – retail / fmcg
    "D97706",  # amber     – logistics / transport
    "0891B2",  # cyan      – hr / consulting
    "92400E",  # brown     – construction / real estate
    "374151",  # slate     – manufacturing / industry
    "BE185D",  # rose      – marketing / pr
    "065F46",  # emerald   – data / analytics
]


def _color_for(name: str) -> str:
    """Return a consistent hex color for a company name."""
    idx = sum(ord(c) for c in name) % len(PALETTE)
    return PALETTE[idx]


def make_ui_avatar(name: str) -> str:
    """Generate a UI Avatars URL for a company name."""
    # Use at most 2 words (first + last initial) so the avatar looks clean
    parts = name.split()
    initials = "+".join(p[:1] for p in parts[:2] if p)
    display = quote_plus(name[:30])
    color = _color_for(name)
    return (
        f"https://ui-avatars.com/api/"
        f"?name={display}"
        f"&size=200"
        f"&background={color}"
        f"&color=fff"
        f"&bold=true"
    )


# After-September-2026 deadline range
DEADLINE_MIN = date(2026, 10, 1)
DEADLINE_MAX = date(2027, 6, 30)


def random_deadline() -> date:
    delta = (DEADLINE_MAX - DEADLINE_MIN).days
    return DEADLINE_MIN + timedelta(days=random.randint(0, delta))


def fix_logos(db) -> int:
    companies = db.query(Company).all()
    updated = 0
    for c in companies:
        new_url = make_ui_avatar(c.name)
        if c.logo_url != new_url:
            c.logo_url = new_url
            updated += 1
    db.commit()
    print(f"  [logos] {updated} companies updated")
    return updated


def fix_deadlines(db) -> int:
    active_jobs = db.query(Job).filter(Job.status.in_(["active", "draft"])).all()
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
