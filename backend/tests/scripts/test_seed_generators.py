"""
Unit tests for seed data generators.

Tests are split into:
  - Pure unit tests (no DB): test generator functions directly.
  - Integration smoke test (requires DB): skipped if DB is unreachable.

Run: cd backend && pytest tests/scripts/test_seed_generators.py -v
"""
import sys
import os
import json
import random
import pytest

# Ensure backend/ is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scripts.seed.seed_utils import (
    load_json,
    random_full_name,
    random_phone,
    random_address,
    random_dob,
    random_future_date,
    pick_skills,
    generate_cv_text,
    generate_cover_letter,
)

SEED_DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "scripts", "seed", "data",
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
DOMAINS = [
    "backend", "frontend", "data", "devops", "qa", "mobile", "ba",
    "healthcare", "finance", "marketing", "hr", "education",
    "fnb", "retail", "construction", "logistics", "manufacturing",
]


def _load_skills_catalog() -> dict:
    return load_json("skills_catalog.json")


def _load_company_templates() -> list:
    return load_json("company_templates.json")


def _load_job_templates() -> dict:
    return load_json("job_templates.json")


# ---------------------------------------------------------------------------
# Data catalog tests
# ---------------------------------------------------------------------------
class TestSkillsCatalog:
    def test_catalog_loads_successfully(self):
        catalog = _load_skills_catalog()
        assert isinstance(catalog, dict)

    def test_catalog_has_all_domains(self):
        catalog = _load_skills_catalog()
        for domain in DOMAINS:
            assert domain in catalog, f"Domain '{domain}' missing from skills_catalog"

    def test_each_domain_has_skill_groups(self):
        catalog = _load_skills_catalog()
        for domain in DOMAINS:
            assert len(catalog[domain]) > 0, f"Domain '{domain}' has no skill groups"

    def test_each_skill_group_has_skills(self):
        catalog = _load_skills_catalog()
        for domain in DOMAINS:
            for group_name, skills in catalog[domain].items():
                assert isinstance(skills, list), f"{domain}/{group_name} is not a list"
                assert len(skills) > 0, f"{domain}/{group_name} is empty"
                for skill in skills:
                    assert isinstance(skill, str) and skill.strip(), (
                        f"Invalid skill in {domain}/{group_name}: {skill!r}"
                    )


class TestCompanyTemplates:
    def test_templates_load_successfully(self):
        templates = _load_company_templates()
        assert isinstance(templates, list)

    def test_minimum_company_count(self):
        templates = _load_company_templates()
        assert len(templates) >= 30, f"Expected at least 30 companies, got {len(templates)}"

    def test_required_fields_present(self):
        required = {"name", "domain", "type", "size", "description", "address", "website", "phone"}
        templates = _load_company_templates()
        for tmpl in templates:
            missing = required - set(tmpl.keys())
            assert not missing, f"Company template '{tmpl.get('name')}' missing fields: {missing}"

    def test_all_domains_represented(self):
        templates = _load_company_templates()
        represented = {t["domain"] for t in templates}
        for domain in DOMAINS:
            assert domain in represented, f"No company with domain '{domain}'"

    def test_domain_values_valid(self):
        templates = _load_company_templates()
        for tmpl in templates:
            assert tmpl["domain"] in DOMAINS, (
                f"Company '{tmpl['name']}' has unknown domain '{tmpl['domain']}'"
            )

    def test_no_empty_required_strings(self):
        required_strs = ["name", "type", "size", "description", "address"]
        templates = _load_company_templates()
        for tmpl in templates:
            for field in required_strs:
                assert tmpl.get(field, "").strip(), (
                    f"Company '{tmpl.get('name')}' has empty field '{field}'"
                )


