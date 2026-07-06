from __future__ import annotations

from datetime import datetime, timezone, timedelta

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.schemas import (
    NotificationOut,
    NotificationPreferences as NotificationPreferencesSchema,
    PushSubscription as PushSubscriptionSchema,
)
from app.services.notification_service import create_notification, _is_quiet_hours

router = APIRouter()

DEFAULT_PREFS = {
    "email_notifications": True,
    "push_notifications": False,
    "quiet_hours": {"enabled": False, "start": "22:00", "end": "08:00"},
    "kinds": {
        "general": True,
        "application": True,
        "interview": True,
        "review_card": True,
        "announcement": True,
    },
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid id")
    return ObjectId(value)


def _out(doc: dict) -> NotificationOut:
    return NotificationOut(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        title=doc.get("title", ""),
        body=doc.get("body", ""),
        kind=doc.get("kind", "general"),
        link=doc.get("link", ""),
        read=bool(doc.get("read", False)),
        created_at=doc.get("created_at", _utcnow()),
    )


def _prefs_out(doc: dict) -> dict:
    """Merge user prefs with defaults for a complete response."""
    merged = {**DEFAULT_PREFS}
    if doc:
        merged["kinds"] = {**DEFAULT_PREFS["kinds"], **doc.get("kinds", {})}
        for key in ["email_notifications", "push_notifications", "quiet_hours"]:
            if key in doc:
                merged[key] = doc[key]
    return merged


# ── Existing notification endpoints ───────────────────────────────────────────

@router.get("", response_model=list[NotificationOut], include_in_schema=False)
@router.get("/", response_model=list[NotificationOut])
async def list_notifications(
    skip: int = 0,
    limit: int = 50,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = db.notifications.find({"user_id": str(current_user["_id"])}).sort("created_at", -1).skip(skip).limit(limit)
    return [_out(doc) for doc in await cursor.to_list(limit)]


@router.get("/count")
async def count_notifications(current_user=Depends(get_current_user), db=Depends(get_db)):
    total = await db.notifications.count_documents({"user_id": str(current_user["_id"])})
    return {"total": total}


@router.put("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(notification_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.notifications.find_one({"_id": _oid(notification_id), "user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.notifications.update_one({"_id": doc["_id"]}, {"$set": {"read": True}})
    updated = await db.notifications.find_one({"_id": doc["_id"]})
    return _out(updated)


@router.put("/read-all")
async def mark_all_read(current_user=Depends(get_current_user), db=Depends(get_db)):
    await db.notifications.update_many(
        {"user_id": str(current_user["_id"]), "read": False},
        {"$set": {"read": True}},
    )
    return {"ok": True}


# ── Notification preferences ──────────────────────────────────────────────────

@router.get("/preferences")
async def get_preferences(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Get notification preferences with defaults merged."""
    user_id = str(current_user["_id"])
    doc = await db.notification_preferences.find_one({"user_id": user_id})
    return _prefs_out(doc)


@router.put("/preferences")
async def update_preferences(
    body: NotificationPreferencesSchema,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update notification preferences."""
    user_id = str(current_user["_id"])
    now = _utcnow()
    await db.notification_preferences.update_one(
        {"user_id": user_id},
        {"$set": {
            "email_notifications": body.email_notifications,
            "push_notifications": body.push_notifications,
            "quiet_hours": body.quiet_hours.model_dump(),
            "kinds": body.kinds,
            "updated_at": now,
        }},
        upsert=True,
    )
    return _prefs_out(await db.notification_preferences.find_one({"user_id": user_id}))


# ── Quiet hours ───────────────────────────────────────────────────────────────

@router.get("/quiet-hours")
async def get_quiet_hours(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Get current quiet hours settings and whether they are active now."""
    user_id = str(current_user["_id"])
    doc = await db.notification_preferences.find_one({"user_id": user_id})
    prefs = _prefs_out(doc)
    quiet_hours = prefs.get("quiet_hours", {})
    return {
        **quiet_hours,
        "active_now": _is_quiet_hours(quiet_hours),
    }


# ── Push subscription ─────────────────────────────────────────────────────────

@router.post("/push/subscribe")
async def subscribe_push(
    body: PushSubscriptionSchema,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Register a push notification subscription endpoint."""
    user_id = str(current_user["_id"])
    now = _utcnow()
    # Replace previous subscription for same user
    await db.push_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "endpoint": body.endpoint,
            "keys": body.keys,
            "updated_at": now,
        }},
        upsert=True,
    )
    # Also enable push in preferences if it was off
    await db.notification_preferences.update_one(
        {"user_id": user_id},
        {"$set": {"push_notifications": True}},
        upsert=True,
    )
    return {"success": True, "message": "Push subscription registered"}


@router.delete("/push/subscribe")
async def unsubscribe_push(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Remove the push notification subscription."""
    user_id = str(current_user["_id"])
    await db.push_subscriptions.delete_one({"user_id": user_id})
    return {"success": True, "message": "Push subscription removed"}


# ── Review-due notification ───────────────────────────────────────────────────

@router.post("/review-due-check")
async def check_review_due(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Check if any review cards are due and send a notification if so.
    Safe to call on every session/startup — only notifies once per batch."""
    user_id = str(current_user["_id"])
    now = _utcnow()

    # Check due cards
    due_count = await db.review_cards.count_documents({
        "user_id": user_id,
        "next_review_at": {"$lte": now},
    })
    if due_count == 0:
        return {"notified": False, "due_count": 0}

    # Check if we already notified for this batch (within the last hour)
    recent = await db.notifications.find_one({
        "user_id": user_id,
        "kind": "review_card",
        "created_at": {"$gte": now - timedelta(hours=1)},
    })
    if recent:
        return {"notified": False, "due_count": due_count, "reason": "Already notified recently"}

    total = await db.review_cards.count_documents({"user_id": user_id})
    await create_notification(
        db,
        user_id,
        f"Review cards due",
        f"You have {due_count} card{'s' if due_count != 1 else ''} to review ({total} total). Keep your interview prep sharp!",
        "review_card",
        "/interview/review",
    )
    return {"notified": True, "due_count": due_count}



