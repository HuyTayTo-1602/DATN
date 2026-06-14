from fastapi import APIRouter, BackgroundTasks, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.application import ApplyRequest, ApplicationResponse, StatusUpdateRequest
from app.services import application_service, notification_dispatcher
from app.middleware.auth import get_current_user, require_job_seeker, require_recruiter
from app.models.user import User
from app.websocket.notification_hub import hub

router = APIRouter(prefix="/applications", tags=["Ứng tuyển"])


@router.post("/{job_id}", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_for_job(
    job_id: int,
    request: ApplyRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_job_seeker),
    db: Session = Depends(get_db),
):
    """Ứng viên nộp đơn ứng tuyển vào một tin tuyển dụng."""
    result = application_service.apply_job(job_id, request, current_user, db)
    recruiter_id = result.pop("recruiter_id", None)
    if recruiter_id:
        applicant_label = result.get("applicant_name") or result.get("applicant_email", "Ứng viên")
        payload = notification_dispatcher.notify(
            db,
            user_id=recruiter_id,
            type="application_submitted",
            title="Đơn ứng tuyển mới",
            message=f"{applicant_label} đã nộp đơn vào vị trí {result.get('job_title', '')}",
            related_id=job_id,
            related_type="job_application",
        )
        background_tasks.add_task(hub.push, recruiter_id, payload)
    return result


@router.get("/mine", response_model=list[ApplicationResponse])
def get_my_applications(
    current_user: User = Depends(require_job_seeker),
    db: Session = Depends(get_db),
):
    """Ứng viên xem danh sách tất cả đơn đã nộp và trạng thái của chúng."""
    return application_service.get_my_applications(current_user, db)


@router.get("/job/{job_id}", response_model=list[ApplicationResponse])
def get_applicants_for_job(
    job_id: int,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Nhà tuyển dụng xem danh sách ứng viên đã nộp đơn vào job."""
    return application_service.get_applications_for_job(job_id, current_user, db)


@router.get("/{application_id}/cv")
def stream_cv(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream file CV của đơn ứng tuyển về browser."""
    file_stream, filename = application_service.get_cv_stream(application_id, current_user, db)
    return StreamingResponse(
        file_stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{filename}"},
    )


@router.put("/{application_id}/status", response_model=ApplicationResponse)
def update_status(
    application_id: int,
    request: StatusUpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Nhà tuyển dụng cập nhật trạng thái đơn ứng tuyển (accepted/rejected)."""
    result = application_service.update_application_status(application_id, request, current_user, db)
    candidate_id = result.get("user_id")
    if candidate_id and request.status in ("accepted", "rejected"):
        if request.status == "accepted":
            title = "Đơn ứng tuyển được chấp nhận"
            message = f"Đơn ứng tuyển của bạn vào vị trí {result.get('job_title', '')} đã được chấp nhận."
        else:
            title = "Đơn ứng tuyển bị từ chối"
            message = f"Đơn ứng tuyển của bạn vào vị trí {result.get('job_title', '')} đã bị từ chối."
        payload = notification_dispatcher.notify(
            db,
            user_id=candidate_id,
            type=f"application_{request.status}",
            title=title,
            message=message,
            related_id=application_id,
            related_type="job_application",
        )
        background_tasks.add_task(hub.push, candidate_id, payload)
    return result