class TestJobTemplates:
    def test_templates_load_successfully(self):
        templates = _load_job_templates()
        assert isinstance(templates, dict)

    def test_all_domains_present(self):
        templates = _load_job_templates()
        for domain in DOMAINS:
            assert domain in templates, f"Domain '{domain}' missing from job_templates"

    def test_all_levels_present(self):
        expected_levels = {"Fresher", "Junior", "Mid", "Senior", "Manager"}
        templates = _load_job_templates()
        for domain in DOMAINS:
            levels = set(templates[domain].keys())
            assert levels == expected_levels, (
                f"Domain '{domain}' has levels {levels}, expected {expected_levels}"
            )

    def test_each_level_has_templates(self):
        templates = _load_job_templates()
        for domain in DOMAINS:
            for level in ["Fresher", "Junior", "Mid", "Senior", "Manager"]:
                tmpl_list = templates[domain][level]
                assert isinstance(tmpl_list, list) and len(tmpl_list) >= 1, (
                    f"{domain}/{level} has no templates"
                )

    def test_template_required_fields(self):
        required = {"title", "salary", "description", "requirements", "benefits"}
        templates = _load_job_templates()
        for domain in DOMAINS:
            for level in ["Fresher", "Junior", "Mid", "Senior", "Manager"]:
                for tmpl in templates[domain][level]:
                    missing = required - set(tmpl.keys())
                    assert not missing, (
                        f"{domain}/{level} template '{tmpl.get('title')}' missing: {missing}"
                    )

    def test_salary_fields_not_empty(self):
        templates = _load_job_templates()
        for domain in DOMAINS:
            for level, tmpl_list in templates[domain].items():
                for tmpl in tmpl_list:
                    assert tmpl["salary"].strip(), (
                        f"{domain}/{level}/{tmpl['title']} has empty salary"
                    )


# ---------------------------------------------------------------------------
# Generator function tests
# ---------------------------------------------------------------------------
class TestGeneratorFunctions:
    def test_random_full_name_returns_string(self):
        name = random_full_name()
        assert isinstance(name, str) and len(name) > 3

    def test_random_full_name_has_multiple_words(self):
        for _ in range(10):
            name = random_full_name()
            parts = name.split()
            assert len(parts) >= 2, f"Name too short: {name!r}"

    def test_random_full_name_male(self):
        name = random_full_name("male")
        assert isinstance(name, str) and len(name) > 3

    def test_random_full_name_female(self):
        name = random_full_name("female")
        assert isinstance(name, str) and len(name) > 3

    def test_random_phone_format(self):
        for _ in range(20):
            phone = random_phone()
            assert isinstance(phone, str)
            assert phone.isdigit(), f"Phone contains non-digits: {phone!r}"
            assert 10 <= len(phone) <= 11, f"Phone length out of range: {phone!r}"

    def test_random_address_not_empty(self):
        address = random_address()
        assert isinstance(address, str) and len(address) > 10

    def test_random_dob_returns_date(self):
        from datetime import date
        dob = random_dob()
        assert isinstance(dob, date)
        today = date.today()
        age = (today - dob).days // 365
        assert 22 <= age <= 38

    def test_random_future_date(self):
        from datetime import date
        future = random_future_date(1, 30)
        assert future > date.today()

    def test_pick_skills_count_in_range(self):
        catalog = _load_skills_catalog()
        for domain in DOMAINS:
            skills = pick_skills(domain, catalog, count=5)
            assert isinstance(skills, list)
            assert 1 <= len(skills) <= 5

    def test_pick_skills_no_duplicates(self):
        catalog = _load_skills_catalog()
        for domain in DOMAINS:
            skills = pick_skills(domain, catalog, count=8)
            assert len(skills) == len(set(skills)), f"Duplicate skills in {domain}: {skills}"

    def test_pick_skills_unknown_domain_returns_empty(self):
        catalog = _load_skills_catalog()
        skills = pick_skills("unknown_domain_xyz", catalog, count=5)
        assert isinstance(skills, list)
        assert len(skills) == 0


