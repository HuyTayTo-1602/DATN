"""
Fix application created_at in existing seed data.

Vấn đề: seed_applications cũ không gán created_at nên mọi đơn ứng tuyển nhận
giá trị mặc định func.now() (= thời điểm chạy seed). Hệ quả: chart admin
"Xu hướng theo tuần" dồn toàn bộ lượt ứng tuyển vào tuần hiện tại (T8).

Script này rải lại created_at (và updated_at) của từng đơn ngẫu nhiên trong
khoảng [ngày job được đăng, hôm nay], để không có đơn nào ứng tuyển trước khi
job tồn tại.

Run: cd backend && python scripts/fix_application_dates.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.application import JobApplication
from app.models.job import Job
from scripts.seed.seed_utils import random_created_at


def fix_application_dates(db) -> int:
    applications = db.query(JobApplication).all()
    updated = 0
    for app in applications:
        job = db.query(Job).filter(Job.id == app.job_id).first()
        start = (
            job.created_at.date().isoformat()
            if job and job.created_at
            else "2026-01-01"
        )
        applied_at = random_created_at(start=start)
        app.created_at = applied_at
        app.updated_at = applied_at
        updated += 1
    db.commit()
    print(f"  [applications] {updated} created_at spread over [job.created_at, today]")
    return updated


def run() -> None:
    db = SessionLocal()
    try:
        print("=== Fixing application dates ===")
        fix_application_dates(db)
        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
