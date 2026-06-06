from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models.user import User, Role
from app.models.company import Company
from app.models.job import Job
from app.models.application import JobApplication
from app.models.candidate_cv import CandidateCV
from app.models.cv_text import CVText


def get_totals(db: Session) -> dict:
    total_users = db.query(func.count(User.id)).scalar() or 0

    candidate_role = db.query(Role).filter(Role.name == "job_seeker").first()
    recruiter_role = db.query(Role).filter(Role.name == "recruiter").first()

    candidates = 0
    if candidate_role:
        candidates = db.query(func.count(User.id)).filter(User.role_id == candidate_role.id).scalar() or 0

    recruiters = 0
    if recruiter_role:
        recruiters = db.query(func.count(User.id)).filter(User.role_id == recruiter_role.id).scalar() or 0

    return {
        "users": total_users,
        "candidates": candidates,
        "recruiters": recruiters,
        "companies": db.query(func.count(Company.id)).scalar() or 0,
        "jobs": db.query(func.count(Job.id)).scalar() or 0,
        "applications": db.query(func.count(JobApplication.id)).scalar() or 0,
    }


def get_period_stats(db: Session, period: str = "30d") -> dict:
    now = datetime.utcnow()
    if period == "today":
        start_current = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_prev = start_current - timedelta(days=1)
    elif period == "7d":
        start_current = now - timedelta(days=7)
        start_prev = now - timedelta(days=14)
    else:
        start_current = now - timedelta(days=30)
        start_prev = now - timedelta(days=60)

    def _count(model, col, start, end):
        return db.query(func.count(model.id)).filter(
            and_(col >= start, col < end)
        ).scalar() or 0

    def _pct(cur, prev):
        if not prev:
            return None
        return round((cur - prev) / prev * 100, 1)

    nu = _count(User, User.created_at, start_current, now)
    pu = _count(User, User.created_at, start_prev, start_current)
    nj = _count(Job, Job.created_at, start_current, now)
    pj = _count(Job, Job.created_at, start_prev, start_current)
    na = _count(JobApplication, JobApplication.created_at, start_current, now)
    pa = _count(JobApplication, JobApplication.created_at, start_prev, start_current)
    nc = _count(Company, Company.created_at, start_current, now)
    pc = _count(Company, Company.created_at, start_prev, start_current)

    return {
        "period": period,
        "new_users": nu,
        "new_jobs": nj,
        "new_applications": na,
        "new_companies": nc,
        "change_users_pct": _pct(nu, pu),
        "change_jobs_pct": _pct(nj, pj),
        "change_applications_pct": _pct(na, pa),
        "change_companies_pct": _pct(nc, pc),
    }


def get_jobs_by_status(db: Session) -> dict:
    results = db.query(Job.status, func.count(Job.id)).group_by(Job.status).all()
    status_map = {"active": 0, "closed": 0, "draft": 0}
    for status, count in results:
        if status in status_map:
            status_map[status] = count
    return status_map


def get_applications_by_status(db: Session) -> dict:
    results = (
        db.query(JobApplication.status, func.count(JobApplication.id))
        .group_by(JobApplication.status)
        .all()
    )
    status_map = {"pending": 0, "reviewed": 0, "accepted": 0, "rejected": 0}
    for status, count in results:
        if status in status_map:
            status_map[status] = count
    return status_map


def get_top_companies(db: Session, limit: int = 5) -> list:
    results = (
        db.query(Company.id, Company.name, func.count(Job.id).label("job_count"))
        .outerjoin(Job, Job.company_id == Company.id)
        .group_by(Company.id, Company.name)
        .order_by(func.count(Job.id).desc())
        .limit(limit)
        .all()
    )
    return [{"id": r.id, "name": r.name, "job_count": r.job_count} for r in results]


def get_cv_parse_stats(db: Session) -> dict:
    total_cvs = db.query(func.count(CandidateCV.id)).scalar() or 0
    results = (
        db.query(CVText.parse_status, func.count(CVText.id))
        .group_by(CVText.parse_status)
        .all()
    )
    parse_map = {"success": 0, "failed": 0, "pending": 0}
    for status, count in results:
        if status in parse_map:
            parse_map[status] = count
    return {
        "total": total_cvs,
        "success": parse_map["success"],
        "failed": parse_map["failed"],
        "pending": parse_map["pending"],
    }


def get_weekly_trend(db: Session, weeks: int = 8) -> list:
    now = datetime.utcnow()
    result = []
    for i in range(weeks - 1, -1, -1):
        end = now - timedelta(weeks=i)
        start = end - timedelta(weeks=1)
        nj = db.query(func.count(Job.id)).filter(
            and_(Job.created_at >= start, Job.created_at < end)
        ).scalar() or 0
        na = db.query(func.count(JobApplication.id)).filter(
            and_(JobApplication.created_at >= start, JobApplication.created_at < end)
        ).scalar() or 0
        result.append({
            "week_start": start.strftime("%d/%m"),
            "new_jobs": nj,
            "new_applications": na,
        })
    return result


def get_attention_metrics(db: Session) -> dict:
    draft_jobs = db.query(func.count(Job.id)).filter(Job.status == "draft").scalar() or 0
    seven_ago = datetime.utcnow() - timedelta(days=7)
    overdue = db.query(func.count(JobApplication.id)).filter(
        and_(JobApplication.status == "pending", JobApplication.created_at <= seven_ago)
    ).scalar() or 0
    inactive = db.query(func.count(User.id)).filter(
        User.status.in_(["inactive", "banned"])
    ).scalar() or 0
    return {
        "draft_jobs": draft_jobs,
        "overdue_applications": overdue,
        "inactive_users": inactive,
    }


def get_dashboard_summary(db: Session, period: str = "30d") -> dict:
    return {
        "totals": get_totals(db),
        "period_stats": get_period_stats(db, period),
        "jobs_by_status": get_jobs_by_status(db),
        "applications_by_status": get_applications_by_status(db),
        "top_companies": get_top_companies(db),
        "cv_parse_stats": get_cv_parse_stats(db),
        "weekly_trend": get_weekly_trend(db),
        "attention": get_attention_metrics(db),
    }
