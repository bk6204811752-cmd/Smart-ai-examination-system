"""
Security Center Routes
GET    /api/security/overview       — Aggregated security stats
GET    /api/security/logs           — Paginated access/audit logs
GET    /api/security/events         — Paginated security events
GET    /api/security/blocked-ips    — Blocked IPs
POST   /api/security/block-ip       — Block a new IP
POST   /api/security/unblock-ip     — Unblock an IP
POST   /api/security/log-event      — Log a security event (internal)
POST   /api/security/log-access     — Log an access record (internal)
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from database import get_db
from middleware.auth import require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/api/security", tags=["security"])


class LogEventRequest(BaseModel):
    type: str
    severity: str = "medium"
    description: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    ip_address: Optional[str] = None
    metadata: Optional[dict] = None


class LogAccessRequest(BaseModel):
    action: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    device: Optional[str] = None
    status: str = "success"


class BlockIPRequest(BaseModel):
    ip: str
    reason: str


class UnblockIPRequest(BaseModel):
    ip: str


# ─── Overview Stats ─────────────────────────────────────────────────

@router.get("/overview")
async def get_security_overview(
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_access = await db.audit_logs.count_documents({})
    today_access = await db.audit_logs.count_documents({"timestamp": {"$gte": today_start.isoformat()}})
    failed_logins = await db.audit_logs.count_documents({"status": "failed"})
    today_failed = await db.audit_logs.count_documents({
        "status": "failed",
        "timestamp": {"$gte": today_start.isoformat()}
    })

    active_sessions = await db.exams.count_documents({"status": "active"})

    blocked_count = await db.blocked_ips.count_documents({"active": True})
    blocked_today = await db.blocked_ips.count_documents({
        "active": True,
        "blocked_at": {"$gte": today_start}
    })

    open_events = await db.security_events.count_documents({"resolved": False})
    total_events = await db.security_events.count_documents({})

    return {
        "total_access": total_access,
        "today_access": today_access,
        "failed_logins": failed_logins,
        "today_failed_logins": today_failed,
        "active_sessions": active_sessions,
        "blocked_ips": blocked_count,
        "blocked_today": blocked_today,
        "open_events": open_events,
        "total_events": total_events,
    }


# ─── Access / Audit Logs ───────────────────────────────────────────

@router.get("/logs")
async def get_access_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    time_range: str = "7d",
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    query: dict = {}

    from datetime import timedelta
    now = datetime.utcnow()
    if time_range == "24h":
        cutoff = (now - timedelta(hours=24)).isoformat()
    elif time_range == "7d":
        cutoff = (now - timedelta(days=7)).isoformat()
    elif time_range == "30d":
        cutoff = (now - timedelta(days=30)).isoformat()
    else:
        cutoff = (now - timedelta(days=7)).isoformat()

    if time_range != "all":
        query["timestamp"] = {"$gte": cutoff}

    if status and status != "all":
        query["status"] = status

    if search:
        escaped_search = re.escape(search)
        query["$or"] = [
            {"user_name": {"$regex": escaped_search, "$options": "i"}},
            {"ip_address": {"$regex": escaped_search, "$options": "i"}},
            {"action": {"$regex": escaped_search, "$options": "i"}},
        ]

    total = await db.audit_logs.count_documents(query)
    skip = (page - 1) * per_page
    logs = await db.audit_logs.find(query).sort("timestamp", -1).skip(skip).limit(per_page).to_list(per_page)

    result = []
    for log in logs:
        result.append({
            "id": str(log["_id"]),
            "user_id": log.get("user_id", ""),
            "user_name": log.get("user_name", "Unknown"),
            "action": log.get("action", ""),
            "ip_address": log.get("ip_address", ""),
            "location": log.get("location", "Unknown"),
            "device": log.get("device", "Unknown"),
            "status": log.get("status", "success"),
            "timestamp": log.get("timestamp", ""),
        })

    return {
        "logs": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
    }


# ─── Security Events ───────────────────────────────────────────────

@router.get("/events")
async def get_security_events(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    query: dict = {}

    if severity and severity != "all":
        query["severity"] = severity
    if resolved is not None:
        query["resolved"] = resolved

    total = await db.security_events.count_documents(query)
    skip = (page - 1) * per_page
    events = await db.security_events.find(query).sort("timestamp", -1).skip(skip).limit(per_page).to_list(per_page)

    result = []
    for ev in events:
        result.append({
            "id": str(ev["_id"]),
            "type": ev.get("type", "suspicious_activity"),
            "severity": ev.get("severity", "medium"),
            "description": ev.get("description", ""),
            "user": ev.get("user_name", ev.get("user_id", "Unknown")),
            "user_id": ev.get("user_id", ""),
            "ip_address": ev.get("ip_address", ""),
            "timestamp": ev.get("timestamp", ""),
            "resolved": ev.get("resolved", False),
            "metadata": ev.get("metadata"),
        })

    return {
        "events": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
    }


# ─── Blocked IPs ───────────────────────────────────────────────────

@router.get("/blocked-ips")
async def get_blocked_ips(
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    ips = await db.blocked_ips.find({"active": True}).sort("blocked_at", -1).to_list(100)
    result = []
    for ip in ips:
        result.append({
            "ip": ip["ip"],
            "reason": ip.get("reason", ""),
            "blocked_at": ip.get("blocked_at", ""),
            "attempts": ip.get("attempts", 0),
            "blocked_by": ip.get("blocked_by", ""),
        })
    return {"blocked_ips": result}


@router.post("/block-ip")
async def block_ip(
    data: BlockIPRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    existing = await db.blocked_ips.find_one({"ip": data.ip, "active": True})
    if existing:
        raise HTTPException(status_code=409, detail="IP already blocked")

    await db.blocked_ips.insert_one({
        "ip": data.ip,
        "reason": data.reason,
        "blocked_at": datetime.utcnow(),
        "attempts": 0,
        "blocked_by": str(current_user["_id"]),
        "active": True,
    })

    return {"message": f"IP {data.ip} blocked successfully"}


@router.post("/unblock-ip")
async def unblock_ip(
    data: UnblockIPRequest,
    db=Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    result = await db.blocked_ips.update_one(
        {"ip": data.ip, "active": True},
        {"$set": {"active": False, "unblocked_at": datetime.utcnow()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="IP not found or already unblocked")

    return {"message": f"IP {data.ip} unblocked successfully"}


# ─── Internal Logging Endpoints ────────────────────────────────────

@router.post("/log-event")
async def log_security_event(
    data: LogEventRequest,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    doc = {
        "type": data.type,
        "severity": data.severity,
        "description": data.description,
        "user_id": data.user_id or str(current_user["_id"]),
        "user_name": data.user_name or current_user.get("full_name", ""),
        "ip_address": data.ip_address or "",
        "timestamp": datetime.utcnow().isoformat(),
        "resolved": False,
        "metadata": data.metadata or {},
    }
    await db.security_events.insert_one(doc)
    return {"message": "Event logged"}


@router.post("/log-access")
async def log_access(
    data: LogAccessRequest,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    doc = {
        "action": data.action,
        "user_id": data.user_id or str(current_user["_id"]),
        "user_name": data.user_name or current_user.get("full_name", "Unknown"),
        "ip_address": data.ip_address or "",
        "location": data.location or "Unknown",
        "device": data.device or "Unknown",
        "status": data.status,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await db.audit_logs.insert_one(doc)
    return {"message": "Access logged"}
