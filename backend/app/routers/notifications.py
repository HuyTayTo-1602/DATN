from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.services import notification_service
from app.middleware.auth import get_current_user
from app.models.user import User
from app.websocket.notification_hub import hub
from app.utils.jwt import decode_access_token

router = APIRouter(prefix="/notifications", tags=["Thông báo"])


@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy danh sách thông báo của user hiện tại, mới nhất trước."""
    return notification_service.get_notifications(db, current_user.id, limit, offset)


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trả về số lượng thông báo chưa đọc."""
    count = notification_service.get_unread_count(db, current_user.id)
    return {"count": count}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Đánh dấu một thông báo là đã đọc."""
    notif = notification_service.mark_as_read(db, notification_id, current_user.id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thông báo không tồn tại")
    return notif


@router.post("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Đánh dấu tất cả thông báo là đã đọc."""
    count = notification_service.mark_all_as_read(db, current_user.id)
    return {"marked": count}


@router.websocket("/ws")
async def notification_ws(
    websocket: WebSocket,
    token: str = Query(None),
):
    """
    WebSocket endpoint realtime.
    Client kết nối: ws://<host>/api/v1/notifications/ws?token=<jwt>
    Dữ liệu DB vẫn luôn được lưu — socket chỉ là lớp bổ sung.
    """
    if not token:
        await websocket.close(code=1008)
        return

    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=1008)
        return

    try:
        user_id = int(payload.get("sub", 0))
    except (ValueError, TypeError):
        await websocket.close(code=1008)
        return

    await hub.connect(user_id, websocket)
    try:
        while True:
            # Keep alive — client may send "ping" text frames
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(user_id, websocket)
