from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.job import Job
from app.models.company import Company
from app.models.application import JobApplication
from app.models.user import User
from app.models.profile import UserProfile
from app.models.candidate_cv import CandidateCV
from app.models.cv_text import CVText


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


def _get_cv_text_from_db(user_id: int, db: Session) -> str | None:
    """Return extracted CV text for the user's active CV, or None if unavailable."""
    active_cv = (
        db.query(CandidateCV)
        .filter(CandidateCV.user_id == user_id, CandidateCV.is_active == True)
        .first()
    )
    if not active_cv:
        return None
    cv_record = (
        db.query(CVText)
        .filter(CVText.cv_id == active_cv.id, CVText.parse_status == "success")
        .first()
    )
    if cv_record and cv_record.extracted_text:
        return cv_record.extracted_text
    return None


def get_applicants_by_job(job_id: int, recruiter_id: int, db: Session) -> list[dict]:
    """
    Return all applicants for a job as a list of plain dicts.

    Each dict contains profile data, cv_url, and cv_text pre-populated from
    the candidate's active CV in the database (avoids runtime PDF download).
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
        cv_text = _get_cv_text_from_db(user.id, db)
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
                "cv_text": cv_text,
                "application_status": application.status,
                "cover_letter": application.cover_letter,
            }
        )

    return applicants
