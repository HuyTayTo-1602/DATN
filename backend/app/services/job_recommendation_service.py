# =============================================================================
# services/job_recommendation_service.py
# Mục đích: Gợi ý việc làm dựa trên nội dung CV của ứng viên.
# Logic: rule-based keyword matching — không dùng AI hay NLP phức tạp.
# Bước 1: Lấy CV active mới nhất của user.
# Bước 2: Trích keyword từ extracted_text bằng từ điển cố định.
# Bước 3: Với mỗi job active, tính điểm theo keyword trùng ở từng trường.
# Bước 4: Sắp xếp giảm dần theo điểm, trả top N.
# =============================================================================

from __future__ import annotations

import re
from typing import List, Tuple

from sqlalchemy.orm import Session

from app.models.candidate_cv import CandidateCV
from app.models.cv_text import CVText
from app.models.job import Job
from app.models.user import User

# ---------------------------------------------------------------------------
# Từ điển keyword cố định
# ---------------------------------------------------------------------------

_TECH_SKILLS: List[str] = [
    # Ngôn ngữ lập trình
    "python", "java", "javascript", "typescript", "kotlin", "swift",
    "golang", "go", "rust", "c++", "c#", "ruby", "php", "scala",
    "dart", "r", "bash", "shell",
    # Frontend frameworks
    "react", "vue", "angular", "nextjs", "nuxtjs", "svelte",
    "html", "css", "sass", "tailwind",
    # Backend frameworks
    "django", "fastapi", "flask", "spring", "springboot",
    "nestjs", "express", "laravel", "rails", "asp.net",
    # Mobile
    "android", "ios", "flutter", "react native",
    # Data / ML / AI
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
    "spark", "hadoop", "kafka", "airflow", "dbt",
    "machine learning", "deep learning", "nlp", "computer vision",
    "data science", "data engineering", "mlops",
    # DevOps / Cloud
    "docker", "kubernetes", "aws", "gcp", "azure", "ci/cd",
    "terraform", "ansible", "jenkins", "github actions",
    "linux", "nginx", "microservices",
    # Database
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "cassandra", "sql", "nosql", "oracle",
    # API / Architecture
    "rest", "graphql", "grpc", "websocket", "rest api",
    "git", "agile", "scrum",
]

_ROLE_KEYWORDS: List[str] = [
    "backend", "front-end", "frontend", "fullstack", "full-stack",
    "mobile developer", "ios developer", "android developer",
    "devops", "site reliability", "sre", "cloud engineer",
    "data engineer", "data analyst", "data scientist",
    "ai engineer", "ml engineer",
    "qa engineer", "tester", "automation tester",
    "security engineer", "cybersecurity",
    "embedded", "firmware",
    "blockchain",
    "product manager", "project manager", "scrum master",
    "ux designer", "ui designer",
]

# Map từ keyword trong CV → level tương ứng
_LEVEL_MAP: dict[str, str] = {
    "intern": "Junior",
    "fresher": "Junior",
    "junior": "Junior",
    "entry level": "Junior",
    "mid level": "Mid",
    "middle": "Mid",
    "intermediate": "Mid",
    "senior": "Senior",
    "lead": "Senior",
    "principal": "Senior",
    "tech lead": "Senior",
    "manager": "Manager",
    "head of": "Manager",
    "director": "Manager",
}

_TOP_N = 10
# Trọng số điểm cho từng trường
_W_TITLE = 3
_W_REQUIREMENTS = 2
_W_DESCRIPTION = 1
_W_LEVEL = 2


# ---------------------------------------------------------------------------
# Hàm công khai
# ---------------------------------------------------------------------------

def get_recommendations(user: User, db: Session, top_n: int = _TOP_N) -> dict:
    """
    Trả dict với keys: items, total, has_cv, cv_parsed.
    items là list[Job] với .match_score và .match_reason gắn thêm vào mỗi đối tượng.
    """
    cv, cv_text_obj = _get_active_cv(user.id, db)

    if cv is None:
        return {"items": [], "total": 0, "has_cv": False, "cv_parsed": False}

    if cv_text_obj is None or cv_text_obj.parse_status != "success" or not cv_text_obj.extracted_text:
        return {"items": [], "total": 0, "has_cv": True, "cv_parsed": False}

    keywords, inferred_level = extract_keywords(cv_text_obj.extracted_text)

    if not keywords:
        # Không trích được keyword → fallback 10 job mới nhất
        jobs = _fallback_recent_jobs(db, top_n)
        for job in jobs:
            job.match_score = 0
            job.match_reason = "Gợi ý dựa trên việc làm mới nhất"
        return {"items": jobs, "total": len(jobs), "has_cv": True, "cv_parsed": True}

    scored = _score_jobs(keywords, inferred_level, db)
    scored = scored[:top_n]

    for job, score, reason in scored:
        job.match_score = score
        job.match_reason = reason

    items = [j for j, _, _ in scored]
    return {"items": items, "total": len(items), "has_cv": True, "cv_parsed": True}


