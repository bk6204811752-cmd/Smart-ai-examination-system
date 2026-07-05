"""
Notification Routes
GET    /api/notifications
POST   /api/notifications/send
PATCH  /api/notifications/read
PATCH  /api/notifications/read-all
DELETE /api/notifications/{id}
GET    /api/notifications/stats
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime

from database import get_db
from middleware.auth import get_current_user, require_teacher_or_admin

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def serialize(doc):
    if not doc:
        return None
    d = {**doc}
    d["_id"] = str(d["_id"])
    return d


class SendNotificationRequest(BaseModel):
    user_ids: List[str]
    title: str
    message: str
    type: Optional[str] = "info"
    action_url: Optional[str] = None
    priority: Optional[str] = "normal"
    channels: Optional[List[str]] = ["push"]


@router.get("")
async def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": str(current_user["_id"])}
    if unread_only:
        query["read"] = False

    cursor = db.notifications.find(query).sort("_id", -1).limit(limit)
    notifs = [serialize(n) async for n in cursor]
    return notifs


@router.post("/send")
async def send_notification(
    data: SendNotificationRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    docs = []
    for uid in data.user_ids:
        docs.append({
            "user_id": uid,
            "title": data.title,
            "message": data.message,
            "type": data.type,
            "action_url": data.action_url,
            "priority": data.priority,
            "channels": data.channels,
            "read": False,
            "timestamp": datetime.utcnow().isoformat(),
        })

    if docs:
        await db.notifications.insert_many(docs)

    return {"message": f"Notification sent to {len(data.user_ids)} users"}


@router.patch("/read")
async def mark_as_read(
    notification_ids: List[str],
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    oids = []
    for nid in notification_ids:
        try:
            oids.append(ObjectId(nid))
        except Exception:
            pass

    await db.notifications.update_many(
        {"_id": {"$in": oids}, "user_id": str(current_user["_id"])},
        {"$set": {"read": True}}
    )
    return {"message": "Notifications marked as read"}


@router.patch("/read-all")
async def mark_all_as_read(
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    await db.notifications.update_many(
        {"user_id": str(current_user["_id"])},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}


@router.get("/stats")
async def get_notification_stats(
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    total = await db.notifications.count_documents({"user_id": str(current_user["_id"])})
    unread = await db.notifications.count_documents({"user_id": str(current_user["_id"]), "read": False})
    return {"total": total, "unread": unread}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        oid = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    result = await db.notifications.delete_one(
        {"_id": oid, "user_id": str(current_user["_id"])}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}
