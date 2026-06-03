from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.candidate_cv import CandidateCV
from app.models.cv_text import CVText
from app.integrations.minio_client import build_object_key, upload_file
from app.config import get_settings
from app.models.user import User

settings = get_settings()


def upload_cv(
    file_bytes: bytes,
    filename: str,
    file_size: int,
    current_user: User,
    db: Session,
) -> CandidateCV:
    object_key = build_object_key(current_user.id, filename)
    upload_file(file_bytes, object_key)

    # Deactivate all previous CVs of this user
    db.query(CandidateCV).filter(
        CandidateCV.user_id == current_user.id,
        CandidateCV.is_active == True,
    ).update({"is_active": False})

    cv = CandidateCV(
        user_id=current_user.id,
        file_name=filename,
        object_key=object_key,
        bucket_name=settings.MINIO_BUCKET_NAME,
        mime_type="application/pdf",
        file_size=file_size,
        is_active=True,
    )
    db.add(cv)
    db.flush()

    cv_text = CVText(cv_id=cv.id, parse_status="pending")
    db.add(cv_text)
    db.commit()
    db.refresh(cv)
    return cv


def get_my_cvs(current_user: User, db: Session) -> list[dict]:
    cvs = (
        db.query(CandidateCV)
        .filter(CandidateCV.user_id == current_user.id)
        .order_by(CandidateCV.uploaded_at.desc())
        .all()
    )
    return [
        {
            "id": cv.id,
            "user_id": cv.user_id,
            "file_name": cv.file_name,
            "object_key": cv.object_key,
            "bucket_name": cv.bucket_name,
            "mime_type": cv.mime_type,
            "file_size": cv.file_size,
            "is_active": cv.is_active,
            "uploaded_at": cv.uploaded_at,
            "parse_status": cv.cv_text.parse_status if cv.cv_text else "pending",
        }
        for cv in cvs
    ]


def activate_cv(cv_id: int, current_user: User, db: Session) -> dict:
    cv = (
        db.query(CandidateCV)
        .filter(CandidateCV.id == cv_id, CandidateCV.user_id == current_user.id)
        .first()
    )
    if not cv:
        raise HTTPException(status_code=404, detail="CV không tìm thấy")

    db.query(CandidateCV).filter(CandidateCV.user_id == current_user.id).update({"is_active": False})
    cv.is_active = True
    db.commit()
    return {"message": "Đã kích hoạt CV", "cv_id": cv_id}
