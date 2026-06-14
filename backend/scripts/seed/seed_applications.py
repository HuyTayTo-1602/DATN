"""
Seed applications: candidates apply to domain-matched jobs.
Logic: 70% chance to apply within own domain, 30% cross-domain.
Run standalone: cd backend && python scripts/seed/seed_applications.py
"""
import sys
import os
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.database import SessionLocal
from app.models.user import User, Role
from app.models.job import Job
from app.models.application import JobApplication
from app.models.company import Company
from scripts.seed.seed_utils import generate_cover_letter, random_created_at

APPLICATIONS_PER_CANDIDATE_MIN = 2
APPLICATIONS_PER_CANDIDATE_MAX = 7

APPLICATION_STATUSES = ["pending", "accepted", "rejected"]
STATUS_WEIGHTS = [0.55, 0.225, 0.225]


def seed_applications(
    db,
    candidates: list[dict],
    jobs_with_domain: list[dict],
) -> list[JobApplication]:
    """
    Create applications with domain-alignment logic.
    Returns list of created JobApplication objects.
    """
    # Build domain → jobs index
    domain_to_jobs: dict[str, list[dict]] = {}
    for item in jobs_with_domain:
        d = item["domain"]
        if d not in domain_to_jobs:
            domain_to_jobs[d] = []
        domain_to_jobs[d].append(item)

    all_jobs = jobs_with_domain  # fallback for cross-domain

    # Pre-fetch existing (user_id, job_id) pairs to avoid unique constraint errors
    existing_pairs: set[tuple[int, int]] = {
        (row[0], row[1])
        for row in db.query(JobApplication.user_id, JobApplication.job_id).all()
    }

    created_applications: list[JobApplication] = []
    total_created = 0

    for candidate in candidates:
        user = candidate["user"]
        domain = candidate["domain"]
        profile = candidate.get("profile")
        full_name = profile.full_name if profile else "Ứng viên"

        n_apply = random.randint(APPLICATIONS_PER_CANDIDATE_MIN, APPLICATIONS_PER_CANDIDATE_MAX)

        # Build pool: 70% from same domain, 30% random
        same_domain_jobs = domain_to_jobs.get(domain, [])
        n_same = max(1, int(n_apply * 0.70))
        n_cross = n_apply - n_same

        candidate_jobs: list[dict] = []
        if same_domain_jobs:
            candidate_jobs.extend(random.sample(same_domain_jobs, min(n_same, len(same_domain_jobs))))
        if all_jobs and n_cross > 0:
            cross_pool = [j for j in all_jobs if j not in candidate_jobs]
            candidate_jobs.extend(random.sample(cross_pool, min(n_cross, len(cross_pool))))

        # Shuffle to avoid ordering patterns
        random.shuffle(candidate_jobs)

        for job_item in candidate_jobs:
            job: Job = job_item["job"]
            pair = (user.id, job.id)
            if pair in existing_pairs:
                continue

            status = random.choices(APPLICATION_STATUSES, weights=STATUS_WEIGHTS, k=1)[0]
            cover_letter = generate_cover_letter(full_name, domain, job.title)

            # created_at rải đều từ ngày job được đăng → hôm nay (không ứng tuyển
            # trước khi job tồn tại). Nếu thiếu, mọi đơn sẽ dồn vào thời điểm chạy
            # seed (func.now()) làm chart "Xu hướng theo tuần" dồn hết vào tuần cuối.
            applied_at = random_created_at(
                start=job.created_at.date().isoformat() if job.created_at else "2026-01-01"
            )

            application = JobApplication(
                job_id=job.id,
                user_id=user.id,
                status=status,
                cover_letter=cover_letter,
                cv_url=None,
                created_at=applied_at,
                updated_at=applied_at,
            )
            db.add(application)
            existing_pairs.add(pair)
            created_applications.append(application)
            total_created += 1

        if total_created % 100 == 0 and total_created > 0:
            db.commit()
            print(f"    ... {total_created} applications created so far")

    db.commit()
    # Refresh IDs
    for app in created_applications:
        try:
            db.refresh(app)
        except Exception:
            pass

    print(f"  [applications] {total_created} created")
    return created_applications


def _load_existing(db) -> tuple[list[dict], list[dict]]:
    """Load candidates and jobs from DB when running standalone."""
    from app.models.profile import UserProfile
    from app.models.company import Company
    from scripts.seed.seed_utils import load_json

    company_templates = load_json("company_templates.json")
    domain_by_name = {t["name"]: t["domain"] for t in company_templates}

    recruiter_role = db.query(Role).filter(Role.name == "recruiter").first()
    seeker_role = db.query(Role).filter(Role.name == "job_seeker").first()
    if not seeker_role or not recruiter_role:
        raise RuntimeError("Roles not found. Run seed_base_data first.")

    users = db.query(User).filter(User.role_id == seeker_role.id).all()
    candidates = []
    for u in users:
        profile = u.profile
        skills_str = profile.skills if profile and profile.skills else ""
        from scripts.seed.seed_candidates import _guess_domain
        domain = _guess_domain(skills_str)
        candidates.append({
            "user": u,
            "profile": profile,
            "domain": domain,
            "skills": [s.strip() for s in skills_str.split(",") if s.strip()],
            "level": "Middle",
        })

    jobs = db.query(Job).all()
    jobs_with_domain = []
    for job in jobs:
        company = db.query(Company).filter(Company.id == job.company_id).first()
        domain = "backend"
        if company:
            for name, d in domain_by_name.items():
                if name.lower() in (company.name or "").lower():
                    domain = d
                    break
        jobs_with_domain.append({"job": job, "domain": domain, "company_id": job.company_id})

    return candidates, jobs_with_domain


def run(db=None, candidates: list[dict] = None, jobs_with_domain: list[dict] = None) -> list:
    """Main entry point."""
    close_db = db is None
    if close_db:
        db = SessionLocal()
    try:
        print("=== Seeding applications ===")
        if candidates is None or jobs_with_domain is None:
            candidates, jobs_with_domain = _load_existing(db)
        return seed_applications(db, candidates, jobs_with_domain)
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    apps = run()
    print(f"Done. Applications ready: {len(apps)}")
    by_status: dict[str, int] = {}
    for a in apps:
        s = a.status
        by_status[s] = by_status.get(s, 0) + 1
    print("By status:", by_status)
