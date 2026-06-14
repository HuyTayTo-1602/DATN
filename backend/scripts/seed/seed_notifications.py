"""
Seed notifications: generate realistic notifications based on application statuses.
Run standalone: cd backend && python scripts/seed/seed_notifications.py
"""
import sys
import os
import random
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.database import SessionLocal
from app.models.notification import Notification
from app.models.application import JobApplication
from app.models.job import Job
from app.models.company import Company
from app.models.user import User, Role
from app.utils.location import format_job_location

# Probability that a notification has been read
READ_PROBABILITY = 0.55


def _random_created_at(days_back_max: int = 60) -> datetime:
    delta = timedelta(
        days=random.randint(0, days_back_max),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )
    return datetime.now(timezone.utc) - delta


def _notification_for_submission(application: JobApplication, job: Job, company: Company) -> dict:
    return {
        "user_id": application.user_id,
        "type": "application_submitted",
        "title": "Đã nộp đơn ứng tuyển thành công",
        "message": (
            f"Đơn ứng tuyển của bạn cho vị trí '{job.title}' tại {company.name} "
            f"đã được gửi thành công. Nhà tuyển dụng sẽ xem xét và phản hồi sớm nhất có thể."
        ),
        "related_id": application.id,
        "related_type": "job_application",
    }


def _notification_for_accepted(application: JobApplication, job: Job, company: Company) -> dict:
    return {
        "user_id": application.user_id,
        "type": "application_accepted",
        "title": "Chúc mừng! Hồ sơ của bạn được chấp nhận",
        "message": (
            f"Tin vui! {company.name} đã chấp nhận hồ sơ ứng tuyển vị trí '{job.title}' của bạn. "
            f"Vui lòng kiểm tra email để nhận thông tin phỏng vấn và các bước tiếp theo."
        ),
        "related_id": application.id,
        "related_type": "job_application",
    }


def _notification_for_rejected(application: JobApplication, job: Job, company: Company) -> dict:
    return {
        "user_id": application.user_id,
        "type": "application_rejected",
        "title": "Kết quả ứng tuyển",
        "message": (
            f"Cảm ơn bạn đã ứng tuyển vào vị trí '{job.title}' tại {company.name}. "
            f"Sau khi xem xét kỹ lưỡng, chúng tôi rất tiếc phải thông báo rằng hồ sơ của bạn "
            f"chưa phù hợp với yêu cầu hiện tại. Chúc bạn may mắn trong tương lai."
        ),
        "related_id": application.id,
        "related_type": "job_application",
    }


def _job_recommendation_notification(user_id: int, job: Job, company: Company) -> dict:
    return {
        "user_id": user_id,
        "type": "job_recommendation",
        "title": "Việc làm phù hợp với bạn",
        "message": (
            f"Dựa trên hồ sơ của bạn, chúng tôi gợi ý vị trí '{job.title}' tại {company.name}. "
            f"Mức lương: {job.salary}. Địa điểm: {format_job_location(job.work_mode, job.province, job.district, job.address_detail)}. Hãy ứng tuyển ngay hôm nay!"
        ),
        "related_id": job.id,
        "related_type": "job",
    }


def seed_notifications(
    db,
    applications: list[JobApplication],
) -> int:
    """
    Create notifications for each application based on its status.
    Also creates job recommendation notifications for some candidates.
    Returns number of notifications created.
    """
    existing_notif_keys: set[tuple] = {
        (row[0], row[1], row[2])
        for row in db.query(
            Notification.user_id, Notification.type, Notification.related_id
        ).all()
    }

    # Cache jobs and companies
    job_cache: dict[int, Job] = {}
    company_cache: dict[int, Company] = {}

    def get_job(job_id: int) -> Job | None:
        if job_id not in job_cache:
            job_cache[job_id] = db.query(Job).filter(Job.id == job_id).first()
        return job_cache[job_id]

    def get_company(company_id: int) -> Company | None:
        if company_id not in company_cache:
            company_cache[company_id] = db.query(Company).filter(Company.id == company_id).first()
        return company_cache[company_id]

    notif_specs: list[dict] = []

    for application in applications:
        job = get_job(application.job_id)
        if not job:
            continue
        company = get_company(job.company_id)
        if not company:
            continue

        # Always: submission notification
        notif_specs.append(_notification_for_submission(application, job, company))

        # Status-based notifications
        if application.status == "accepted":
            notif_specs.append(_notification_for_accepted(application, job, company))
        elif application.status == "rejected":
            notif_specs.append(_notification_for_rejected(application, job, company))

    # Add some job recommendation notifications (1 per 3 candidates)
    seeker_role = db.query(Role).filter(Role.name == "job_seeker").first()
    if seeker_role:
        candidates_sample = (
            db.query(User)
            .filter(User.role_id == seeker_role.id)
            .order_by(User.id)
            .all()
        )
        active_jobs = db.query(Job).filter(Job.status == "active").limit(200).all()
        for user in candidates_sample[::3]:  # every 3rd candidate
            if active_jobs:
                job = random.choice(active_jobs)
                company = get_company(job.company_id)
                if company:
                    notif_specs.append(_job_recommendation_notification(user.id, job, company))

    # Persist notifications
    created = 0
    for spec in notif_specs:
        key = (spec["user_id"], spec["type"], spec.get("related_id"))
        if key in existing_notif_keys:
            continue

        is_read = random.random() < READ_PROBABILITY
        created_at = _random_created_at(60)
        read_at = created_at + timedelta(hours=random.randint(1, 72)) if is_read else None

        notif = Notification(
            user_id=spec["user_id"],
            type=spec["type"],
            title=spec["title"],
            message=spec["message"],
            is_read=is_read,
            read_at=read_at,
            related_id=spec.get("related_id"),
            related_type=spec.get("related_type"),
        )
        db.add(notif)
        existing_notif_keys.add(key)
        created += 1

        if created % 200 == 0:
            db.commit()

    db.commit()
    print(f"  [notifications] {created} created")
    return created


def run(db=None, applications: list = None) -> int:
    """Main entry point."""
    close_db = db is None
    if close_db:
        db = SessionLocal()
    try:
        print("=== Seeding notifications ===")
        if applications is None:
            applications = db.query(JobApplication).all()
        return seed_notifications(db, applications)
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    count = run()
    print(f"Done. Notifications created: {count}")
