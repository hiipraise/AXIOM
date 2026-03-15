"""
Analytics router — tracks page views and sessions, exposes aggregated
data to admin users. No personal data stored; all events are anonymous
beyond the user_id (which is optional).
"""
from fastapi import APIRouter, Depends, Request
from app.database import get_db
from app.middleware.auth import get_optional_user, require_staff
from datetime import datetime, timezone, timedelta
from collections import defaultdict

router = APIRouter()

# ─── Ingest ──────────────────────────────────────────────────────────────────

@router.post("/event")
async def track_event(body: dict, request: Request, db=Depends(get_db), user=Depends(get_optional_user)):
    """
    Called by the frontend on every page navigation.
    Body: { path: string, referrer?: string, session_id: string }
    """
    event = {
        "path":       body.get("path", "/"),
        "referrer":   body.get("referrer", ""),
        "session_id": body.get("session_id", ""),
        "user_id":    str(user["_id"]) if user else None,
        "ts":         datetime.now(timezone.utc),
    }
    await db.page_events.insert_one(event)
    return {"ok": True}


# ─── Admin queries ────────────────────────────────────────────────────────────

def _since(days: int):
    return datetime.now(timezone.utc) - timedelta(days=days)


@router.get("/overview")
async def analytics_overview(admin=Depends(require_staff), db=Depends(get_db)):
    """Total views, unique sessions, unique users (last 30 days)."""
    since = _since(30)
    pipeline = [
        {"$match": {"ts": {"$gte": since}}},
        {"$group": {
            "_id":      None,
            "views":    {"$sum": 1},
            "sessions": {"$addToSet": "$session_id"},
            "users":    {"$addToSet": "$user_id"},
        }},
    ]
    result = await db.page_events.aggregate(pipeline).to_list(1)
    if not result:
        return {"views": 0, "sessions": 0, "authenticated_users": 0}
    r = result[0]
    return {
        "views":               r["views"],
        "sessions":            len([s for s in r["sessions"] if s]),
        "authenticated_users": len([u for u in r["users"] if u]),
    }


@router.get("/daily")
async def analytics_daily(days: int = 30, admin=Depends(require_staff), db=Depends(get_db)):
    """Page views and unique sessions per day for the last N days."""
    since = _since(days)
    pipeline = [
        {"$match": {"ts": {"$gte": since}}},
        {"$group": {
            "_id": {
                "y": {"$year":  "$ts"},
                "m": {"$month": "$ts"},
                "d": {"$dayOfMonth": "$ts"},
            },
            "views":    {"$sum": 1},
            "sessions": {"$addToSet": "$session_id"},
        }},
        {"$sort": {"_id.y": 1, "_id.m": 1, "_id.d": 1}},
    ]
    rows = await db.page_events.aggregate(pipeline).to_list(days + 5)
    return [
        {
            "date":     f"{r['_id']['y']}-{r['_id']['m']:02d}-{r['_id']['d']:02d}",
            "views":    r["views"],
            "sessions": len([s for s in r["sessions"] if s]),
        }
        for r in rows
    ]


@router.get("/top-pages")
async def top_pages(limit: int = 10, admin=Depends(require_staff), db=Depends(get_db)):
    """Most visited paths in the last 30 days."""
    since = _since(30)
    pipeline = [
        {"$match": {"ts": {"$gte": since}}},
        {"$group": {"_id": "$path", "views": {"$sum": 1}}},
        {"$sort": {"views": -1}},
        {"$limit": limit},
    ]
    rows = await db.page_events.aggregate(pipeline).to_list(limit)
    return [{"path": r["_id"], "views": r["views"]} for r in rows]


@router.get("/top-referrers")
async def top_referrers(limit: int = 8, admin=Depends(require_staff), db=Depends(get_db)):
    since = _since(30)
    pipeline = [
        {"$match": {"ts": {"$gte": since}, "referrer": {"$ne": ""}}},
        {"$group": {"_id": "$referrer", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    rows = await db.page_events.aggregate(pipeline).to_list(limit)
    return [{"referrer": r["_id"], "count": r["count"]} for r in rows]


@router.get("/hourly")
async def hourly_distribution(admin=Depends(require_staff), db=Depends(get_db)):
    """Views by hour of day (0–23) across the last 7 days."""
    since = _since(7)
    pipeline = [
        {"$match": {"ts": {"$gte": since}}},
        {"$group": {"_id": {"$hour": "$ts"}, "views": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    rows = await db.page_events.aggregate(pipeline).to_list(24)
    by_hour = {r["_id"]: r["views"] for r in rows}
    return [{"hour": h, "views": by_hour.get(h, 0)} for h in range(24)]