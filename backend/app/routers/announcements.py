import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.middleware.auth import require_admin
from app.middleware.validation import valid_object_id
from app.models.schemas import AnnouncementCreate, AnnouncementUpdate, TARGET_SEGMENT_LABELS
from app.services.notification_service import create_notification
from app.utils.errors import bad_request
from bson import ObjectId
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Segment dispatch ────────────────────────────────────────────────────────────

def _segment_filter(segment: str) -> dict:
    """Return a MongoDB filter dict for the given target segment key."""
    now = datetime.now(timezone.utc)
    if segment == "all":
        return {"is_active": True}
    if segment == "new_users":
        return {"is_active": True, "created_at": {"$gte": now - timedelta(days=7)}}
    if segment == "active_users":
        return {"is_active": True, "last_seen_at": {"$gte": now - timedelta(days=30)}}
    if segment.startswith("role:"):
        return {"is_active": True, "role": segment.removeprefix("role:")}
    return {"is_active": True}


async def _dispatch_notifications(db, ann_text: str, segment: str, batch_size: int = 100) -> int:
    """Fire-and-forget: create in-app notifications for every user in the
    target segment. Returns approximate count of users notified.
    Runs in a background task so the API response is not blocked."""
    query = _segment_filter(segment)
    total = 0
    skip = 0
    while True:
        cursor = db.users.find(query, {"_id": 1}).skip(skip).limit(batch_size)
        batch = await cursor.to_list(batch_size)
        if not batch:
            break
        for user in batch:
            try:
                await create_notification(
                    db,
                    user_id=str(user["_id"]),
                    title="New Announcement",
                    body=ann_text[:200],
                    kind="announcement",
                    link="/",
                )
                total += 1
            except Exception as e:
                logger.warning(f"Failed to notify user {user.get('_id')}: {e}")
        skip += batch_size
    return total


async def _announcement_created(announcement: dict, db) -> None:
    """Fire off notifications in a background task after an announcement goes live."""
    if not announcement.get("active"):
        return
    segment = announcement.get("target_segment", "all")

    async def _bg():
        try:
            notified = await _dispatch_notifications(db, announcement["text"], segment)
            if notified:
                logger.info(f"Announcement {announcement.get('_id')}: notified {notified} users (segment={segment})")
        except Exception as e:
            logger.warning(f"Announcement notification dispatch failed: {e}")

    asyncio.create_task(_bg())


async def _process_scheduled(db) -> None:
    """Activate any scheduled announcements whose time has come."""
    now = datetime.now(timezone.utc)
    scheduled = await db.announcements.find_one({
        "active": False,
        "scheduled_at": {"$lte": now, "$ne": None},
        "scheduled_processed": {"$ne": True},
    }, sort=[("scheduled_at", 1)])
    if scheduled:
        await db.announcements.update_many({}, {"$set": {"active": False}})
        await db.announcements.update_one(
            {"_id": scheduled["_id"]},
            {"$set": {"active": True, "scheduled_processed": True, "activated_at": now}}
        )
        # Dispatch notifications for the newly activated scheduled announcement
        await _announcement_created(scheduled, db)


async def _get_click_stats(db, ann_id: str) -> dict:
    click_count = await db.page_events.count_documents({
        "event_type": "announcement_click", "announcement_id": ann_id,
    })
    dismiss_count = await db.page_events.count_documents({
        "event_type": "announcement_dismiss", "announcement_id": ann_id,
    })
    return {"clicks": click_count, "dismisses": dismiss_count}


def _serialize(a: dict) -> dict:
    return {
        "id":              str(a["_id"]),
        "text":            a["text"],
        "type":            a.get("type", "info"),
        "active":          a.get("active", True),
        "scheduled_at":    a.get("scheduled_at"),
        "target_segment":  a.get("target_segment", "all"),
        "clicks":          a.get("_clicks", 0),
        "dismisses":       a.get("_dismisses", 0),
        "created_at":      a["created_at"],
        "updated_at":      a.get("updated_at", a["created_at"]),
    }


