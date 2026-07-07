"""
WebSocket Routes for Real-Time Exam Monitoring
GET  /ws/{exam_id}?token=JWT  — Connect (requires JWT token)
GET  /api/ws/stats                   — Connection stats
POST /api/ws/intervene               — Teacher intervention

Security: All WebSocket connections require valid JWT token
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, WebSocketException, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
from datetime import datetime
from jose import JWTError, jwt

from config import settings
from database import get_db
from utils.websocket_manager import manager
from utils.logging_config import get_logger
from middleware.auth import get_current_user

logger = get_logger(__name__)

router = APIRouter(tags=["websocket"])


async def verify_ws_token(token: str) -> dict:
    """Verify JWT token for WebSocket connections"""
    try:
        if not token:
            raise ValueError("No token provided")
        
        # verify_aud=False is required since Supabase aud claim defaults to "authenticated"
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False}
        )
        email = payload.get("email")
        if not email:
            raise ValueError("No email in token")
        
        db = get_db()
        user = await db.users.find_one({"email": email.lower()})
        if not user:
            raise ValueError("User profile not found in system database")
        
        user_id = str(user["_id"])
        role = user.get("role", "student")
        return {"user_id": user_id, "role": role}
    except JWTError as e:
        logger.warning(f"WebSocket JWT verification failed: {e}")
        raise WebSocketException(code=1008, reason="Invalid or expired token")
    except Exception as e:
        logger.warning(f"WebSocket token error: {e}")
        raise WebSocketException(code=1008, reason="Authentication failed")


async def _run_session(websocket: WebSocket, exam_id: str, user_id: str, role: str):
    """Shared session logic for both route patterns."""
    await manager.connect(websocket, exam_id, user_id, role)

    # Send connection confirmation
    await websocket.send_json({
        "type": "connection_established",
        "exam_id": exam_id,
        "user_id": user_id,
        "role": role,
        "timestamp": datetime.utcnow().isoformat(),
        "stats": manager.get_exam_stats(exam_id),
    })

    # Notify teachers that a new student joined
    if role == "student":
        await manager.broadcast_to_teachers(exam_id, {
            "type": "student_joined",
            "student_id": user_id,
            "exam_id": exam_id,
            "timestamp": datetime.utcnow().isoformat(),
        })

    # If teacher joins, send snapshot of all live streams + message history
    if role in ("teacher", "admin"):
        streams = getattr(manager, 'get_active_streams', lambda x: {})(exam_id)
        if streams:
            await websocket.send_json({
                "type": "active_streams",
                "exam_id": exam_id,
                "streams": streams,
                "timestamp": datetime.utcnow().isoformat(),
            })
        # Send message history to teacher
        messages = manager.get_messages(exam_id, limit=100)
        if messages:
            await websocket.send_json({
                "type": "message_history",
                "exam_id": exam_id,
                "messages": messages,
                "timestamp": datetime.utcnow().isoformat(),
            })

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = data.get("type", "")

            # ── Student → Teacher broadcasts ─────────────────────────────────

            if msg_type == "video_frame":
                frame_data = data.get("frame")
                # Cache latest frame for new teacher connections
                if frame_data and hasattr(manager, 'cache_student_frame'):
                    manager.cache_student_frame(exam_id, user_id, frame_data)
                await manager.broadcast_to_teachers(exam_id, {
                    "type": "video_frame",
                    "student_id": user_id,
                    "exam_id": exam_id,
                    "frame": frame_data,
                    "timestamp": data.get("timestamp", datetime.utcnow().isoformat()),
                    "frame_number": data.get("frame_number"),
                    "dimensions": data.get("dimensions"),
                })

            elif msg_type == "ai_violation":
                violation = data.get("violation", {})
                await manager.broadcast_to_teachers(exam_id, {
                    "type": "ai_violation",
                    "student_id": user_id,
                    "exam_id": exam_id,
                    "violation": violation,
                    "timestamp": datetime.utcnow().isoformat(),
                })

            elif msg_type == "proctoring_status":
                status = data.get("status", {})
                if hasattr(manager, 'cache_student_status'):
                    manager.cache_student_status(exam_id, user_id, {
                        **status,
                        "trust_score": data.get("trust_score"),
                        "last_seen": datetime.utcnow().isoformat(),
                    })
                await manager.broadcast_to_teachers(exam_id, {
                    "type": "proctoring_status",
                    "student_id": user_id,
                    "exam_id": exam_id,
                    "status": status,
                    "trust_score": data.get("trust_score"),
                    "timestamp": datetime.utcnow().isoformat(),
                })

            elif msg_type == "heartbeat":
                # Student alive ping → forward to teachers
                if hasattr(manager, 'update_student_heartbeat'):
                    manager.update_student_heartbeat(exam_id, user_id)
                await manager.broadcast_to_teachers(exam_id, {
                    "type": "student_heartbeat",
                    "student_id": user_id,
                    "exam_id": exam_id,
                    "timestamp": datetime.utcnow().isoformat(),
                })
                await websocket.send_json({
                    "type": "heartbeat_ack",
                    "timestamp": datetime.utcnow().isoformat()
                })

            elif msg_type == "brightness_update":
                await manager.broadcast_to_teachers(exam_id, {
                    "type": "brightness_update",
                    "student_id": user_id,
                    "exam_id": exam_id,
                    "brightness": data.get("brightness", 0),
                    "timestamp": datetime.utcnow().isoformat(),
                })

            # ── Teacher → Student messages ────────────────────────────────────

            elif msg_type == "intervention" and role in ("teacher", "admin"):
                target_student = data.get("student_id")
                action = data.get("action", "warn")  # warn | pause | resume | terminate
                intervention_data = {
                    "type": "intervention",
                    "action": action,
                    "message": data.get("message", ""),
                    "from": user_id,
                    "timestamp": datetime.utcnow().isoformat(),
                }
                if target_student:
                    await manager.send_to_student(exam_id, target_student, intervention_data)
                    # Notify other teachers
                    await manager.broadcast_to_teachers(exam_id, {
                        "type": "intervention_sent",
                        "target_student": target_student,
                        "action": action,
                        "by": user_id,
                        "timestamp": datetime.utcnow().isoformat(),
                    })
                else:
                    await manager.broadcast_to_exam(exam_id, intervention_data, exclude_ws=websocket)

            elif msg_type == "teacher_message" and role in ("teacher", "admin"):
                await manager.broadcast_to_exam(exam_id, {
                    "type": "teacher_message",
                    "message": data.get("message", ""),
                    "from": user_id,
                    "timestamp": datetime.utcnow().isoformat(),
                }, exclude_ws=websocket)

            # ── Student ↔ Teacher Chat ───────────────────────────────────────────

            elif msg_type == "student_message" and role == "student":
                message_text = data.get("message", "")
                student_name = data.get("student_name", user_id)
                manager.cache_student_name(user_id, student_name)
                msg_obj = {
                    "type": "student_message",
                    "student_id": user_id,
                    "student_name": student_name,
                    "message": message_text,
                    "timestamp": datetime.utcnow().isoformat(),
                    "message_id": f"msg_{datetime.utcnow().timestamp()}_{user_id}",
                }
                manager.store_message(exam_id, msg_obj)
                await manager.broadcast_to_teachers(exam_id, msg_obj)
                # Ack to student
                await websocket.send_json({
                    "type": "message_ack",
                    "message_id": msg_obj["message_id"],
                    "timestamp": msg_obj["timestamp"],
                })

            elif msg_type == "teacher_reply" and role in ("teacher", "admin"):
                target_student = data.get("student_id")
                message_text = data.get("message", "")
                teacher_name = data.get("teacher_name", user_id)
                msg_obj = {
                    "type": "teacher_reply",
                    "student_id": target_student,
                    "teacher_id": user_id,
                    "teacher_name": teacher_name,
                    "message": message_text,
                    "timestamp": datetime.utcnow().isoformat(),
                    "message_id": f"reply_{datetime.utcnow().timestamp()}_{user_id}",
                }
                manager.store_message(exam_id, msg_obj)
                # Send to target student
                if target_student:
                    await manager.send_to_student(exam_id, target_student, msg_obj)
                    # Notify other teachers
                    await manager.broadcast_to_teachers(exam_id, {
                        **msg_obj,
                        "type": "teacher_reply",
                    })
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No student_id specified for reply",
                    })

            elif msg_type == "request_messages" and role in ("teacher", "admin"):
                """Teacher requests message history for an exam"""
                messages = manager.get_messages(exam_id, limit=100)
                await websocket.send_json({
                    "type": "message_history",
                    "exam_id": exam_id,
                    "messages": messages,
                    "timestamp": datetime.utcnow().isoformat(),
                })

            elif msg_type == "request_streams" and role in ("teacher", "admin"):
                streams = getattr(manager, 'get_active_streams', lambda x: {})(exam_id)
                await websocket.send_json({
                    "type": "active_streams",
                    "exam_id": exam_id,
                    "streams": streams,
                    "timestamp": datetime.utcnow().isoformat(),
                })

            # ── Ping / Pong ────────────────────────────────────────────────────

            elif msg_type == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat(),
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket, exam_id)
        if role == "student":
            await manager.broadcast_to_teachers(exam_id, {
                "type": "student_disconnected",
                "student_id": user_id,
                "exam_id": exam_id,
                "timestamp": datetime.utcnow().isoformat(),
            })


@router.websocket("/ws/{exam_id}")
async def websocket_endpoint(websocket: WebSocket, exam_id: str, token: str = Query(...)):
    """
    Secure WebSocket endpoint - requires JWT token
    Usage: ws://localhost:8000/ws/{exam_id}?token={jwt_token}
    """
    # Verify token before accepting connection
    try:
        auth_data = await verify_ws_token(token)
        user_id = auth_data["user_id"]
        role = auth_data["role"]
    except WebSocketException as e:
        await websocket.close(code=1008, reason=str(e.reason))
        return
    
    logger.info(f"WebSocket connection from {user_id} (role: {role}) to exam {exam_id}")
    await _run_session(websocket, exam_id, user_id, role)


# Legacy endpoints - deprecated but kept for backward compatibility
@router.websocket("/ws/{exam_id}/{user_id}/{role}")
async def websocket_with_role_deprecated(websocket: WebSocket, exam_id: str, user_id: str, role: str):
    """
    DEPRECATED: Use /ws/{exam_id}?token={jwt_token} instead
    Legacy endpoint without JWT verification - do not use in production
    """
    logger.warning(f"Deprecated WebSocket endpoint used by {user_id}. Use JWT token instead.")
    
    # In production, reject this
    if settings.is_production:
        await websocket.close(code=1008, reason="This endpoint is deprecated. Use JWT authentication.")
        return
    
    await _run_session(websocket, exam_id, user_id, role)


@router.websocket("/ws/{exam_id}/{user_id}")
async def websocket_query_role_deprecated(
    websocket: WebSocket,
    exam_id: str,
    user_id: str,
    role: str = Query(default="student"),
):
    """DEPRECATED: Use /ws/{exam_id}?token={jwt_token} instead"""
    logger.warning(f"Deprecated WebSocket endpoint used. Use JWT token instead.")
    
    if settings.is_production:
        await websocket.close(code=1008, reason="This endpoint is deprecated. Use JWT authentication.")
        return
    
    await _run_session(websocket, exam_id, user_id, role)


class InterventionRequest(BaseModel):
    exam_id: str
    student_id: Optional[str] = None
    action: str  # "warn" | "pause" | "resume" | "terminate"
    message: str = ""


@router.post("/api/ws/intervene")
async def teacher_intervene(data: InterventionRequest, current_user: dict = Depends(get_current_user)):
    """HTTP endpoint for teacher interventions (alternative to WebSocket)"""
    if current_user["role"] not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Only teachers and admins can intervene")
    
    intervention = {
        "type": "intervention",
        "action": data.action,
        "message": data.message,
        "timestamp": datetime.utcnow().isoformat(),
    }
    if data.student_id:
        await manager.send_to_student(data.exam_id, data.student_id, intervention)
    else:
        await manager.broadcast_to_exam(data.exam_id, intervention)
    return {
        "status": "sent",
        "exam_id": data.exam_id,
        "target": data.student_id or "all",
        "action": data.action
    }


@router.get("/api/ws/stats")
async def get_ws_stats(current_user: dict = Depends(get_current_user)):
    """Get real-time connection statistics"""
    if current_user["role"] not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    return manager.get_all_stats()


@router.get("/api/ws/exam/{exam_id}/status")
async def get_exam_room_status(exam_id: str, current_user: dict = Depends(get_current_user)):
    """Get full status snapshot for an exam room"""
    if current_user["role"] not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    return {
        "exam_id": exam_id,
        "stats": manager.get_exam_stats(exam_id),
        "streams": getattr(manager, 'get_active_streams', lambda x: {})(exam_id),
        "timestamp": datetime.utcnow().isoformat(),
    }