class TestCVTextGenerator:
    def test_cv_text_not_empty(self):
        catalog = _load_skills_catalog()
        for domain in DOMAINS:
            skills = pick_skills(domain, catalog, 5)
            text = generate_cv_text(
                full_name="Nguyá»…n VÄƒn Test",
                email="test@example.com",
                phone="0901234567",
                domain=domain,
                skills=skills,
                level="Mid",
            )
            assert isinstance(text, str) and len(text) > 100, (
                f"CV text too short for domain {domain}"
            )

    def test_cv_text_contains_name(self):
        catalog = _load_skills_catalog()
        skills = pick_skills("backend", catalog, 4)
        name = "Tráº§n Thá»‹ Kiá»ƒm Tra"
        text = generate_cv_text(name, "email@test.com", "0912345678", "backend", skills)
        assert name in text

    def test_cv_text_contains_email(self):
        catalog = _load_skills_catalog()
        skills = pick_skills("frontend", catalog, 4)
        email = "unique_test_email@example.com"
        text = generate_cv_text("Some Name", email, "0912345678", "frontend", skills)
        assert email in text

    def test_cv_text_contains_skills(self):
        catalog = _load_skills_catalog()
        skills = pick_skills("data", catalog, 3)
        text = generate_cv_text("Name", "e@e.com", "0900000000", "data", skills)
        for skill in skills[:2]:
            assert skill in text, f"Skill '{skill}' not found in CV text"

    def test_cv_text_for_all_levels(self):
        catalog = _load_skills_catalog()
        skills = pick_skills("devops", catalog, 5)
        for level in ["Fresher", "Junior", "Mid", "Senior", "Manager"]:
            text = generate_cv_text("Test Name", "t@t.com", "0900000000", "devops", skills, level)
            assert len(text) > 100, f"CV text too short for level {level}"

    def test_cv_text_no_fk_violation_risk(self):
        """CV text should not contain SQL injection risk strings."""
        catalog = _load_skills_catalog()
        skills = pick_skills("qa", catalog, 4)
        text = generate_cv_text("QA Tester", "qa@test.com", "0900000001", "qa", skills)
        assert "DROP TABLE" not in text.upper()
        assert "DELETE FROM" not in text.upper()


class TestCoverLetterGenerator:
    def test_cover_letter_not_empty(self):
        letter = generate_cover_letter("Nguyá»…n VÄƒn A", "backend", "Backend Developer")
        assert isinstance(letter, str) and len(letter) > 50

    def test_cover_letter_contains_name(self):
        name = "Pháº¡m Thá»‹ BÃ­ch"
        letter = generate_cover_letter(name, "frontend", "Frontend Developer")
        assert name in letter

    def test_cover_letter_contains_job_title(self):
        title = "Senior Data Scientist"
        letter = generate_cover_letter("Some Name", "data", title)
        assert title in letter

    def test_cover_letter_for_all_domains(self):
        for domain in DOMAINS:
            letter = generate_cover_letter("Test", domain, f"{domain.title()} Developer")
            assert len(letter) > 50


# ---------------------------------------------------------------------------
# FK-rule validation tests (in-memory, no DB)
# ---------------------------------------------------------------------------
class TestDataConsistencyRules:
    def test_job_templates_have_unique_titles_per_level(self):
        """Within a domain+level, titles should be distinct."""
        templates = _load_job_templates()
        for domain in DOMAINS:
            for level, tmpl_list in templates[domain].items():
                titles = [t["title"] for t in tmpl_list]
                assert len(titles) == len(set(titles)), (
                    f"Duplicate titles in {domain}/{level}: {titles}"
                )

    def test_company_names_unique(self):
        templates = _load_company_templates()
        names = [t["name"] for t in templates]
        assert len(names) == len(set(names)), "Duplicate company names detected"

    def test_skills_not_cross_contaminated(self):
        """Backend skills catalog should not appear as-is in other primary skill lists."""
        catalog = _load_skills_catalog()
        backend_primary = set(catalog["backend"]["primary"])
        mobile_primary = set(catalog["mobile"].get("cross_platform", []))
        # They should have minimal overlap (allowed: Python appears in both backend and data)
        overlap = backend_primary & mobile_primary
        assert len(overlap) == 0, f"Unexpected overlap between backend.primary and mobile: {overlap}"


# ---------------------------------------------------------------------------
# Integration smoke test (requires live DB)
# ---------------------------------------------------------------------------
def _db_is_available() -> bool:
    try:
        from app.db.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@pytest.mark.skipif(not _db_is_available(), reason="Database not available")
