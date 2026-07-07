"""
WebSocket Manager for Real-Time Exam Monitoring
- Manages WebSocket connections for students and teachers
- Broadcasts violations from students to teachers monitoring the same exam
- Handles video frame streaming with frame caching
- Supports teacher interventions (warn/pause students)
- Tracks active streams and student heartbeats
"""

from fastapi import WebSocket
from typing import Dict, List, Set, Optional
import json
import asyncio
from datetime import datetime, timedelta


class ExamConnectionManager:
    """Manages WebSocket connections grouped by exam_id"""

    def __init__(self):
        # exam_id -> list of (websocket, role, user_id)
        self.connections: Dict[str, List[dict]] = {}
        # All active connections for global broadcasts
        self.all_connections: Set[WebSocket] = set()
        # Cache latest video frame per student: exam_id -> student_id -> frame_data
        self._frame_cache: Dict[str, Dict[str, str]] = {}
        # Cache latest proctoring status per student: exam_id -> student_id -> status_dict
        self._status_cache: Dict[str, Dict[str, dict]] = {}
        # Heartbeat tracking: exam_id -> student_id -> last_seen ISO string
        self._heartbeats: Dict[str, Dict[str, str]] = {}
        # Message history: exam_id -> list of messages
        self._messages: Dict[str, list] = {}
        # Student name cache: student_id -> name
        self._student_names: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, exam_id: str, user_id: str, role: str):
        await websocket.accept()
        self.all_connections.add(websocket)

        if exam_id not in self.connections:
            self.connections[exam_id] = []

        self.connections[exam_id].append({
            "ws": websocket,
            "user_id": user_id,
            "role": role,
            "connected_at": datetime.utcnow().isoformat(),
        })
        print(f"[WS] {role} {user_id} connected to exam {exam_id}")

    def disconnect(self, websocket: WebSocket, exam_id: str):
        self.all_connections.discard(websocket)
        if exam_id in self.connections:
            # Find the disconnecting user
            for conn in self.connections[exam_id]:
                if conn["ws"] == websocket:
                    user_id = conn["user_id"]
                    role = conn["role"]
                    print(f"[WS] {role} {user_id} disconnected from exam {exam_id}")
                    break

            self.connections[exam_id] = [
                c for c in self.connections[exam_id] if c["ws"] != websocket
            ]
            if not self.connections[exam_id]:
                del self.connections[exam_id]

    async def broadcast_to_teachers(self, exam_id: str, message: dict):
        """Send message to all teachers monitoring this exam"""
        if exam_id not in self.connections:
            return

        teachers = [c for c in self.connections[exam_id] if c["role"] in ("teacher", "admin")]
        dead = []

        for conn in teachers:
            try:
                await conn["ws"].send_json(message)
            except Exception:
                dead.append(conn)

        # Clean up dead connections
        for conn in dead:
            if exam_id in self.connections:
                try:
                    self.connections[exam_id].remove(conn)
                except ValueError:
                    pass
            self.all_connections.discard(conn["ws"])

    async def send_to_student(self, exam_id: str, student_id: str, message: dict):
        """Send message to a specific student"""
        if exam_id not in self.connections:
            return

        students = [
            c for c in self.connections[exam_id]
            if c["role"] == "student" and c["user_id"] == student_id
        ]

        for conn in students:
            try:
                await conn["ws"].send_json(message)
            except Exception:
                pass

    async def broadcast_to_exam(self, exam_id: str, message: dict, exclude_ws: WebSocket = None):
        """Broadcast to all participants in an exam"""
        if exam_id not in self.connections:
            return

        dead = []
        for conn in self.connections[exam_id]:
            if exclude_ws and conn["ws"] == exclude_ws:
                continue
            try:
                await conn["ws"].send_json(message)
            except Exception:
                dead.append(conn)

        for conn in dead:
            if exam_id in self.connections:
                try:
                    self.connections[exam_id].remove(conn)
                except ValueError:
                    pass
            self.all_connections.discard(conn["ws"])

    # ── Frame Caching ────────────────────────────────────────────────────────

    def cache_student_frame(self, exam_id: str, student_id: str, frame_data: str):
        """Cache the latest video frame for a student (for new teacher connections)"""
        if exam_id not in self._frame_cache:
            self._frame_cache[exam_id] = {}
        self._frame_cache[exam_id][student_id] = frame_data

    def get_student_frame(self, exam_id: str, student_id: str) -> Optional[str]:
        """Get the cached video frame for a student"""
        return self._frame_cache.get(exam_id, {}).get(student_id)

    # ── Status Caching ───────────────────────────────────────────────────────

    def cache_student_status(self, exam_id: str, student_id: str, status: dict):
        """Cache proctoring status for a student"""
        if exam_id not in self._status_cache:
            self._status_cache[exam_id] = {}
        self._status_cache[exam_id][student_id] = {
            **status,
            "last_seen": datetime.utcnow().isoformat()
        }

    def get_student_status(self, exam_id: str, student_id: str) -> Optional[dict]:
        """Get cached proctoring status for a student"""
        return self._status_cache.get(exam_id, {}).get(student_id)

    # ── Heartbeat Tracking ───────────────────────────────────────────────────

    def update_student_heartbeat(self, exam_id: str, student_id: str):
        """Update the last seen timestamp for a student"""
        if exam_id not in self._heartbeats:
            self._heartbeats[exam_id] = {}
        self._heartbeats[exam_id][student_id] = datetime.utcnow().isoformat()

    def get_student_heartbeat(self, exam_id: str, student_id: str) -> Optional[str]:
        """Get last heartbeat time for a student"""
        return self._heartbeats.get(exam_id, {}).get(student_id)

    def is_student_online(self, exam_id: str, student_id: str, timeout_seconds: int = 30) -> bool:
        """Check if a student is currently online based on heartbeat"""
        last_seen = self.get_student_heartbeat(exam_id, student_id)
        if not last_seen:
            return False
        try:
            last_dt = datetime.fromisoformat(last_seen)
            return (datetime.utcnow() - last_dt).total_seconds() < timeout_seconds
        except Exception:
            return False

    # ── Active Streams ───────────────────────────────────────────────────────

    def get_active_streams(self, exam_id: str) -> dict:
        """
        Get all active video streams for an exam.
        Returns: { student_id: { video: frame_data, status: {...} } }
        """
        result = {}

        # Get connected students
        connected_students = set()
        if exam_id in self.connections:
            for conn in self.connections[exam_id]:
                if conn["role"] == "student":
                    connected_students.add(conn["user_id"])

        # Combine frame cache with status cache for connected students
        frames = self._frame_cache.get(exam_id, {})
        statuses = self._status_cache.get(exam_id, {})
        heartbeats = self._heartbeats.get(exam_id, {})

        # Include all students who have sent frames recently
        all_student_ids = set(frames.keys()) | set(statuses.keys()) | connected_students

        for student_id in all_student_ids:
            frame = frames.get(student_id)
            status = statuses.get(student_id, {})
            last_hb = heartbeats.get(student_id)
            is_online = student_id in connected_students or self.is_student_online(exam_id, student_id)

            result[student_id] = {
                "video": frame,
                "status": status,
                "last_seen": last_hb or status.get("last_seen"),
                "is_online": is_online,
            }

        return result

    # ── Message Storage ──────────────────────────────────────────────────────

    def store_message(self, exam_id: str, message: dict):
        """Store a chat message for an exam"""
        if exam_id not in self._messages:
            self._messages[exam_id] = []
        self._messages[exam_id].append(message)
        # Keep only last 200 messages
        if len(self._messages[exam_id]) > 200:
            self._messages[exam_id] = self._messages[exam_id][-200:]

    def get_messages(self, exam_id: str, limit: int = 50) -> list:
        """Get recent messages for an exam"""
        msgs = self._messages.get(exam_id, [])
        return msgs[-limit:]

    def cache_student_name(self, student_id: str, name: str):
        """Cache a student's display name"""
        self._student_names[student_id] = name

    def get_student_name(self, student_id: str) -> str:
        """Get cached student name"""
        return self._student_names.get(student_id, student_id)

    # ── Stats ────────────────────────────────────────────────────────────────

    def get_exam_stats(self, exam_id: str) -> dict:
        """Get connection stats for an exam"""
        if exam_id not in self.connections:
            return {"students": 0, "teachers": 0, "total": 0, "student_ids": []}

        conns = self.connections[exam_id]
        students = [c for c in conns if c["role"] == "student"]
        teachers = [c for c in conns if c["role"] in ("teacher", "admin")]

        return {
            "students": len(students),
            "teachers": len(teachers),
            "total": len(conns),
            "student_ids": [c["user_id"] for c in students],
        }

    def get_all_stats(self) -> dict:
        """Get stats for all active exams"""
        return {
            "active_exams": len(self.connections),
            "total_connections": len(self.all_connections),
            "exams": {
                exam_id: self.get_exam_stats(exam_id)
                for exam_id in self.connections
            }
        }


# Global singleton
manager = ExamConnectionManager()
