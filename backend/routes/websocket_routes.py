"""
WebSocket Routes for Real-Time Exam Monitoring
GET  /ws/{exam_id}/{user_id}/{role}  — Connect (role = student | teacher)
GET  /ws/{exam_id}/{user_id}?role=   — Backward-compat connect
GET  /api/ws/stats                   — Connection stats
POST /api/ws/intervene               — Teacher intervention
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
from typing import Optional
import json
from datetime import datetime

from utils.websocket_manager import manager

router = APIRouter(tags=["websocket"])


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

    # If teacher joins, send snapshot of all live streams
    if role in ("teacher", "admin"):
        streams = getattr(manager, 'get_active_streams', lambda x: {})(exam_id)
        if streams:
            await websocket.send_json({
                "type": "active_streams",
                "exam_id": exam_id,
                "streams": streams,
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


@router.websocket("/ws/{exam_id}/{user_id}/{role}")
async def websocket_with_role(websocket: WebSocket, exam_id: str, user_id: str, role: str):
    """WebSocket endpoint — role as path parameter (preferred by frontend)."""
    await _run_session(websocket, exam_id, user_id, role)


@router.websocket("/ws/{exam_id}/{user_id}")
async def websocket_query_role(
    websocket: WebSocket,
    exam_id: str,
    user_id: str,
    role: str = Query(default="student"),
):
    """WebSocket endpoint — role as query parameter (backward-compat)."""
    await _run_session(websocket, exam_id, user_id, role)


class InterventionRequest(BaseModel):
    exam_id: str
    student_id: Optional[str] = None
    action: str  # "warn" | "pause" | "resume" | "terminate"
    message: str = ""


@router.post("/api/ws/intervene")
async def teacher_intervene(data: InterventionRequest):
    """HTTP endpoint for teacher interventions (alternative to WebSocket)"""
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
async def get_ws_stats():
    """Get real-time connection statistics"""
    return manager.get_all_stats()


@router.get("/api/ws/exam/{exam_id}/status")
async def get_exam_room_status(exam_id: str):
    """Get full status snapshot for an exam room"""
    return {
        "exam_id": exam_id,
        "stats": manager.get_exam_stats(exam_id),
        "streams": getattr(manager, 'get_active_streams', lambda x: {})(exam_id),
        "timestamp": datetime.utcnow().isoformat(),
    }
