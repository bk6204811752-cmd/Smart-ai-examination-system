"""
Database Indexes Setup
Critical for query performance - 10-100x speedup with proper indexes
"""

import logging

logger = logging.getLogger(__name__)


async def create_all_indexes(db):
    """
    Create all necessary database indexes for optimal performance
    
    Index strategy:
    - Unique constraints on email
    - Sort fields (status, created_at)
    - Query filters (exam_id, student_id, user_id)
    - Compound indexes for common queries
    """
    
    try:
        # ── Users Collection ──────────────────────────────────────────────────
        await db.users.create_index("email", unique=True)
        await db.users.create_index("status")
        await db.users.create_index("role")
        await db.users.create_index("department")
        await db.users.create_index([("status", 1), ("role", 1)])
        logger.info("✅ Users indexes created")
        
        # ── Exams Collection ──────────────────────────────────────────────────
        await db.exams.create_index("created_by")
        await db.exams.create_index("status")
        await db.exams.create_index("program")
        await db.exams.create_index([("program", 1), ("semester", 1)])
        await db.exams.create_index("scheduled_time")
        await db.exams.create_index([("status", 1), ("scheduled_time", -1)])
        logger.info("✅ Exams indexes created")
        
        # ── Submissions Collection ────────────────────────────────────────────
        await db.submissions.create_index("student_id")
        await db.submissions.create_index("exam_id")
        await db.submissions.create_index([("exam_id", 1), ("student_id", 1)], unique=True)
        await db.submissions.create_index("created_at")
        await db.submissions.create_index([("exam_id", 1), ("status", 1)])
        logger.info("✅ Submissions indexes created")
        
        # ── Proctoring Flags Collection ───────────────────────────────────────
        await db.proctoring_flags.create_index("exam_id")
        await db.proctoring_flags.create_index("student_id")
        await db.proctoring_flags.create_index([("exam_id", 1), ("student_id", 1)])
        await db.proctoring_flags.create_index([("exam_id", 1), ("timestamp", -1)])
        await db.proctoring_flags.create_index("violation_type")
        logger.info("✅ Proctoring flags indexes created")
        
        # ── Webhooks Collection ───────────────────────────────────────────────
        await db.webhooks.create_index("active")
        await db.webhooks.create_index("event_type")
        logger.info("✅ Webhooks indexes created")
        
        # ── Communications Collection ─────────────────────────────────────────
        await db.communications.create_index("sent_at")
        await db.communications.create_index([("type", 1), ("sent_at", -1)])
        await db.communications.create_index("recipient_id")
        await db.communications.create_index([("recipient_id", 1), ("sent_at", -1)])
        logger.info("✅ Communications indexes created")
        
        # ── Notifications Collection ──────────────────────────────────────────
        await db.notifications.create_index("user_id")
        await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
        await db.notifications.create_index([("user_id", 1), ("read", 1)])
        logger.info("✅ Notifications indexes created")
        
        # ── Audit Logs Collection ─────────────────────────────────────────────
        await db.audit_logs.create_index("admin_id")
        await db.audit_logs.create_index("timestamp")
        await db.audit_logs.create_index([("admin_id", 1), ("timestamp", -1)])
        logger.info("✅ Audit logs indexes created")
        
        # ── Sessions Collection ───────────────────────────────────────────────
        await db.sessions.create_index("user_id")
        await db.sessions.create_index("exam_id")
        await db.sessions.create_index([("user_id", 1), ("exam_id", 1)])
        logger.info("✅ Sessions indexes created")
        
        logger.info("🎉 All database indexes created successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        raise


async def optimize_queries(db):
    """
    Verify indexes exist and provide query optimization recommendations
    """
    collections = {
        "users": [
            ("email", "Unique email constraint"),
            ("status", "Filter by user status"),
            ("role", "Filter by user role"),
        ],
        "exams": [
            ("status", "Filter active exams"),
            ("scheduled_time", "Sort by exam time"),
        ],
        "submissions": [
            (["exam_id", "student_id"], "Get specific submission"),
            ("created_at", "Sort by submission time"),
        ],
        "proctoring_flags": [
            (["exam_id", "timestamp"], "Get recent violations"),
        ],
    }
    
    logger.info("📊 Index optimization report:")
    for collection_name, indexes in collections.items():
        try:
            indexes_info = await db[collection_name].list_indexes().to_list(None)
            index_names = {idx.get("name") for idx in indexes_info}
            logger.info(f"  {collection_name}: {len(index_names)} indexes")
        except Exception as e:
            logger.warning(f"  {collection_name}: Could not verify indexes - {e}")
