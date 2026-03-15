from fastapi import APIRouter, Depends
from app.database import get_db
from app.middleware.auth import get_optional_user, require_staff
from datetime import datetime, timezone

router = APIRouter()


@router.post("")
async def submit_feedback(body: dict, db=Depends(get_db), user=Depends(get_optional_user)):
    doc = {
        "type":    body.get("type", "other"),
        "rating":  body.get("rating"),
        "message": (body.get("message") or "").strip()[:1000],
        "page":    body.get("page", ""),
        "user_id": str(user["_id"]) if user else None,
        "ts":      datetime.now(timezone.utc),
    }
    await db.feedback.insert_one(doc)
    return {"ok": True}


@router.get("")
async def list_feedback(skip: int = 0, limit: int = 50, type: str = "", admin=Depends(require_staff), db=Depends(get_db)):
    query = {}
    if type:
        query["type"] = type
    cursor = db.feedback.find(query).sort("ts", -1).skip(skip).limit(limit)
    docs   = await cursor.to_list(limit)
    total  = await db.feedback.count_documents(query)
    return {
        "total": total,
        "items": [
            {
                "id":      str(d["_id"]),
                "type":    d.get("type", "other"),
                "rating":  d.get("rating"),
                "message": d.get("message", ""),
                "page":    d.get("page", ""),
                "user_id": d.get("user_id"),
                "ts":      d["ts"],
            }
            for d in docs
        ],
    }


@router.get("/summary")
async def feedback_summary(admin=Depends(require_staff), db=Depends(get_db)):
    total   = await db.feedback.count_documents({})
    pipeline = [{"$group": {"_id": "$type", "count": {"$sum": 1}}}]
    by_type = await db.feedback.aggregate(pipeline).to_list(20)
    avg_pipeline = [
        {"$match": {"rating": {"$ne": None}}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}}},
    ]
    avg_result = await db.feedback.aggregate(avg_pipeline).to_list(1)
    return {
        "total":   total,
        "by_type": {r["_id"]: r["count"] for r in by_type},
        "avg_rating": round(avg_result[0]["avg"], 2) if avg_result else None,
    }