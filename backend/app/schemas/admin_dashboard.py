from pydantic import BaseModel
from typing import List, Optional


class DashboardTotals(BaseModel):
    users: int
    candidates: int
    recruiters: int
    companies: int
    jobs: int
    applications: int


class PeriodStats(BaseModel):
    period: str
    new_users: int
    new_jobs: int
    new_applications: int
    new_companies: int
    change_users_pct: Optional[float] = None
    change_jobs_pct: Optional[float] = None
    change_applications_pct: Optional[float] = None
    change_companies_pct: Optional[float] = None


class JobsByStatus(BaseModel):
    active: int
    closed: int
    draft: int


class ApplicationsByStatus(BaseModel):
    pending: int
    reviewed: int
    accepted: int
    rejected: int


class TopCompany(BaseModel):
    id: int
    name: str
    job_count: int


class CVParseStats(BaseModel):
    total: int
    success: int
    failed: int
    pending: int


class WeeklyTrend(BaseModel):
    week_start: str
    new_jobs: int
    new_applications: int


class AttentionMetrics(BaseModel):
    draft_jobs: int
    overdue_applications: int
    inactive_users: int


class DashboardSummary(BaseModel):
    totals: DashboardTotals
    period_stats: PeriodStats
    jobs_by_status: JobsByStatus
    applications_by_status: ApplicationsByStatus
    top_companies: List[TopCompany]
    cv_parse_stats: CVParseStats
    weekly_trend: List[WeeklyTrend]
    attention: AttentionMetrics