def extract_keywords(text: str) -> Tuple[List[str], str | None]:
    """
    Trích keyword từ text CV. Trả (danh sách keyword, inferred_level | None).
    Dùng matching theo từ điển cố định (không dùng NLP).
    """
    if not text:
        return [], None

    normalized = text.lower()

    found: List[str] = []

    for skill in _TECH_SKILLS + _ROLE_KEYWORDS:
        # Dùng word-boundary để tránh false positive (e.g., "go" trong "django")
        # Multi-word phrase dùng khoảng trắng thường
        if " " in skill:
            if skill in normalized:
                found.append(skill)
        else:
            pattern = r"\b" + re.escape(skill) + r"\b"
            if re.search(pattern, normalized):
                found.append(skill)

    # Loại trùng, giữ thứ tự
    seen: set[str] = set()
    unique: List[str] = []
    for kw in found:
        if kw not in seen:
            seen.add(kw)
            unique.append(kw)

    # Suy ra level
    inferred_level: str | None = None
    for phrase, level in _LEVEL_MAP.items():
        if " " in phrase:
            if phrase in normalized:
                inferred_level = level
                break
        else:
            if re.search(r"\b" + re.escape(phrase) + r"\b", normalized):
                inferred_level = level
                break

    return unique, inferred_level


# ---------------------------------------------------------------------------
# Hàm nội bộ
# ---------------------------------------------------------------------------

def _get_active_cv(user_id: int, db: Session) -> Tuple[CandidateCV | None, CVText | None]:
    cv = (
        db.query(CandidateCV)
        .filter(CandidateCV.user_id == user_id, CandidateCV.is_active == True)
        .order_by(CandidateCV.uploaded_at.desc())
        .first()
    )
    if cv is None:
        return None, None

    cv_text = db.query(CVText).filter(CVText.cv_id == cv.id).first()
    return cv, cv_text


def _score_jobs(
    keywords: List[str],
    inferred_level: str | None,
    db: Session,
) -> List[Tuple[Job, int, str]]:
    """Tính điểm cho tất cả job active, trả list đã sắp xếp giảm dần."""
    jobs = db.query(Job).filter(Job.status == "active").all()

    results: List[Tuple[Job, int, str]] = []

    for job in jobs:
        score, matched = _score_one_job(job, keywords, inferred_level)
        if score > 0:
            reason = "Matched: " + ", ".join(matched[:8]) if matched else ""
            results.append((job, score, reason))

    results.sort(key=lambda x: x[1], reverse=True)
    return results


def _score_one_job(
    job: Job,
    keywords: List[str],
    inferred_level: str | None,
) -> Tuple[int, List[str]]:
    title_lower = (job.title or "").lower()
    req_lower = (job.requirements or "").lower()
    desc_lower = (job.description or "").lower()

    score = 0
    matched: List[str] = []

    for kw in keywords:
        kw_score = 0
        if " " in kw:
            in_title = kw in title_lower
            in_req = kw in req_lower
            in_desc = kw in desc_lower
        else:
            pattern = r"\b" + re.escape(kw) + r"\b"
            in_title = bool(re.search(pattern, title_lower))
            in_req = bool(re.search(pattern, req_lower))
            in_desc = bool(re.search(pattern, desc_lower))

        if in_title:
            kw_score += _W_TITLE
        if in_req:
            kw_score += _W_REQUIREMENTS
        if in_desc:
            kw_score += _W_DESCRIPTION

        if kw_score > 0:
            score += kw_score
            matched.append(kw)

    # Bonus level match
    if inferred_level and job.level and job.level == inferred_level:
        score += _W_LEVEL

    return score, matched


def _fallback_recent_jobs(db: Session, n: int) -> List[Job]:
    return (
        db.query(Job)
        .filter(Job.status == "active")
        .order_by(Job.created_at.desc())
        .limit(n)
        .all()
    )
