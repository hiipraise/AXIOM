from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
from app.config import settings
from app.utils.errors import service_unavailable
from app.services.auth_service import hash_password
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongo_url)
    db = client[settings.db_name]
    await setup_indexes()
    logger.info("Connected to MongoDB")


async def close_db():
    global client
    if client:
        client.close()
        logger.info("Disconnected from MongoDB")


async def get_db():
    return db


async def ping_db() -> bool:
    """Ping MongoDB to check connection health."""
    try:
        await db.command("ping")
        return True
    except Exception:
        logger.warning("MongoDB ping failed")
        return False


async def setup_indexes():
    # Users: unique username and email
    await db.users.create_index([("username", ASCENDING)], unique=True)
    await db.users.create_index([("email", ASCENDING)], sparse=True)
    # CVs: by owner
    await db.cvs.create_index([("owner_id", ASCENDING)])
    await db.cvs.create_index([("owner_id", ASCENDING), ("created_at", DESCENDING)])
    await db.cvs.create_index([("slug", ASCENDING)], sparse=True)
    await db.cvs.create_index([("title", "text"), ("data.summary", "text"), ("data.skills", "text")])
    # CV History
    await db.cv_history.create_index([("cv_id", ASCENDING)])
    await db.cv_history.create_index([("owner_id", ASCENDING)])
    # Jobs cache and tracker collections
    await db.job_cache.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    await db.job_cache.create_index([("cache_key", ASCENDING)], unique=True, sparse=True)
    await db.job_cache.create_index([("job_id", ASCENDING)], unique=True, sparse=True)
    await db.job_cache.create_index([("title", "text"), ("company", "text"), ("description", "text")])
    await db.job_cache.create_index([("posted_at", DESCENDING)])
    await db.saved_jobs.create_index([("user_id", ASCENDING), ("job_id", ASCENDING)], unique=True)
    await db.saved_jobs.create_index([("user_id", ASCENDING), ("saved_at", ASCENDING)])
    # Revoked tokens: auto-expire after 24 hours (matches JWT expiry)
    await db.revoked_tokens.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    await db.notifications.create_index([("user_id", ASCENDING), ("read", ASCENDING)])
    await db.notifications.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    await db.notifications.create_index([("user_id", ASCENDING), ("kind", ASCENDING)])
    await db.notifications.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    await db.interview_sessions.create_index([("user_id", ASCENDING)])
    await db.interview_sessions.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    # Interview recordings: index for cleanup & retrieval
    await db.interview_recordings.create_index([("created_at", ASCENDING)], expireAfterSeconds=2592000)
    await db.interview_recordings.create_index([("user_id", ASCENDING)])
    await db.interview_recordings.create_index([("session_id", ASCENDING)])
    # Review cards
    await db.review_cards.create_index([("user_id", ASCENDING), ("next_review_at", ASCENDING)])
    await db.review_cards.create_index([("user_id", ASCENDING), ("topic", ASCENDING)])
    # CV Comments
    await db.cv_comments.create_index([("cv_id", ASCENDING)])
    await db.cv_comments.create_index([("cv_id", ASCENDING), ("section", ASCENDING)])
    await db.cv_comments.create_index([("cv_id", ASCENDING), ("resolved", ASCENDING)])
    await db.cv_comments.create_index([("parent_id", ASCENDING)], sparse=True)
    # Feedback: admin listing by type and recency
    await db.feedback.create_index([("type", ASCENDING), ("ts", DESCENDING)])
    await db.feedback.create_index([("ts", DESCENDING)])

    # Notification preferences & push subscriptions
    await db.notification_preferences.create_index([("user_id", ASCENDING)], unique=True)
    await db.push_subscriptions.create_index([("user_id", ASCENDING)], unique=True)

    # PDF cache: auto-expire after 1 hour
    await db.pdf_cache.create_index([("cache_key", ASCENDING)], unique=True)
    await db.pdf_cache.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    await db.pdf_cache.create_index([("cv_id", ASCENDING)])

    # PDF download analytics
    await db.export_events.create_index([("cv_id", ASCENDING), ("ts", DESCENDING)])
    await db.export_events.create_index([("type", ASCENDING), ("ts", DESCENDING)])

    # Skill market cache: auto-expire after 1 hour
    await db.skill_market_cache.create_index([("cache_key", ASCENDING)], unique=True)
    await db.skill_market_cache.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)

    # Skill endorsements: by user or by skill
    await db.skill_endorsements.create_index([("user_id", ASCENDING)])
    await db.skill_endorsements.create_index([("skill", ASCENDING)])
    await db.skill_endorsements.create_index([("user_id", ASCENDING), ("skill", ASCENDING)])

    # OAuth states: auto-expire after 5 minutes
    await db.oauth_states.create_index([("state", ASCENDING)], unique=True)
    await db.oauth_states.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)

    # Ratings: unique per user-CV to prevent manipulation
    await db.ratings.delete_many({"rater_id": None})
    await db.ratings.create_index([("rater_id", ASCENDING), ("cv_id", ASCENDING)], unique=True)
    logger.info("Database indexes ensured")


async def init_admin():
    existing = await db.users.find_one({"username": settings.admin_username})
    if not existing:
        from datetime import datetime, timezone
        admin_doc = {
            "username": settings.admin_username,
            "email": settings.admin_email,
            "password_hash": hash_password(settings.admin_password),
            "role": "superadmin",
            "must_change_password": True,
            "created_at": datetime.now(timezone.utc),
            "secret_question": None,
            "secret_answer_hash": None,
            "is_active": True,
        }
        await db.users.insert_one(admin_doc)
        logger.info(f"Super admin '{settings.admin_username}' created.")
    else:
        logger.info(f"Super admin '{settings.admin_username}' already exists.")
