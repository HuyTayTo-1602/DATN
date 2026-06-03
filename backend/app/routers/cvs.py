from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.database import get_db
from app.middleware.auth import require_job_seeker
from app.models.user import User
from app.schemas.cv import CVActivateResponse, CVUploadResponse
from app.services import cv_storage_service
from app.services.cv_parse_service import parse_and_save

settings = get_settings()
router = APIRouter(prefix="/cvs", tags=["CV"])

_ALLOWED_MIME = {"application/pdf"}


@router.post("/upload", response_model=CVUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_job_seeker),
    db: Session = Depends(get_db),
):
    """Ứng viên upload CV PDF. File được lưu trên MinIO; text được parse inline."""
    if file.content_type not in _ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file PDF")

    file_bytes = await file.read()

    if len(file_bytes) > settings.MAX_CV_FILE_SIZE:
        max_mb = settings.MAX_CV_FILE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"File quá lớn, tối đa {max_mb} MB")

    cv = cv_storage_service.upload_cv(file_bytes, file.filename or "cv.pdf", len(file_bytes), current_user, db)

    # Parse PDF ngay sau khi upload — lỗi parse không ảnh hưởng luồng upload
    parse_and_save(cv.id, file_bytes, db)
    db.refresh(cv)

    parse_status = cv.cv_text.parse_status if cv.cv_text else "pending"
    return CVUploadResponse(
        id=cv.id,
        file_name=cv.file_name,
        is_active=cv.is_active,
        parse_status=parse_status,
        message="Upload CV thành công",
    )


@router.get("/me")
def get_my_cvs(
    current_user: User = Depends(require_job_seeker),
    db: Session = Depends(get_db),
):
    """Ứng viên lấy danh sách CV của mình (mới nhất trước)."""
    return cv_storage_service.get_my_cvs(current_user, db)


@router.post("/{cv_id}/activate", response_model=CVActivateResponse)
def activate_cv(
    cv_id: int,
    current_user: User = Depends(require_job_seeker),
    db: Session = Depends(get_db),
):
    """Đặt một CV là active, các CV còn lại tự động inactive."""
    return cv_storage_service.activate_cv(cv_id, current_user, db)
