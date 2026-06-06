"""
Seed candidates: job_seeker users with profiles, CV metadata and CV text.
Run standalone: cd backend && python scripts/seed/seed_candidates.py
"""
import sys
import os
import random
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.database import SessionLocal
from app.models.user import User, Role
from app.models.profile import UserProfile
from app.models.candidate_cv import CandidateCV
from app.models.cv_text import CVText
from app.utils.hashing import hash_password
from scripts.seed.seed_utils import (
    load_json,
    random_full_name,
    random_phone,
    random_address,
    random_dob,
    pick_skills,
    generate_cv_text,
)

CANDIDATE_COUNT = 350
DOMAINS = [
    "backend", "frontend", "data", "devops", "qa", "mobile", "ba",
    "healthcare", "finance", "marketing", "hr", "education",
    "fnb", "retail", "construction", "logistics", "manufacturing",
]
DOMAIN_WEIGHTS = [
    8, 7, 5, 3, 3, 5, 3,        # IT domains
    7, 8, 7, 5, 5, 6, 6, 5, 6, 5,  # Non-IT domains
]
LEVELS = ["Junior", "Mid", "Senior"]
LEVEL_WEIGHTS = [0.35, 0.45, 0.20]

EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]


def _make_cv_object_key(user_id: int, file_name: str) -> str:
    return f"cvs/{user_id}/{file_name}"


def seed_candidates(db, roles: dict, count: int = CANDIDATE_COUNT) -> list[dict]:
    """
    Create job_seeker users with profiles, CV records and CV text.
    Returns list of {user, profile, cv, cv_text, domain, skills, level}.
    Idempotent: skips existing emails.
    """
    skills_catalog = load_json("skills_catalog.json")

    existing_emails = {
        row[0]
        for row in db.query(User.email).filter(User.role_id == roles["job_seeker"].id).all()
    }

    result: list[dict] = []
    created = 0

    for i in range(1, count + 1):
        email = f"candidate{i:04d}@{random.choice(EMAIL_DOMAINS)}"
        if email in existing_emails:
            user = db.query(User).filter(User.email == email).first()
            if user and user.profile:
                domain = _guess_domain(user.profile.skills or "")
                skills = [s.strip() for s in (user.profile.skills or "").split(",") if s.strip()]
                cv = db.query(CandidateCV).filter(CandidateCV.user_id == user.id).first()
                cv_text = db.query(CVText).filter(CVText.cv_id == cv.id).first() if cv else None
                result.append({
                    "user": user,
                    "profile": user.profile,
                    "cv": cv,
                    "cv_text": cv_text,
                    "domain": domain,
                    "skills": skills,
                    "level": "Middle",
                })
            continue

        domain = random.choices(DOMAINS, weights=DOMAIN_WEIGHTS, k=1)[0]
        level = random.choices(LEVELS, weights=LEVEL_WEIGHTS, k=1)[0]
        gender = random.choice(["male", "female"])
        full_name = random_full_name(gender)
        skills = pick_skills(domain, skills_catalog, count=random.randint(5, 9))
        skills_str = ", ".join(skills)
        phone = random_phone()
        address = random_address()
        dob = random_dob(22, 38)

        # Create user
        user = User(
            email=email,
            password_hash=hash_password("Candidate@123"),
            role_id=roles["job_seeker"].id,
            status="active",
        )
        db.add(user)
        db.flush()

        # Experience text
        exp_years = {"Junior": 1, "Middle": 3, "Senior": 6}[level]
        experience_text = (
            f"{level} {domain} professional với {exp_years} năm kinh nghiệm. "
            f"Thành thạo: {', '.join(skills[:4])}."
        )
        education_text = (
            f"Đại học - Kỹ thuật Phần mềm/Công nghệ Thông tin. "
            f"Tốt nghiệp loại {random.choice(['Giỏi', 'Khá', 'Xuất sắc'])}."
        )

        # Create profile
        profile = UserProfile(
            user_id=user.id,
            full_name=full_name,
            phone=phone,
            address=address,
            dob=dob,
            skills=skills_str,
            experience=experience_text,
            education=education_text,
            bio=f"Tôi là {level} {domain} developer, đam mê công nghệ và luôn học hỏi cái mới.",
        )
        db.add(profile)
        db.flush()

        # Create CV metadata (simulated — no actual file)
        file_name = f"cv_{full_name.replace(' ', '_').lower()}_{i}.pdf"
        object_key = _make_cv_object_key(user.id, file_name)
        cv = CandidateCV(
            user_id=user.id,
            file_name=file_name,
            object_key=object_key,
            bucket_name="cv-files",
            mime_type="application/pdf",
            file_size=random.randint(100_000, 800_000),
            is_active=True,
        )
        db.add(cv)
        db.flush()

        # Create CV text
        cv_raw = generate_cv_text(
            full_name=full_name,
            email=email,
            phone=phone,
            domain=domain,
            skills=skills,
            level=level,
        )
        cv_text = CVText(
            cv_id=cv.id,
            extracted_text=cv_raw,
            parse_status="success",
            extracted_at=datetime.now(timezone.utc),
        )
        db.add(cv_text)

        result.append({
            "user": user,
            "profile": profile,
            "cv": cv,
            "cv_text": cv_text,
            "domain": domain,
            "skills": skills,
            "level": level,
        })
        created += 1

        # Batch commit every 50
        if created % 50 == 0:
            db.commit()
            print(f"    ... {created} candidates created so far")

    db.commit()
    print(f"  [candidates] {created} created, {len(result)} total")
    return result


