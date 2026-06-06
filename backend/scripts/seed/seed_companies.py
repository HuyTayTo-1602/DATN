"""
Seed companies: one company per recruiter using company_templates.json.
Run standalone: cd backend && python scripts/seed/seed_companies.py
"""
import sys
import os
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.database import SessionLocal
from app.models.user import User, Role
from app.models.company import Company
from scripts.seed.seed_utils import load_json


def seed_companies(db, recruiters: list) -> list[dict]:
    """
    Create one company per recruiter.
    Returns list of {company: Company, domain: str}.
    Skips recruiters that already have a company.
    """
    templates: list[dict] = load_json("company_templates.json")

    # Find recruiters that already have companies
    existing_recruiter_ids = {
        row[0] for row in db.query(Company.user_id).all()
    }

    created = 0
    result: list[dict] = []

    for i, recruiter in enumerate(recruiters):
        tmpl = templates[i % len(templates)]
        if recruiter.id in existing_recruiter_ids:
            company = db.query(Company).filter(Company.user_id == recruiter.id).first()
            if company:
                result.append({"company": company, "domain": tmpl["domain"]})
            continue

        # Make name unique if multiple recruiters use same template
        name_suffix = f" #{i // len(templates) + 1}" if i >= len(templates) else ""
        company = Company(
            user_id=recruiter.id,
            name=tmpl["name"] + name_suffix,
            description=tmpl["description"],
            size=tmpl["size"],
            type=tmpl["type"],
            address=tmpl["address"],
            website=tmpl["website"],
            phone=tmpl["phone"],
            logo_url=tmpl.get("logo_url") or f"https://logo.clearbit.com/{tmpl['website'].replace('https://', '')}",
        )
        db.add(company)
        db.flush()
        result.append({"company": company, "domain": tmpl["domain"]})
        created += 1

    db.commit()
    for item in result:
        db.refresh(item["company"])

    print(f"  [companies] {created} created, {len(result)} total")
    return result


def run(db=None, recruiters: list = None) -> list[dict]:
    """Main entry point. Returns list of {company, domain}."""
    close_db = db is None
    if close_db:
        db = SessionLocal()
    try:
        print("=== Seeding companies ===")
        if recruiters is None:
            recruiter_role = db.query(Role).filter(Role.name == "recruiter").first()
            if not recruiter_role:
                raise RuntimeError("No recruiter role found. Run seed_base_data first.")
            recruiters = (
                db.query(User)
                .filter(User.role_id == recruiter_role.id)
                .order_by(User.id)
                .all()
            )
        return seed_companies(db, recruiters)
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    companies = run()
    print(f"Done. Companies ready: {len(companies)}")
    domains = {}
    for item in companies:
        d = item["domain"]
        domains[d] = domains.get(d, 0) + 1
    for domain, count in sorted(domains.items()):
        print(f"  {domain}: {count}")
