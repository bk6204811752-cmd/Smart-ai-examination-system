"""
Webhook Management Routes
GET    /api/webhooks
POST   /api/webhooks
PATCH  /api/webhooks/{id}
DELETE /api/webhooks/{id}
GET    /api/webhooks/{id}/logs
POST   /api/webhooks/{id}/test
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
import httpx

from database import get_db
from middleware.auth import require_admin

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


def serialize(doc):
    d = {**doc}
    d["_id"] = str(d["_id"])
    return d


class RegisterWebhookRequest(BaseModel):
    name: str
    url: str
    events: List[str]
    secret: str
    active: Optional[bool] = True


class UpdateWebhookRequest(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[List[str]] = None
    secret: Optional[str] = None
    active: Optional[bool] = None


@router.get("")
async def get_webhooks(
    active_only: bool = Query(False),
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    query = {}
    if active_only:
        query["active"] = True

    cursor = db.webhooks.find(query).sort("_id", -1)
    webhooks = [serialize(w) async for w in cursor]
    return webhooks


@router.post("")
async def register_webhook(
    data: RegisterWebhookRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    webhook_doc = {
        "name": data.name,
        "url": data.url,
        "events": data.events,
        "secret": data.secret,
        "active": data.active,
        "created_by": str(current_user["_id"]),
        "created_at": datetime.utcnow().isoformat(),
        "success_count": 0,
        "failure_count": 0,
    }
    result = await db.webhooks.insert_one(webhook_doc)
    webhook_doc["_id"] = result.inserted_id
    return serialize(webhook_doc)


@router.patch("/{webhook_id}")
async def update_webhook(
    webhook_id: str,
    data: UpdateWebhookRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    try:
        oid = ObjectId(webhook_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook ID")

    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    result = await db.webhooks.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Webhook not found")

    webhook = await db.webhooks.find_one({"_id": oid})
    return serialize(webhook)


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    try:
        oid = ObjectId(webhook_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook ID")

    result = await db.webhooks.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return {"message": "Webhook deleted"}


@router.get("/{webhook_id}/logs")
async def get_webhook_logs(
    webhook_id: str,
    limit: int = Query(50),
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    cursor = db.webhook_logs.find({"webhook_id": webhook_id}).sort("_id", -1).limit(limit)
    logs = [serialize(l) async for l in cursor]
    return logs


@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    try:
        oid = ObjectId(webhook_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook ID")

    webhook = await db.webhooks.find_one({"_id": oid})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    payload = {
        "event": "test",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {"message": "Test webhook from PCMT Smart AI Exam System"}
    }

    success = False
    error_msg = None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook["url"], json=payload)
            success = resp.status_code < 400
    except Exception as e:
        error_msg = str(e)

    # Log the test
    await db.webhook_logs.insert_one({
        "webhook_id": webhook_id,
        "event": "test",
        "status": "success" if success else "failed",
        "error": error_msg,
        "timestamp": datetime.utcnow().isoformat(),
    })

    field = "success_count" if success else "failure_count"
    await db.webhooks.update_one({"_id": oid}, {"$inc": {field: 1}})

    return {
        "success": success,
        "message": "Test successful" if success else f"Test failed: {error_msg}"
    }
