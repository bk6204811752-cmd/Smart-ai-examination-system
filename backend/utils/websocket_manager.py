"""
WebSocket Manager for Real-Time Exam Monitoring
- Manages WebSocket connections for students and teachers
- Broadcasts violations from students to teachers monitoring the same exam
- Handles video frame streaming
- Supports teacher interventions (warn/pause students)
"""

from fastapi import WebSocket
from typing import Dict, List, Set
import json
import asyncio
from datetime import datetime


class ExamConnectionManager:
    """Manages WebSocket connections grouped by exam_id"""

    def __init__(self):
        # exam_id -> list of (websocket, role, user_id)
        self.connections: Dict[str, List[dict]] = {}
        # All active connections for global broadcasts
        self.all_connections: Set[WebSocket] = set()

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
            self.connections[exam_id] = [
                c for c in self.connections[exam_id] if c["ws"] != websocket
            ]
            if not self.connections[exam_id]:
                del self.connections[exam_id]
        print(f"[WS] Connection closed for exam {exam_id}")

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
            self.connections[exam_id].remove(conn)
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
            self.connections[exam_id].remove(conn)
            self.all_connections.discard(conn["ws"])

    def get_exam_stats(self, exam_id: str) -> dict:
        """Get connection stats for an exam"""
        if exam_id not in self.connections:
            return {"students": 0, "teachers": 0, "total": 0}

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
