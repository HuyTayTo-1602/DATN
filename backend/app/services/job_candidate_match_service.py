"""
Service khớp ứng viên với job bằng PostgreSQL full-text search.

Thuật toán:
  1. Trích xuất token từ title + requirements + description của job
  2. Xây dựng OR-tsquery: "token1 | token2 | ..."
  3. Dùng ts_rank(candidate.search_vector, job_tsquery) làm điểm profile
  4. Dùng ts_rank(cvtext.search_vector,  job_tsquery) làm điểm CV
  5. final_score = profile_rank + 0.4 * cv_rank
  6. Trả về top-N ứng viên giảm dần theo final_score
"""

from __future__ import annotations

import re

from sqlalchemy import func, cast, Float
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import TSVECTOR

from app.models.candidate_cv import CandidateCV
from app.models.cv_text import CVText
from app.models.job import Job
from app.models.profile import UserProfile
from app.models.user import User

_CV_WEIGHT = 0.4
_MAX_TOKENS = 60
_MIN_TOKEN_LEN = 3


def _build_job_tsquery(job: Job) -> str:
    """
    Gom title + requirements + description thành OR-tsquery.
    Chỉ giữ các token ASCII có độ dài >= _MIN_TOKEN_LEN, dedup, giới hạn _MAX_TOKENS.
    """
    combined = " ".join(filter(None, [job.title, job.requirements, job.description]))
    raw_tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.]*", combined)
    seen: set[str] = set()
    unique: list[str] = []
    for t in raw_tokens:
        tl = t.lower()
        if len(tl) >= _MIN_TOKEN_LEN and tl not in seen:
            seen.add(tl)
            unique.append(tl)
        if len(unique) >= _MAX_TOKENS:
            break
    return " | ".join(unique)


def match_candidates_for_job(
    job_id: int,
    db: Session,
    top_n: int = 5,
) -> dict:
    """
    Tìm ứng viên phù hợp nhất với job_id.

    Trả về dict:
      {
        "job_id": int,
        "items": [
          {
            "user_id", "full_name", "skills", "bio",
            "avatar_url", "cv_id", "cv_file_name", "score"
          },
          ...
        ]
      }
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        return {"job_id": job_id, "items": []}

    tsquery_str = _build_job_tsquery(job)
    if not tsquery_str:
        return {"job_id": job_id, "items": []}

    tsquery_expr = func.to_tsquery("simple", tsquery_str)

    # Subquery: CV active nhất của mỗi ứng viên
    active_cv_sq = (
        db.query(
            CandidateCV.user_id.label("cv_user_id"),
            func.max(CandidateCV.id).label("cv_id"),
        )
        .filter(CandidateCV.is_active == True)
        .group_by(CandidateCV.user_id)
        .subquery()
    )

    profile_rank = func.coalesce(
        func.ts_rank(cast(UserProfile.search_vector, TSVECTOR), tsquery_expr),
        0.0,
    )
    cv_rank = func.coalesce(
        func.ts_rank(cast(CVText.search_vector, TSVECTOR), tsquery_expr),
        0.0,
    )
    final_score = (profile_rank + cast(_CV_WEIGHT, Float) * cv_rank).label("final_score")

    rows = (
        db.query(
            UserProfile,
            User,
            CandidateCV.id.label("cv_id"),
            CandidateCV.file_name.label("cv_file_name"),
            final_score,
        )
        .join(User, User.id == UserProfile.user_id)
        .outerjoin(active_cv_sq, active_cv_sq.c.cv_user_id == UserProfile.user_id)
        .outerjoin(CandidateCV, CandidateCV.id == active_cv_sq.c.cv_id)
        .outerjoin(CVText, CVText.cv_id == CandidateCV.id)
        .filter(User.status == "active")
        .filter(
            (UserProfile.search_vector.op("@@")(tsquery_expr))
            | (CVText.search_vector.op("@@")(tsquery_expr))
        )
        .order_by(final_score.desc())
        .limit(top_n)
        .all()
    )

    items = []
    for row in rows:
        profile: UserProfile = row[0]
        user: User = row[1]
        cv_id = row[2]
        cv_file_name = row[3]
        score = float(row[4]) if row[4] is not None else 0.0
        items.append(
            {
                "user_id": user.id,
                "full_name": profile.full_name,
                "skills": profile.skills,
                "bio": profile.bio,
                "avatar_url": profile.avatar_url,
                "cv_id": cv_id,
                "cv_file_name": cv_file_name,
                "score": round(score, 4),
            }
        )

    return {"job_id": job_id, "items": items}
