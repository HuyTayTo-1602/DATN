from typing import Optional
from sqlalchemy.orm import Session

from app.services.notification_service import create_notification


def _to_payload(notif) -> dict:
    return {
        "id": notif.id,
        "type": notif.type,
        "title": notif.title,
        "message": notif.message,
        "is_read": False,
        "related_id": notif.related_id,
        "related_type": notif.related_type,
        "created_at": notif.created_at.isoformat() if notif.created_at else None,
    }


def notify(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    related_id: Optional[int] = None,
    related_type: Optional[str] = None,
) -> dict:
    """Persist notification to DB and return a WebSocket-ready payload dict."""
    notif = create_notification(db, user_id, type, title, message, related_id, related_type)
    return _to_payload(notif)