# ─── Public: active announcement ─────────────────────────────────────────────
@router.get("/active")
async def get_active(db=Depends(get_db)):
    await _process_scheduled(db)
    doc = await db.announcements.find_one({"active": True}, sort=[("created_at", -1)])
    if not doc:
        return None
    return _serialize(doc)


# ─── Admin CRUD ───────────────────────────────────────────────────────────────
@router.get("")
async def list_announcements(admin=Depends(require_admin), db=Depends(get_db)):
    await _process_scheduled(db)
    cursor = db.announcements.find({}).sort("created_at", -1)
    docs = await cursor.to_list(50)
    results = []
    for d in docs:
        stats = await _get_click_stats(db, str(d["_id"]))
        d["_clicks"] = stats["clicks"]
        d["_dismisses"] = stats["dismisses"]
        results.append(_serialize(d))
    return results


@router.post("")
async def create_announcement(body: AnnouncementCreate, admin=Depends(require_admin), db=Depends(get_db)):
    now = datetime.now(timezone.utc)
    is_scheduled = body.scheduled_at is not None and body.scheduled_at > now

    doc: dict = {
        "text":                body.text.strip(),
        "type":                body.type,
        "active":              not is_scheduled,
        "scheduled_at":        body.scheduled_at,
        "target_segment":      body.target_segment or "all",
        "scheduled_processed": not is_scheduled,
        "created_at":          now,
        "updated_at":          now,
    }

    if not is_scheduled:
        await db.announcements.update_many({}, {"$set": {"active": False}})
        doc["active"] = True

    result = await db.announcements.insert_one(doc)
    doc["_id"] = result.inserted_id
    doc["_clicks"] = 0
    doc["_dismisses"] = 0

    # Fire off notifications in the background
    await _announcement_created(doc, db)

    return _serialize(doc)


@router.put("/{ann_id}")
async def update_announcement(ann_id: str, body: AnnouncementUpdate, admin=Depends(require_admin), db=Depends(get_db)):
    if not ObjectId.is_valid(ann_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    existing = await db.announcements.find_one({"_id": ObjectId(ann_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Announcement not found")

    now = datetime.now(timezone.utc)
    updates: dict = {"updated_at": now}

    if body.text is not None:
        updates["text"] = body.text.strip()
    if body.type is not None:
        updates["type"] = body.type
    if body.scheduled_at is not None:
        updates["scheduled_at"] = body.scheduled_at
        if body.scheduled_at > now:
            updates["active"] = False
            updates["scheduled_processed"] = False
        else:
            updates["scheduled_processed"] = True
    if body.target_segment is not None:
        updates["target_segment"] = body.target_segment

    await db.announcements.update_one({"_id": ObjectId(ann_id)}, {"$set": updates})
    updated = await db.announcements.find_one({"_id": ObjectId(ann_id)})
    stats = await _get_click_stats(db, ann_id)
    updated["_clicks"] = stats["clicks"]
    updated["_dismisses"] = stats["dismisses"]
    return _serialize(updated)


@router.put("/{ann_id}/activate")
async def activate(ann_id: str, admin=Depends(require_admin), db=Depends(get_db)):
    if not ObjectId.is_valid(ann_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    now = datetime.now(timezone.utc)
    await db.announcements.update_many({}, {"$set": {"active": False}})
    await db.announcements.update_one({"_id": ObjectId(ann_id)}, {"$set": {
        "active": True, "scheduled_at": None, "scheduled_processed": True, "activated_at": now,
    }})

    # Fetch the updated doc to dispatch notifications
    doc = await db.announcements.find_one({"_id": ObjectId(ann_id)})
    if doc:
        await _announcement_created(doc, db)

    return {"ok": True}


@router.put("/{ann_id}/deactivate")
async def deactivate(ann_id: str, admin=Depends(require_admin), db=Depends(get_db)):
    if not ObjectId.is_valid(ann_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    await db.announcements.update_one({"_id": ObjectId(ann_id)}, {"$set": {"active": False}})
    return {"ok": True}


@router.delete("/{ann_id}")
async def delete_announcement(ann_id: str, admin=Depends(require_admin), db=Depends(get_db)):
    if not ObjectId.is_valid(ann_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    await db.announcements.delete_one({"_id": ObjectId(ann_id)})
    return {"ok": True}