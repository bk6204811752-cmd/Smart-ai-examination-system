from database import get_db
from datetime import datetime
from typing import Optional, List

async def create_notification(
    user_id: str,
    title: str,
    message: str,
    type: str = "info",
    action_url: Optional[str] = None,
    priority: str = "normal",
    channels: Optional[List[str]] = None,
    db=None,
):
    if db is None:
        db = get_db()
    doc = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": type,
        "action_url": action_url,
        "priority": priority,
        "channels": channels or ["push"],
        "read": False,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db.notifications.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    try:
        from utils.websocket_manager import manager
        await manager.send_notification_to_user(user_id, doc)
    except Exception:
        pass

    return doc


async def notify_exam_submitted(exam_title: str, student_id: str, student_name: str, teacher_id: str):
    await create_notification(
        user_id=teacher_id,
        title="Exam Submitted",
        message=f"{student_name} has submitted \"{exam_title}\"",
        type="exam",
        action_url="/teacher/dashboard",
        priority="normal",
    )
    await create_notification(
        user_id=student_id,
        title="Exam Submitted",
        message=f"Your submission for \"{exam_title}\" was received",
        type="success",
        action_url="/student/dashboard",
        priority="normal",
    )


async def notify_result_released(exam_title: str, student_id: str, submission_id: str, percentage: float):
    await create_notification(
        user_id=student_id,
        title="Result Available",
        message=f"Your result for \"{exam_title}\" is ready — {percentage:.1f}%",
        type="grade",
        action_url=f"/student/results/{submission_id}",
        priority="high",
    )


async def notify_user_approved(user_id: str, full_name: str, role: str):
    await create_notification(
        user_id=user_id,
        title="Account Approved",
        message=f"Your {role} account has been approved. You can now log in.",
        type="success",
        action_url="/login",
        priority="high",
    )


async def notify_new_user_registration(admin_id: str, full_name: str, email: str, role: str):
    await create_notification(
        user_id=admin_id,
        title="New User Registration",
        message=f"{full_name} ({email}) registered as {role}, pending approval",
        type="info",
        action_url="/admin/user-approval",
        priority="normal",
    )


async def notify_violation_flag(student_id: str, student_name: str, teacher_ids: List[str], exam_id: str, violation_type: str):
    for tid in teacher_ids:
        await create_notification(
            user_id=tid,
            title="Proctoring Violation",
            message=f"{student_name}: {violation_type.replace('_', ' ').title()}",
            type="error",
            action_url=f"/teacher/live-monitoring/{exam_id}",
            priority="urgent",
        )


async def notify_intervention(student_id: str, action: str, message: str, exam_title: str):
    await create_notification(
        user_id=student_id,
        title="Teacher Intervention",
        message=f"Your exam \"{exam_title}\" was {action}: {message}",
        type="warning",
        action_url="/student/exam",
        priority="high",
    )


async def notify_teacher_about_student(teacher_id: str, student_name: str, exam_title: str, event: str):
    await create_notification(
        user_id=teacher_id,
        title=f"Student {event}",
        message=f"{student_name} {event} \"{exam_title}\"",
        type="exam",
        action_url="/teacher/dashboard",
        priority="normal",
    )
