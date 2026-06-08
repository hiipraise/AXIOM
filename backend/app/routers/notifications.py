from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.schemas import NotificationOut

router = APIRouter()


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

@router.get("", response_model=list[NotificationOut], include_in_schema=False)
@router.get("/", response_model=list[NotificationOut])
async def list_notifications(current_user=Depends(get_current_user), db=Depends(get_db)):
    cursor = db.notifications.find({"user_id": str(current_user["_id"])}).sort("created_at", -1).limit(50)
    return [_out(doc) for doc in await cursor.to_list(50)]


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
    await db.notifications.update_many({"user_id": str(current_user["_id"]), "read": False}, {"$set": {"read": True}})
    return {"ok": True}
