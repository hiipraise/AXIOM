from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING
from app.config import settings
from app.services.auth_service import hash_password
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongo_url)
    db = client.axiom
    await setup_indexes()
    logger.info("Connected to MongoDB")


async def close_db():
    global client
    if client:
        client.close()
        logger.info("Disconnected from MongoDB")


async def get_db():
    return db


async def setup_indexes():
    # Users: unique username and email
    await db.users.create_index([("username", ASCENDING)], unique=True)
    await db.users.create_index([("email", ASCENDING)], sparse=True)
    # CVs: by owner
    await db.cvs.create_index([("owner_id", ASCENDING)])
    await db.cvs.create_index([("slug", ASCENDING)], sparse=True)
    # CV History
    await db.cv_history.create_index([("cv_id", ASCENDING)])
    await db.cv_history.create_index([("owner_id", ASCENDING)])
    # Jobs cache and tracker collections
    await db.job_cache.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    await db.job_cache.create_index([("cache_key", ASCENDING)], unique=True, sparse=True)
    await db.job_cache.create_index([("job_id", ASCENDING)], unique=True, sparse=True)
    await db.saved_jobs.create_index([("user_id", ASCENDING), ("job_id", ASCENDING)], unique=True)
    await db.saved_jobs.create_index([("user_id", ASCENDING), ("saved_at", ASCENDING)])
    await db.applications.create_index([("user_id", ASCENDING), ("job_id", ASCENDING)], unique=True)
    await db.applications.create_index([("user_id", ASCENDING), ("updated_at", ASCENDING)])
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