class TestSeedSmoke:
    """Smoke tests that require a live database connection."""

    def test_seed_base_data_idempotent(self):
        """Running seed_base_data twice should not raise or create duplicates."""
        from scripts.seed.seed_base_data import run
        result1 = run()
        result2 = run()
        assert set(result1["roles"].keys()) == set(result2["roles"].keys())
        assert len(result1["recruiters"]) == len(result2["recruiters"])

    def test_roles_exist_after_seed(self):
        from app.db.database import SessionLocal
        from app.models.user import Role
        from scripts.seed.seed_base_data import run
        run()
        db = SessionLocal()
        try:
            roles = db.query(Role).all()
            names = {r.name for r in roles}
            assert "job_seeker" in names
            assert "recruiter" in names
            assert "admin" in names
        finally:
            db.close()

    def test_companies_exist_after_seed(self):
        from app.db.database import SessionLocal
        from app.models.company import Company
        db = SessionLocal()
        try:
            count = db.query(Company).count()
            assert count >= 10, f"Expected at least 10 companies, got {count}"
        finally:
            db.close()

    def test_jobs_exist_after_seed(self):
        from app.db.database import SessionLocal
        from app.models.job import Job
        db = SessionLocal()
        try:
            count = db.query(Job).count()
            assert count >= 50, f"Expected at least 50 jobs, got {count}"
        finally:
            db.close()

    def test_candidates_have_profiles(self):
        """Every job_seeker should have a UserProfile."""
        from app.db.database import SessionLocal
        from app.models.user import User, Role
        from app.models.profile import UserProfile
        db = SessionLocal()
        try:
            seeker_role = db.query(Role).filter(Role.name == "job_seeker").first()
            if not seeker_role:
                pytest.skip("No job_seeker role found")
            users = db.query(User).filter(User.role_id == seeker_role.id).limit(20).all()
            for u in users:
                profile = db.query(UserProfile).filter(UserProfile.user_id == u.id).first()
                assert profile is not None, f"User {u.id} ({u.email}) has no profile"
        finally:
            db.close()

    def test_cv_text_parse_status_valid(self):
        """All CV text records should have valid parse_status."""
        from app.db.database import SessionLocal
        from app.models.cv_text import CVText
        db = SessionLocal()
        try:
            valid_statuses = {"pending", "success", "failed"}
            records = db.query(CVText).limit(100).all()
            for rec in records:
                assert rec.parse_status in valid_statuses, (
                    f"CVText {rec.id} has invalid parse_status: {rec.parse_status!r}"
                )
        finally:
            db.close()

    def test_applications_respect_unique_constraint(self):
        """No (user_id, job_id) pair should appear more than once."""
        from app.db.database import SessionLocal
        from app.models.application import JobApplication
        from sqlalchemy import func
        db = SessionLocal()
        try:
            duplicates = (
                db.query(JobApplication.user_id, JobApplication.job_id, func.count())
                .group_by(JobApplication.user_id, JobApplication.job_id)
                .having(func.count() > 1)
                .all()
            )
            assert len(duplicates) == 0, (
                f"Found {len(duplicates)} duplicate (user_id, job_id) pairs: {duplicates[:3]}"
            )
        finally:
            db.close()

    def test_notifications_have_valid_types(self):
        """Notifications should only use known type strings."""
        from app.db.database import SessionLocal
        from app.models.notification import Notification
        db = SessionLocal()
        try:
            valid_types = {
                "application_submitted",
                "application_accepted",
                "application_rejected",
                "job_recommendation",
            }
            records = db.query(Notification).limit(200).all()
            for n in records:
                assert n.type in valid_types, (
                    f"Notification {n.id} has unknown type: {n.type!r}"
                )
        finally:
            db.close()

    def test_search_backend_returns_results(self):
        """Jobs with 'backend' in title should exist."""
        from app.db.database import SessionLocal
        from app.models.job import Job
        db = SessionLocal()
        try:
            count = db.query(Job).filter(Job.title.ilike("%backend%")).count()
            assert count > 0, "No backend jobs found after seeding"
        finally:
            db.close()

    def test_search_python_in_cv_text(self):
        """At least some CV texts should mention Python."""
        from app.db.database import SessionLocal
        from app.models.cv_text import CVText
        db = SessionLocal()
        try:
            count = db.query(CVText).filter(CVText.extracted_text.ilike("%python%")).count()
            assert count > 0, "No CV texts mention Python"
        finally:
            db.close()

    def test_admin_dashboard_has_data(self):
        """Users, companies and jobs should all be present for admin dashboard."""
        from app.db.database import SessionLocal
        from app.models.user import User
        from app.models.company import Company
        from app.models.job import Job
        from app.models.application import JobApplication
        db = SessionLocal()
        try:
            assert db.query(User).count() > 10
            assert db.query(Company).count() > 5
            assert db.query(Job).count() > 20
            assert db.query(JobApplication).count() > 50
        finally:
            db.close()

