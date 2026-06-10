from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.middleware.auth import require_admin, require_staff, get_current_user
from app.services.auth_service import hash_password
from bson import ObjectId
from datetime import datetime, timezone

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
async def set_user_role(user_id: str, body: dict, admin=Depends(require_admin), db=Depends(get_db)):
    role = body.get("role")
    if role not in ("user", "recruiter", "staff", "admin"):
        raise HTTPException(400, "Invalid role")

    target = await db.users.find_one({"_id": ObjectId(user_id)}, {"role": 1})
    if not target:
        raise HTTPException(404, "User not found")
    previous_role = target.get("role")

    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": role}})
    await audit(db, str(admin["_id"]), "set_role", user_id, {
        "previous_role": previous_role,
        "new_role": role,
    })
    return {"message": f"Role updated to {role}"}


@router.put("/users/{user_id}/deactivate")
async def deactivate_user(user_id: str, admin=Depends(require_admin), db=Depends(get_db)):
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_active": False}})
    await audit(db, str(admin["_id"]), "deactivate_user", user_id)
    return {"message": "User deactivated"}


@router.put("/users/{user_id}/activate")
async def activate_user(user_id: str, admin=Depends(require_admin), db=Depends(get_db)):
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_active": True}})
    await audit(db, str(admin["_id"]), "activate_user", user_id)
    return {"message": "User activated"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(require_admin), db=Depends(get_db)):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(404, "User not found")
    if user.get("role") == "superadmin":
        raise HTTPException(403, "Cannot delete super admin")

    cvs = await db.cvs.find({"owner_id": user_id}, {"_id": 1}).to_list(None)
    cv_ids = [str(cv["_id"]) for cv in cvs]
    if cv_ids:
        await db.cv_history.delete_many({"cv_id": {"$in": cv_ids}})
    await db.cv_history.delete_many({"owner_id": user_id})
    await db.cvs.delete_many({"owner_id": user_id})
    await db.saved_jobs.delete_many({"user_id": user_id})
    await db.applications.delete_many({"user_id": user_id})
    await db.axiom_applications.delete_many({"candidate_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    await db.ratings.delete_many({"owner_id": user_id})
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


# ── Recruiters ─────────────────────────────────────────────────────────────────

@router.get("/recruiters")
async def list_recruiters(admin=Depends(require_staff), db=Depends(get_db)):
    cursor = db.company_profiles.find({}).sort("created_at", -1)
    profiles = await cursor.to_list(200)
    return [
        {
            "id":           str(profile["_id"]),
            "user_id":      profile["user_id"],
            "company_name": profile.get("company_name", ""),
            "company_slug": profile.get("company_slug", ""),
            "website":      profile.get("website", ""),
            "verified":     bool(profile.get("verified", False)),
            "is_approved":  bool(profile.get("is_approved", False)),
            "created_at":   profile.get("created_at"),
        }
        for profile in profiles
    ]


@router.put("/recruiters/{profile_id}/approval")
async def set_recruiter_approval(profile_id: str, body: dict, admin=Depends(require_admin), db=Depends(get_db)):
    approved = bool(body.get("is_approved"))
    verified = bool(body.get("verified", approved))

    profile = await db.company_profiles.find_one({"_id": ObjectId(profile_id)})
    if not profile:
        raise HTTPException(404, "Recruiter profile not found")
    previous = {
        "is_approved": profile.get("is_approved"),
        "verified":    profile.get("verified"),
    }

    await db.company_profiles.update_one(
        {"_id": profile["_id"]},
        {"$set": {"is_approved": approved, "verified": verified, "updated_at": datetime.now(timezone.utc)}},
    )
    if approved:
        await db.users.update_one({"_id": ObjectId(profile["user_id"])}, {"$set": {"role": "recruiter"}})

    await audit(db, str(admin["_id"]), "set_recruiter_approval", profile_id, {
        "company_name": profile.get("company_name"),
        "user_id":      profile["user_id"],
        "previous":     previous,
        "new":          {"is_approved": approved, "verified": verified},
    })
    return {"message": "Recruiter approval updated"}


# ── Stats & read-only views ────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(admin=Depends(require_staff), db=Depends(get_db)):
    total_users   = await db.users.count_documents({})
    total_cvs     = await db.cvs.count_documents({})
    public_cvs    = await db.cvs.count_documents({"is_public": True})
    total_ratings = await db.ratings.count_documents({})
    pipeline      = [{"$group": {"_id": None, "avg": {"$avg": "$score"}}}]
    avg_result    = await db.ratings.aggregate(pipeline).to_list(1)
    avg_rating    = avg_result[0]["avg"] if avg_result else None
    return {
        "total_users":   total_users,
        "total_cvs":     total_cvs,
        "public_cvs":    public_cvs,
        "total_ratings": total_ratings,
        "avg_rating":    round(avg_rating, 2) if avg_rating else None,
    }


@router.get("/ratings")
async def get_ratings(skip: int = 0, limit: int = 50, admin=Depends(require_staff), db=Depends(get_db)):
    cursor  = db.ratings.find({}).sort("created_at", -1).skip(skip).limit(limit)
    ratings = await cursor.to_list(limit)
    return [
        {
            "id":         str(r["_id"]),
            "cv_id":      r["cv_id"],
            "score":      r["score"],
            "comment":    r.get("comment"),
            "created_at": r["created_at"],
        }
        for r in ratings
    ]


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
