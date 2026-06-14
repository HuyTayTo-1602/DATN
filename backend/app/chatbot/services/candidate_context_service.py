"""
Load personal profile and active CV text for a job_seeker candidate.
Used by the chatbot to personalise general Q&A answers.
"""

import logging
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.models.profile import UserProfile
from app.models.user import User
from app.models.candidate_cv import CandidateCV

logger = logging.getLogger(__name__)

_CV_TEXT_LIMIT = 6000  # chars — stay well within LLM context budget


def load_candidate_context(
    user_id: int, db: Session
) -> Tuple[Optional[dict], Optional[str], Optional[str]]:
    """
    Return (profile_dict, cv_text, cv_note) for the given job_seeker.

    profile_dict  — personal info (full_name, email, skills, experience, …)
    cv_text       — extracted text from the active CV (truncated); None when unavailable
    cv_note       — human-readable status note when cv_text is None, e.g.
                    "CV đã tải lên nhưng chưa được trích xuất" or
                    "Chưa có CV nào được tải lên"
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

        profile_dict: Optional[dict] = None
        if profile or user:
            profile_dict = {
                "full_name": profile.full_name if profile else None,
                "email": user.email if user else None,
                "phone": profile.phone if profile else None,
                "address": profile.address if profile else None,
                "dob": str(profile.dob) if profile and profile.dob else None,
                "skills": profile.skills if profile else None,
                "experience": profile.experience if profile else None,
                "education": profile.education if profile else None,
                "bio": profile.bio if profile else None,
            }

        cv_text: Optional[str] = None
        cv_note: Optional[str] = None

        active_cv = (
            db.query(CandidateCV)
            .filter(CandidateCV.user_id == user_id, CandidateCV.is_active == True)
            .first()
        )

        if active_cv:
            cv_record = active_cv.cv_text  # CVText relationship
            if cv_record and cv_record.parse_status == "success":
                raw = cv_record.extracted_text or ""
                cv_text = raw[:_CV_TEXT_LIMIT] if len(raw) > _CV_TEXT_LIMIT else raw
            elif cv_record:
                cv_note = (
                    f"Ứng viên đã tải lên CV '{active_cv.file_name}' "
                    f"nhưng nội dung chưa được trích xuất "
                    f"(trạng thái: {cv_record.parse_status})."
                )
            else:
                cv_note = f"Ứng viên đã tải lên CV '{active_cv.file_name}' nhưng chưa có dữ liệu văn bản."
        else:
            # Check if any CV exists (not active)
            any_cv = (
                db.query(CandidateCV)
                .filter(CandidateCV.user_id == user_id)
                .first()
            )
            if any_cv:
                cv_note = "Ứng viên có CV nhưng chưa có CV nào được đặt làm CV chính (is_active=False)."
            else:
                cv_note = "Ứng viên chưa tải lên CV nào trên hệ thống."

        return profile_dict, cv_text, cv_note

    except Exception:
        logger.exception("load_candidate_context failed for user_id=%s", user_id)
        return None, None, None
