from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.middleware.auth import require_admin, require_staff, get_current_user
from app.middleware.validation import valid_object_id
from app.models.schemas import UserRoleUpdate
from app.utils.errors import not_found, forbidden, bad_request
from app.services.auth_service import hash_password
from app.config import settings
from bson import ObjectId
from datetime import datetime, timezone, timedelta

router = APIRouter()


# ── Audit helper ───────────────────────────────────────────────────────────────

async def audit(db, actor_id: str, action: str, target: str, detail: dict | None = None) -> None:
    """Write an immutable audit record. Never raises — a logging failure must
    not roll back the action that triggered it."""
    try:
        await db.audit_log.insert_one({
            "actor_id": actor_id,
            "action":   action,
            "target":   target,
            "detail":   detail or {},
            "ts":       datetime.now(timezone.utc),
        })
    except Exception:
        # TODO: pipe to an external logger (Sentry, stdout) in production
        pass


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/users/search")
async def search_users(
    q: str = "",
    role: str = "",
    status: str = "",  # active | inactive
    date_from: str = "",
    date_to: str = "",
    skip: int = 0,
    limit: int = 50,
    admin=Depends(require_staff),
    db=Depends(get_db),
):
    """Search users with advanced filters."""
    query: dict = {}
    if q:
        query["$or"] = [
            {"username": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    if role:
        query["role"] = role
    if status == "active":
        query["is_active"] = True
    elif status == "inactive":
        query["is_active"] = False
    if date_from or date_to:
        created_query: dict = {}
        if date_from:
            created_query["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            created_query["$lte"] = datetime.fromisoformat(date_to)
        query["created_at"] = created_query

    cursor = db.users.find(query, {"password_hash": 0, "secret_answer_hash": 0}).sort("created_at", -1).skip(skip).limit(limit)
    users = await cursor.to_list(limit)
    total = await db.users.count_documents(query)
    return {"users": [{**u, "_id": str(u["_id"])} for u in users], "total": total}


# ── Interview stats ───────────────────────────────────────────────────────────────

@router.get("/interview-stats")
async def interview_stats(admin=Depends(require_staff), db=Depends(get_db)):
    total_sessions = await db.interview_sessions.count_documents({})
    completed_sessions = await db.interview_sessions.count_documents({"status": "completed"})
    active_sessions = await db.interview_sessions.count_documents({"status": "in_progress"})

    # Average overall score for completed sessions
    score_pipeline = [
        {"$match": {"status": "completed", "summary.overall_score": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": None, "avg": {"$avg": "$summary.overall_score"}}}
    ]
    score_result = await db.interview_sessions.aggregate(score_pipeline).to_list(1)
    avg_score = round(score_result[0]["avg"], 1) if score_result and score_result[0].get("avg") else None

    # Dimension averages (weakest areas)
    dim_pipeline = [
        {"$match": {"status": "completed", "summary.dimension_scores": {"$exists": True}}},
        {"$unwind": "$summary.dimension_scores"},
        {"$group": {"_id": "$summary.dimension_scores.dimension", "avg": {"$avg": "$summary.dimension_scores.score"}}}
    ]
    dim_results = await db.interview_sessions.aggregate(dim_pipeline).to_list(10)
    dimension_averages = [
        {"dimension": r["_id"], "avg": round(r["avg"], 1)}
        for r in dim_results
    ]

    # Status breakdown
    status_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_results = await db.interview_sessions.aggregate(status_pipeline).to_list(10)
    status_breakdown = {r["_id"]: r["count"] for r in status_results}

    return {
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "active_sessions": active_sessions,
        "avg_score": avg_score,
        "dimension_averages": dimension_averages,
        "status_breakdown": status_breakdown,
    }


# ── Feedback & engagement stats ───────────────────────────────────────────────

@router.get("/engagement-stats")
async def engagement_stats(admin=Depends(require_staff), db=Depends(get_db)):
    # Active users in last 30 days
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    active_users = await db.page_events.distinct("user_id", {"ts": {"$gte": thirty_days_ago}})
    active_user_count = len([u for u in active_users if u])

    # Total feedback submissions
    total_feedback = await db.feedback.count_documents({})

    # Feedback per 100 active users (engagement rate)
    feedback_rate = round((total_feedback / active_user_count) * 100, 1) if active_user_count > 0 else 0

    # Feedback by sentiment/type if available
    sentiment_pipeline = [
        {"$group": {"_id": "$sentiment", "count": {"$sum": 1}}}
    ]
    sentiment_results = await db.feedback.aggregate(sentiment_pipeline).to_list(10)
    sentiment_breakdown = {r["_id"] or "unknown": r["count"] for r in sentiment_results}

    # Announcement stats
    total_announcements = await db.announcements.count_documents({})

    # Announcement interactions (clicks, dismissals tracked in page_events)
    clickPipeline = [
        {"$match": {"event_type": "announcement_click"}},
        {"$group": {"_id": "$announcement_id", "clicks": {"$sum": 1}}}
    ]
    clickResults = await db.page_events.aggregate(clickPipeline).to_list(100)
    click_breakdown = {r["_id"]: r["clicks"] for r in clickResults if r["_id"]}

    dismiss_pipeline = [
        {"$match": {"event_type": "announcement_dismiss"}},
        {"$group": {"_id": "$announcement_id", "dismisses": {"$sum": 1}}}
    ]
    dismissResults = await db.page_events.aggregate(dismiss_pipeline).to_list(100)
    dismiss_breakdown = {r["_id"]: r["dismisses"] for r in dismissResults if r["_id"]}

    return {
        "active_users_30d": active_user_count,
        "total_feedback": total_feedback,
        "feedback_per_100_users": feedback_rate,
        "sentiment_breakdown": sentiment_breakdown,
        "total_announcements": total_announcements,
        "announcement_clicks": sum(click_breakdown.values()),
        "announcement_dismisses": sum(dismiss_breakdown.values()),
        "click_breakdown": click_breakdown,
        "dismiss_breakdown": dismiss_breakdown,
    }


@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    admin=Depends(require_staff),
    db=Depends(get_db),
):
    cursor = db.users.find({}, {"password_hash": 0, "secret_answer_hash": 0}).skip(skip).limit(limit)
    users = await cursor.to_list(limit)
    total = await db.users.count_documents({})
    return {"users": [{**u, "_id": str(u["_id"])} for u in users], "total": total}


@router.put("/users/{user_id}/role")
async def set_user_role(body: UserRoleUpdate, user_id: str, admin=Depends(require_admin), db=Depends(get_db)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    role = body.role

    target = await db.users.find_one({"_id": ObjectId(user_id)}, {"role": 1})
    if not target:
        raise not_found("User")
    previous_role = target.get("role")

    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": role}})
    await audit(db, str(admin["_id"]), "set_role", user_id, {
        "previous_role": previous_role,
        "new_role": role,
    })
    return {"message": f"Role updated to {role}"}


@router.put("/users/{user_id}/deactivate")
async def deactivate_user(user_id: str, admin=Depends(require_admin), db=Depends(get_db)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_active": False}})
    await audit(db, str(admin["_id"]), "deactivate_user", user_id)
    return {"message": "User deactivated"}


@router.put("/users/{user_id}/activate")
async def activate_user(user_id: str, admin=Depends(require_admin), db=Depends(get_db)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_active": True}})
    await audit(db, str(admin["_id"]), "activate_user", user_id)
    return {"message": "User activated"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(require_admin), db=Depends(get_db)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise not_found("User")
    if user.get("role") == "superadmin":
        raise forbidden("Cannot delete super admin")

    cvs = await db.cvs.find({"owner_id": user_id}, {"_id": 1}).to_list(None)
    cv_ids = [str(cv["_id"]) for cv in cvs]
    if cv_ids:
        await db.cv_history.delete_many({"cv_id": {"$in": cv_ids}})
    await db.cv_history.delete_many({"owner_id": user_id})
    await db.cvs.delete_many({"owner_id": user_id})
    await db.saved_jobs.delete_many({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    await db.interview_sessions.delete_many({"user_id": user_id})
    await db.interview_messages.delete_many({"user_id": user_id})
    await db.feedback.delete_many({"user_id": user_id})
    await db.page_events.delete_many({"user_id": user_id})
    await db.users.delete_one({"_id": ObjectId(user_id)})
    await audit(db, str(admin["_id"]), "delete_user", user_id, {
        "username": user.get("username"),
        "email":    user.get("email"),
        "role":     user.get("role"),
    })
    return {"message": "User deleted"}


# ── AI usage tracking ────────────────────────────────────────────────────────

@router.get("/ai-stats")
async def ai_stats(admin=Depends(require_staff), db=Depends(get_db)):
    """AI call stats: daily volume, success/fail, token usage, feature breakdown."""
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    since_7d = datetime.now(timezone.utc) - timedelta(days=7)

    # Total AI events
    total_calls = await db.ai_events.count_documents({})

    # Daily calls last 7 days
    daily_pipeline = [
        {"$match": {"ts": {"$gte": since_7d}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts"}},
            "calls": {"$sum": 1},
            "tokens": {"$sum": "$tokens_approx"},
            "failed": {"$sum": {"$cond": ["$success", 0, 1]}}
        }},
        {"$sort": {"_id": 1}}
    ]
    daily_results = await db.ai_events.aggregate(daily_pipeline).to_list(8)
    daily = [{"date": r["_id"], "calls": r["calls"], "tokens": r["tokens"], "failed": r["failed"]} for r in daily_results]

    # Feature breakdown
    feature_pipeline = [
        {"$group": {"_id": "$feature", "count": {"$sum": 1}, "tokens": {"$sum": "$tokens_approx"}}},
        {"$sort": {"count": -1}}
    ]
    feature_results = await db.ai_events.aggregate(feature_pipeline).to_list(20)
    feature_breakdown = [{"feature": r["_id"] or "unknown", "calls": r["count"], "tokens": r["tokens"]} for r in feature_results]

    # Error rate
    errors = await db.ai_events.count_documents({"success": False})
    error_rate = round((errors / total_calls) * 100, 1) if total_calls > 0 else 0

    # Unique users
    active_users = await db.ai_events.distinct("user_id", {"ts": {"$gte": thirty_days_ago}})
    active_user_count = len([u for u in active_users if u])

    return {
        "total_calls": total_calls,
        "active_users_30d": active_user_count,
        "error_rate": error_rate,
        "daily": daily,
        "feature_breakdown": feature_breakdown,
    }


# ── Security events ────────────────────────────────────────────────────────────

@router.get("/security-stats")
async def security_stats(admin=Depends(require_staff), db=Depends(get_db)):
    """Security event stats: failed logins, brute-force attempts, suspicious activity."""
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    since_7d = datetime.now(timezone.utc) - timedelta(days=7)

    # Failed logins
    failed_logins = await db.security_events.count_documents({"type": "failed_login"})

    # Recent failed logins per day
    daily_pipeline = [
        {"$match": {"type": "failed_login", "ts": {"$gte": since_7d}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    daily_results = await db.security_events.aggregate(daily_pipeline).to_list(8)
    daily_failed = [{"date": r["_id"], "count": r["count"]} for r in daily_results]

    # Failed logins by username (for brute-force detection)
    username_pipeline = [
        {"$match": {"type": "failed_login"}},
        {"$group": {"_id": "$username", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    username_results = await db.security_events.aggregate(username_pipeline).to_list(10)
    top_failed_usernames = [{"username": r["_id"], "count": r["count"]} for r in username_results]

    # Unique IPs with failed logins
    unique_ips = await db.security_events.distinct("ip", {"type": "failed_login", "ts": {"$gte": thirty_days_ago}})
    unique_ip_count = len([ip for ip in unique_ips if ip])

    # Other security events
    other_events = await db.security_events.count_documents({"type": {"$ne": "failed_login"}})

    return {
        "total_failed_logins": failed_logins,
        "unique_ips_30d": unique_ip_count,
        "total_other_events": other_events,
        "daily_failed": daily_failed,
        "top_failed_usernames": top_failed_usernames,
    }


# ── PDF export tracking ────────────────────────────────────────────────────────────

@router.get("/export-stats")
async def export_stats(admin=Depends(require_staff), db=Depends(get_db)):
    """PDF export stats: daily volume, type breakdown, size trends."""
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    since_7d = datetime.now(timezone.utc) - timedelta(days=7)

    # Total exports
    total_exports = await db.export_events.count_documents({})

    # Daily exports last 7 days
    daily_pipeline = [
        {"$match": {"ts": {"$gte": since_7d}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts"}},
            "count": {"$sum": 1},
            "size_mb": {"$sum": {"$divide": ["$size_bytes", 1_000_000]}}
        }},
        {"$sort": {"_id": 1}}
    ]
    daily_results = await db.export_events.aggregate(daily_pipeline).to_list(8)
    daily = [{"date": r["_id"], "count": r["count"], "size_mb": round(r["size_mb"], 2)} for r in daily_results]

    # Type breakdown
    type_pipeline = [
        {"$group": {"_id": "$type", "count": {"$sum": 1}, "size_mb": {"$sum": {"$divide": ["$size_bytes", 1_000_000]}}}},
        {"$sort": {"count": -1}}
    ]
    type_results = await db.export_events.aggregate(type_pipeline).to_list(10)
    type_breakdown = [{"type": r["_id"], "count": r["count"], "size_mb": round(r["size_mb"], 2)} for r in type_results]

    # Users exporting
    active_users = await db.export_events.distinct("user_id", {"ts": {"$gte": thirty_days_ago}})
    active_user_count = len([u for u in active_users if u])

    return {
        "total_exports": total_exports,
        "active_users_30d": active_user_count,
        "daily": daily,
        "type_breakdown": type_breakdown,
    }


# ── Stats & read-only views ────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(admin=Depends(require_staff), db=Depends(get_db)):
    total_users       = await db.users.count_documents({})
    total_cvs         = await db.cvs.count_documents({})
    public_cvs        = await db.cvs.count_documents({"is_public": True})
    total_saved_jobs  = await db.saved_jobs.count_documents({})
    # Active users in last 30 days (via last_seen_at)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    active_users_30d = await db.users.count_documents({
        "is_active": True,
        "last_seen_at": {"$gte": thirty_days_ago},
    })
    return {
        "total_users":       total_users,
        "total_cvs":         total_cvs,
        "public_cvs":        public_cvs,
        "total_saved_jobs":  total_saved_jobs,
        "active_users_30d":  active_users_30d,
    }


@router.get("/cvs")
async def list_all_cvs(skip: int = 0, limit: int = 50, admin=Depends(require_staff), db=Depends(get_db)):
    cursor = db.cvs.find({}).sort("updated_at", -1).skip(skip).limit(limit)
    cvs    = await cursor.to_list(limit)
    total  = await db.cvs.count_documents({})
    return {
        "cvs": [
            {
                "id":             str(c["_id"]),
                "title":          c["title"],
                "owner_username": c["owner_username"],
                "is_public":      c.get("is_public"),
                "updated_at":     c["updated_at"],
            }
            for c in cvs
        ],
        "total": total,
    }


# ── Push notification subscriptions ────────────────────────────────────────────

@router.get("/push-subscriptions")
async def list_push_subscriptions(skip: int = 0, limit: int = 100, admin=Depends(require_staff), db=Depends(get_db)):
    """List all push subscriptions with user info."""
    cursor = db.push_subscriptions.find({}).sort("updated_at", -1).skip(skip).limit(limit)
    subs = await cursor.to_list(limit)
    total = await db.push_subscriptions.count_documents({})

    # Batch lookup users to avoid N+1
    user_ids = [ObjectId(s["user_id"]) for s in subs if ObjectId.is_valid(s["user_id"])]
    user_map = {}
    if user_ids:
        users = await db.users.find(
            {"_id": {"$in": user_ids}},
            {"username": 1, "email": 1},
        ).to_list(None)
        for u in users:
            user_map[str(u["_id"])] = u

    results = []
    for sub in subs:
        user = user_map.get(sub["user_id"])
        results.append({
            "user_id": sub["user_id"],
            "username": (user or {}).get("username", "Unknown"),
            "email": (user or {}).get("email"),
            "endpoint": sub["endpoint"][:80] + "..." if len(sub.get("endpoint", "")) > 80 else sub.get("endpoint", ""),
            "subscribed_at": sub.get("updated_at") or sub.get("created_at"),
        })

    return {"subscriptions": results, "total": total}


# ── Push notification stats ───────────────────────────────────────────────────

@router.get("/push-stats")
async def get_push_stats(admin=Depends(require_staff), db=Depends(get_db)):
    """Push notification stats: total subscriptions and VAPID configuration status."""
    total_subscriptions = await db.push_subscriptions.count_documents({})
    # Count distinct users with push subscriptions for unique user metric
    distinct_users = len(await db.push_subscriptions.distinct("user_id"))
    return {
        "total_subscriptions": total_subscriptions,
        "distinct_users": distinct_users,
        "vapid_configured": bool(settings.vapid_public_key and settings.vapid_private_key),
    }


# ── VAPID key management ──────────────────────────────────────────────────────

@router.get("/vapid-status")
async def get_vapid_status(admin=Depends(require_admin)):
    """Check if VAPID keys are configured for push notifications."""
    from app.config import settings
    return {
        "configured": bool(settings.vapid_public_key and settings.vapid_private_key),
        "has_public_key": bool(settings.vapid_public_key),
    }


@router.post("/vapid-generate")
async def generate_vapid_keys(admin=Depends(require_admin)):
    """Generate new VAPID keys. Returns the public and private keys.
    These must be added to the .env file manually to persist across restarts.
    """
    try:
        from pywebpush import webpush
        keys = webpush.generate_vapid_keys()
        return {
            "public_key": keys.get("public_key") or keys.vapid_public_key,
            "private_key": keys.get("private_key") or keys.vapid_private_key,
            "note": "Add these to your .env file as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY. Keys are ephemeral until saved.",
        }
    except ImportError:
        raise HTTPException(status_code=400, detail="pywebpush is not installed — run 'pip install pywebpush'")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate VAPID keys: {e}")


# ── Audit log viewer ───────────────────────────────────────────────────────────

@router.get("/audit-log")
async def get_audit_log(
    skip: int = 0,
    limit: int = 100,
    admin=Depends(require_admin),
    db=Depends(get_db),
):
    cursor  = db.audit_log.find({}).sort("ts", -1).skip(skip).limit(limit)
    entries = await cursor.to_list(limit)
    total   = await db.audit_log.count_documents({})
    return {
        "entries": [
            {
                "id":       str(e["_id"]),
                "actor_id": e["actor_id"],
                "action":   e["action"],
                "target":   e["target"],
                "detail":   e.get("detail", {}),
                "ts":       e["ts"],
            }
            for e in entries
        ],
        "total": total,
    }
