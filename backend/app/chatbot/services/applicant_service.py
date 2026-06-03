from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.job import Job
from app.models.company import Company
from app.models.application import JobApplication
from app.models.user import User
from app.models.profile import UserProfile


def verify_job_ownership(job_id: int, recruiter_id: int, db: Session) -> Job:
    """
    Return the Job if it belongs to recruiter_id, raise otherwise.
    404 when job doesn't exist at all; 403 when owned by someone else.
    Ownership path: jobs.company_id → companies.user_id == recruiter_id.
    """
    job = (
        db.query(Job)
        .join(Company, Job.company_id == Company.id)
        .filter(Job.id == job_id, Company.user_id == recruiter_id)
        .first()
    )
    if job:
        return job

    exists = db.query(Job).filter(Job.id == job_id).first()
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job không tồn tại",
        )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn không có quyền xem job này",
    )


def get_applicants_by_job(job_id: int, recruiter_id: int, db: Session) -> list[dict]:
    """
    Return all applicants for a job as a list of plain dicts.

    Each dict contains profile data and the best available cv_url
    (application-level cv_url takes priority over profile cv_url).
    Raises 403/404 when the recruiter doesn't own the job.
    """
    verify_job_ownership(job_id, recruiter_id, db)

    rows = (
        db.query(JobApplication, User, UserProfile)
        .join(User, JobApplication.user_id == User.id)
        .outerjoin(UserProfile, UserProfile.user_id == User.id)
        .filter(JobApplication.job_id == job_id)
        .all()
    )

    applicants: list[dict] = []
    for application, user, profile in rows:
        cv_url = application.cv_url or (profile.cv_url if profile else None)
        applicants.append(
            {
                "application_id": application.id,
                "user_id": user.id,
                "email": user.email,
                "full_name": profile.full_name if profile else None,
                "skills": profile.skills if profile else None,
                "experience": profile.experience if profile else None,
                "education": profile.education if profile else None,
                "bio": profile.bio if profile else None,
                "cv_url": cv_url,
                "application_status": application.status,
                "cover_letter": application.cover_letter,
            }
        )

    return applicants
