"""
Communication Routes
POST /api/communication/email-broadcast
POST /api/communication/push-notification
POST /api/communication/system-alert
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from datetime import datetime

from database import get_db
from middleware.auth import require_teacher_or_admin
from utils.email_service import send_email_async

router = APIRouter(prefix="/api/communication", tags=["communication"])


class EmailBroadcastRequest(BaseModel):
    subject: str
    message: str
    recipients: List[str]


class PushNotificationRequest(BaseModel):
    title: str
    message: str
    recipients: List[str]


class SystemAlertRequest(BaseModel):
    message: str
    severity: str
    recipients: List[str]


@router.post("/email-broadcast")
async def send_email_broadcast(
    data: EmailBroadcastRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    sent_count = 0
    for recipient in data.recipients:
        try:
            await send_email_async(
                to_email=recipient,
                subject=data.subject,
                body_text=data.message,
            )
            sent_count += 1
        except Exception:
            continue

    await db.communications.insert_one({
        "type": "email",
        "subject": data.subject,
        "message": data.message,
        "recipients": data.recipients,
        "sent_by": str(current_user["_id"]),
        "sent_at": datetime.utcnow().isoformat(),
        "status": "sent" if sent_count == len(data.recipients) else "partial",
    })
    return {
        "message": f"Email broadcast sent to {sent_count}/{len(data.recipients)} recipients",
        "sent_count": sent_count,
    }


@router.post("/push-notification")
async def send_push_notification(
    data: PushNotificationRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    # Insert notifications for all recipients
    docs = [{
        "user_id": uid,
        "title": data.title,
        "message": data.message,
        "type": "info",
        "read": False,
        "timestamp": datetime.utcnow().isoformat(),
    } for uid in data.recipients]

    if docs:
        await db.notifications.insert_many(docs)

    return {
        "message": f"Push notification sent to {len(data.recipients)} users",
        "sent_count": len(data.recipients)
    }


@router.post("/system-alert")
async def send_system_alert(
    data: SystemAlertRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    notif_type = "error" if data.severity == "high" else "warning" if data.severity == "medium" else "info"

    docs = [{
        "user_id": uid,
        "title": "System Alert",
        "message": data.message,
        "type": notif_type,
        "priority": data.severity,
        "read": False,
        "timestamp": datetime.utcnow().isoformat(),
    } for uid in data.recipients]

    if docs:
        await db.notifications.insert_many(docs)

    return {
        "message": f"System alert sent to {len(data.recipients)} users",
        "severity": data.severity
    }
