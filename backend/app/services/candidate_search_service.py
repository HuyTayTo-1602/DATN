"""
Service tìm kiếm ứng viên theo keyword/skill.

Chiến lược chấm điểm:
  - Profile score (weight A=1.0): full_name, skills (weight A), experience (weight B)
  - CV text score  (weight B=0.4): extracted_text từ CV active/mới nhất
  - final_score = profile_score + 0.4 * cv_score
  - Ưu tiên candidates có skills khớp trực tiếp (profile) hơn chỉ mention trong CV
  - Mỗi ứng viên chỉ xuất hiện một lần (dedup theo user_id)
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import func, cast, Float, or_
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import TSVECTOR

from app.models.candidate_cv import CandidateCV
from app.models.cv_text import CVText
from app.models.profile import UserProfile
from app.models.user import User

# Trọng số khi kết hợp điểm profile và CV text
_CV_WEIGHT = 0.4


def _build_tsquery(q: str) -> str:
    """
    Chuyển chuỗi query thành cú pháp tsquery OR.
    "java python" → "java | python"
    Giữ nguyên mỗi token, ghép bằng |, cho phép match BẤT KỲ term.
    """
    tokens = [t.strip() for t in q.split() if t.strip()]
    if not tokens:
        return ""
    return " | ".join(tokens)


def score_profile_match(q: str, skills: Optional[str], experience: Optional[str], full_name: Optional[str]) -> float:
    """
    Tính điểm match profile bằng đếm từ khớp (dùng cho unit test không cần DB).
    Trả về số từ trong q xuất hiện trong skills/experience/full_name.
    Skills được nhân đôi trọng số.
    """
    tokens = [t.lower().strip() for t in q.split() if t.strip()]
    if not tokens:
        return 0.0
    combined_skills = (skills or "").lower()
    combined_exp = (experience or "").lower()
    combined_name = (full_name or "").lower()
    score = 0.0
    for token in tokens:
        if token in combined_skills:
            score += 2.0  # weight A × 2
        if token in combined_exp:
            score += 1.0  # weight B
        if token in combined_name:
            score += 2.0  # weight A
    return score


def score_cv_text_match(q: str, extracted_text: Optional[str]) -> float:
    """
    Tính điểm match CV text (dùng cho unit test không cần DB).
    Đếm số lần xuất hiện của mỗi từ trong extracted_text.
    """
    tokens = [t.lower().strip() for t in q.split() if t.strip()]
    if not tokens or not extracted_text:
        return 0.0
    text = extracted_text.lower()
    return sum(1.0 for token in tokens if token in text)


def search_candidates(
    q: str,
    db: Session,
    page: int = 1,
    page_size: int = 10,
) -> dict:
    """
    Tìm kiếm ứng viên theo keyword.

    Quy trình:
    1. Chuyển q thành tsquery (OR giữa các từ)
    2. Query user_profiles theo search_vector, tính ts_rank
    3. LEFT JOIN sang CV active/mới nhất → lấy cv_text.search_vector để tính thêm điểm
    4. final_score = profile_rank + _CV_WEIGHT * cv_rank
    5. Dedup theo user_id, sắp xếp final_score giảm dần
    6. Phân trang

    Fallback: nếu q rỗng → trả về tất cả ứng viên active có profile, sắp xếp theo updated_at.
    """
    q = q.strip()

    if not q:
        return _list_all_candidates(db, page, page_size)

    tsquery_str = _build_tsquery(q)
    if not tsquery_str:
        return _list_all_candidates(db, page, page_size)

    tsquery_expr = func.to_tsquery("simple", tsquery_str)

    # ILIKE conditions: mỗi token match substring trong skills/full_name/experience/bio
    tokens = [t.strip() for t in q.split() if t.strip()]
    ilike_filters = []
    for token in tokens:
        pattern = f"%{token}%"
        ilike_filters.extend([
            UserProfile.skills.ilike(pattern),
            UserProfile.full_name.ilike(pattern),
            UserProfile.experience.ilike(pattern),
            UserProfile.bio.ilike(pattern),
        ])

    # Subquery: lấy CV active hoặc mới nhất cho mỗi user
    latest_cv_sq = (
        db.query(
            CandidateCV.user_id.label("cv_user_id"),
            func.max(CandidateCV.id).label("cv_id"),
        )
        .filter(CandidateCV.is_active == True)
        .group_by(CandidateCV.user_id)
        .subquery()
    )

    # Fallback: nếu không có active CV, dùng CV mới nhất uploaded
    fallback_cv_sq = (
        db.query(
            CandidateCV.user_id.label("cv_user_id"),
            func.max(CandidateCV.id).label("cv_id"),
        )
        .group_by(CandidateCV.user_id)
        .subquery()
    )

    # Profile rank — trả 0 nếu search_vector null
    profile_rank = func.coalesce(
        func.ts_rank(
            cast(UserProfile.search_vector, TSVECTOR),
            tsquery_expr,
        ),
        0.0,
    )

    # CV text rank — trả 0 nếu không có CV hoặc search_vector null
    cv_rank = func.coalesce(
        func.ts_rank(
            cast(CVText.search_vector, TSVECTOR),
            tsquery_expr,
        ),
        0.0,
    )

    final_score = (profile_rank + cast(_CV_WEIGHT, Float) * cv_rank).label("final_score")

    base_q = (
        db.query(
            UserProfile,
            User,
            CandidateCV.id.label("cv_id"),
            CandidateCV.file_name.label("cv_file_name"),
            final_score,
        )
        .join(User, User.id == UserProfile.user_id)
        .outerjoin(latest_cv_sq, latest_cv_sq.c.cv_user_id == UserProfile.user_id)
        .outerjoin(CandidateCV, CandidateCV.id == latest_cv_sq.c.cv_id)
        .outerjoin(CVText, CVText.cv_id == CandidateCV.id)
        .filter(User.status == "active")
        .filter(
            # Full-text search HOẶC partial match (ILIKE) trên các field profile
            (UserProfile.search_vector.op("@@")(tsquery_expr))
            | (CVText.search_vector.op("@@")(tsquery_expr))
            | or_(*ilike_filters)
        )
        .order_by(final_score.desc())
    )

    total = base_q.count()
    rows = base_q.offset((page - 1) * page_size).limit(page_size).all()

    items = [_row_to_dict(row) for row in rows]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


def _list_all_candidates(db: Session, page: int, page_size: int) -> dict:
    """Trả về tất cả ứng viên active có profile khi q rỗng."""
    latest_cv_sq = (
        db.query(
            CandidateCV.user_id.label("cv_user_id"),
            func.max(CandidateCV.id).label("cv_id"),
        )
        .filter(CandidateCV.is_active == True)
        .group_by(CandidateCV.user_id)
        .subquery()
    )

    base_q = (
        db.query(
            UserProfile,
            User,
            CandidateCV.id.label("cv_id"),
            CandidateCV.file_name.label("cv_file_name"),
        )
        .join(User, User.id == UserProfile.user_id)
        .outerjoin(latest_cv_sq, latest_cv_sq.c.cv_user_id == UserProfile.user_id)
        .outerjoin(CandidateCV, CandidateCV.id == latest_cv_sq.c.cv_id)
        .filter(User.status == "active")
        .order_by(UserProfile.updated_at.desc())
    )

    total = base_q.count()
    rows = base_q.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for row in rows:
        profile, user, cv_id, cv_file_name = row[0], row[1], row[2], row[3]
        items.append({
            "user_id": user.id,
            "email": user.email,
            "full_name": profile.full_name,
            "skills": profile.skills,
            "experience": profile.experience,
            "bio": profile.bio,
            "avatar_url": profile.avatar_url,
            "cv_id": cv_id,
            "cv_file_name": cv_file_name,
            "score": 0.0,
        })

    return {"total": total, "page": page, "page_size": page_size, "items": items}


def _row_to_dict(row) -> dict:
    profile: UserProfile = row[0]
    user: User = row[1]
    cv_id = row[2]
    cv_file_name = row[3]
    score = float(row[4]) if row[4] is not None else 0.0

    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": profile.full_name,
        "skills": profile.skills,
        "experience": profile.experience,
        "bio": profile.bio,
        "avatar_url": profile.avatar_url,
        "cv_id": cv_id,
        "cv_file_name": cv_file_name,
        "score": round(score, 4),
    }
