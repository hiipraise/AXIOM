from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.middleware.auth import require_admin
from app.middleware.validation import valid_object_id
from app.models.schemas import AnnouncementCreate
from app.utils.errors import bad_request
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter()


def _serialize(a: dict) -> dict:
    return {
        "id":         str(a["_id"]),
        "text":       a["text"],
        "type":       a.get("type", "info"),   # info | warning | success
        "active":     a.get("active", True),
        "created_at": a["created_at"],
    }


# ─── Public: active announcement ─────────────────────────────────────────────
@router.get("/active")
async def get_active(db=Depends(get_db)):
    doc = await db.announcements.find_one({"active": True}, sort=[("created_at", -1)])
    if not doc:
        return None
    return _serialize(doc)


# ─── Admin CRUD ───────────────────────────────────────────────────────────────
@router.get("")
async def list_announcements(admin=Depends(require_admin), db=Depends(get_db)):
    cursor = db.announcements.find({}).sort("created_at", -1)
    docs   = await cursor.to_list(50)
    return [_serialize(d) for d in docs]


@router.post("")
async def create_announcement(body: AnnouncementCreate, admin=Depends(require_admin), db=Depends(get_db)):
    # deactivate all others first so only one is active at a time
    await db.announcements.update_many({}, {"$set": {"active": False}})
    doc = {
        "text":       body.text.strip(),
        "type":       body.type,
        "active":     True,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.announcements.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.put("/{ann_id}/activate")
async def activate(ann_id: str, admin=Depends(require_admin), db=Depends(get_db)):
    if not ObjectId.is_valid(ann_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    await db.announcements.update_many({}, {"$set": {"active": False}})
    await db.announcements.update_one({"_id": ObjectId(ann_id)}, {"$set": {"active": True}})
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