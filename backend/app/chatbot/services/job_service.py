"""
job_service — Sprint 4.

Provides DB queries needed by the chatbot's recruiter-facing endpoints.
"""

from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.company import Company


def get_jobs_by_recruiter(recruiter_id: int, db: Session) -> list[dict]:
    """
    Return all jobs (id, title, status) owned by recruiter_id.
    Ownership: jobs.company_id → companies.user_id == recruiter_id.
    Returns an empty list if the recruiter has no jobs or no company profile.
    """
    jobs = (
        db.query(Job)
        .join(Company, Job.company_id == Company.id)
        .filter(Company.user_id == recruiter_id)
        .order_by(Job.created_at.desc())
        .all()
    )
    return [{"id": j.id, "title": j.title, "status": j.status} for j in jobs]