def _guess_domain(skills_str: str) -> str:
    """Guess domain from comma-separated skills string."""
    s = skills_str.lower()
    if any(k in s for k in ["react", "vue", "angular", "next.js", "frontend", "typescript", "tailwind"]):
        return "frontend"
    if any(k in s for k in ["tensorflow", "pytorch", "pandas", "spark", "machine learning", "data analyst"]):
        return "data"
    if any(k in s for k in ["kubernetes", "docker", "terraform", "ansible", "ci/cd", "prometheus"]):
        return "devops"
    if any(k in s for k in ["selenium", "cypress", "playwright", "jmeter", "qa engineer", "test"]):
        return "qa"
    if any(k in s for k in ["flutter", "swift", "kotlin", "react native", "android", "ios"]):
        return "mobile"
    if any(k in s for k in ["bpmn", "uml", "business analysis", "stakeholder", "babok"]):
        return "ba"
    if any(k in s for k in ["điều dưỡng", "dược", "lâm sàng", "his", "bác sĩ", "haccp y"]):
        return "healthcare"
    if any(k in s for k in ["kế toán", "kiểm toán", "tài chính", "tín dụng", "cfa", "cpa", "ifrs"]):
        return "finance"
    if any(k in s for k in ["seo", "google ads", "facebook ads", "content marketing", "brand management"]):
        return "marketing"
    if any(k in s for k in ["tuyển dụng", "compensation", "hrbp", "talent acquisition", "workday"]):
        return "hr"
    if any(k in s for k in ["sư phạm", "giảng dạy", "celta", "e-learning", "lms", "tefl"]):
        return "education"
    if any(k in s for k in ["bếp", "barista", "f&b", "haccp", "wset", "phục vụ"]):
        return "fnb"
    if any(k in s for k in ["quản lý cửa hàng", "visual merchandising", "pos system", "bán lẻ"]):
        return "retail"
    if any(k in s for k in ["autocad", "revit", "bim", "kỹ sư xây dựng", "ms project", "fidic"]):
        return "construction"
    if any(k in s for k in ["wms", "tms", "incoterms", "xuất nhập khẩu", "logistics", "chuỗi cung ứng"]):
        return "logistics"
    if any(k in s for k in ["lean manufacturing", "six sigma", "iatf", "oee", "5s", "kaizen", "plc"]):
        return "manufacturing"
    return "backend"


def run(db=None, roles: dict = None) -> list[dict]:
    """Main entry point. Returns list of candidate dicts."""
    close_db = db is None
    if close_db:
        db = SessionLocal()
    try:
        print("=== Seeding candidates ===")
        if roles is None:
            roles = {
                role.name: role
                for role in db.query(Role).all()
            }
        return seed_candidates(db, roles)
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    candidates = run()
    print(f"Done. Candidates ready: {len(candidates)}")
    by_domain: dict[str, int] = {}
    by_level: dict[str, int] = {}
    for c in candidates:
        d = c["domain"]
        l = c["level"]
        by_domain[d] = by_domain.get(d, 0) + 1
        by_level[l] = by_level.get(l, 0) + 1
    print("By domain:", by_domain)
    print("By level:", by_level)
