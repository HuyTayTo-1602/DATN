"""
Seed jobs: 8-15 jobs per company matching the company domain.
Run standalone: cd backend && python scripts/seed/seed_jobs.py
"""
import sys
import os
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.database import SessionLocal
from app.models.company import Company
from app.models.job import Job
from scripts.seed.seed_utils import (
    load_json,
    LOCATIONS,
    random_future_date,
    random_past_date,
)

LEVELS = ["Fresher", "Junior", "Mid", "Senior", "Manager"]
LEVEL_WEIGHTS = [0.08, 0.27, 0.38, 0.18, 0.09]

JOBS_PER_COMPANY_MIN = 8
JOBS_PER_COMPANY_MAX = 15

# Domains that are acceptable as "adjacent" to try if primary domain missing
DOMAIN_FALLBACK = {
    "backend": "backend",
    "frontend": "frontend",
    "data": "data",
    "devops": "devops",
    "qa": "qa",
    "mobile": "mobile",
    "ba": "ba",
    "healthcare": "healthcare",
    "finance": "finance",
    "marketing": "marketing",
    "hr": "hr",
    "education": "education",
    "fnb": "fnb",
    "retail": "retail",
    "construction": "construction",
    "logistics": "logistics",
    "manufacturing": "manufacturing",
}


def seed_jobs(db, companies_with_domain: list[dict]) -> list[dict]:
    """
    Create jobs for each company.
    Returns list of {job: Job, domain: str, company_id: int}.
    Skips companies that already have >= JOBS_PER_COMPANY_MIN jobs.
    """
    templates: dict = load_json("job_templates.json")

    existing_counts: dict[int, int] = {}
    for row in db.query(Job.company_id).all():
        existing_counts[row[0]] = existing_counts.get(row[0], 0) + 1

    result: list[dict] = []
    total_created = 0

    for item in companies_with_domain:
        company: Company = item["company"]
        domain: str = item["domain"]
        fallback_domain = DOMAIN_FALLBACK.get(domain, "backend")
        domain_templates = templates.get(fallback_domain, templates["backend"])

        if existing_counts.get(company.id, 0) >= JOBS_PER_COMPANY_MIN:
            existing_jobs = db.query(Job).filter(Job.company_id == company.id).all()
            for job in existing_jobs:
                result.append({"job": job, "domain": domain, "company_id": company.id})
            continue

        n_jobs = random.randint(JOBS_PER_COMPANY_MIN, JOBS_PER_COMPANY_MAX)
        company_location = company.address.split(",")[-1].strip() if company.address else "Hà Nội"
        # Normalize location
        if "Hồ Chí Minh" in company_location or "HCM" in company_location:
            base_location = "TP. Hồ Chí Minh"
        elif "Đà Nẵng" in company_location:
            base_location = "Đà Nẵng"
        else:
            base_location = "Hà Nội"

        for _ in range(n_jobs):
            level = random.choices(LEVELS, weights=LEVEL_WEIGHTS, k=1)[0]
            level_templates = domain_templates.get(level, domain_templates.get("Middle", []))
            if not level_templates:
                continue
            tmpl = random.choice(level_templates)

            # Occasionally allow remote or hybrid location
            loc_variant = random.choices(
                [base_location, f"{base_location} (Hybrid)", "Remote"],
                weights=[0.6, 0.25, 0.15],
                k=1,
            )[0]

            status = random.choices(
                ["active", "active", "active", "closed", "draft"],
                weights=[0.60, 0.15, 0.10, 0.10, 0.05],
                k=1,
            )[0]

            # All active/draft jobs must have deadlines after September 2026
            deadline = random_future_date(120, 365) if status in ("active", "draft") else random_past_date(1, 60)

            job = Job(
                company_id=company.id,
                title=tmpl["title"],
                level=level,
                salary=tmpl["salary"],
                location=loc_variant,
                deadline=deadline,
                status=status,
                description=tmpl["description"],
                requirements=tmpl["requirements"],
                benefits=tmpl["benefits"],
            )
            db.add(job)
            db.flush()
            result.append({"job": job, "domain": domain, "company_id": company.id})
            total_created += 1

    db.commit()
    for item in result:
        try:
            db.refresh(item["job"])
        except Exception:
            pass

    print(f"  [jobs] {total_created} created, {len(result)} total")
    return result


def run(db=None, companies_with_domain: list[dict] = None) -> list[dict]:
    """Main entry point. Returns list of {job, domain, company_id}."""
    close_db = db is None
    if close_db:
        db = SessionLocal()
    try:
        print("=== Seeding jobs ===")
        if companies_with_domain is None:
            from scripts.seed.seed_utils import load_json as _load
            company_templates = _load("company_templates.json")
            domain_map = {tmpl["name"]: tmpl["domain"] for tmpl in company_templates}
            companies = db.query(Company).all()
            companies_with_domain = []
            for c in companies:
                domain = "backend"
                for name, d in domain_map.items():
                    if name.lower() in c.name.lower():
                        domain = d
                        break
                companies_with_domain.append({"company": c, "domain": domain})
        return seed_jobs(db, companies_with_domain)
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    jobs = run()
    print(f"Done. Jobs ready: {len(jobs)}")
    by_domain: dict[str, int] = {}
    by_level: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for item in jobs:
        d = item["domain"]
        l = item["job"].level or "Unknown"
        s = item["job"].status or "Unknown"
        by_domain[d] = by_domain.get(d, 0) + 1
        by_level[l] = by_level.get(l, 0) + 1
        by_status[s] = by_status.get(s, 0) + 1
    print("\nBy domain:", by_domain)
    print("By level:", by_level)
    print("By status:", by_status)
