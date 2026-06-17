from __future__ import annotations

import re
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.schemas import (
    RecruiterProfileOut,
    RecruiterRegisterRequest,
    SavedCandidateCreate,
    SavedCandidateOut,
    SavedCandidateUpdate,
    TalentPoolCreate,
    TalentPoolOut,
)

router = APIRouter()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "company"


def _oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid id")
    return ObjectId(value)


def _require_recruiter(current_user: dict) -> None:
    if current_user.get("role") not in ("recruiter", "staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Recruiter role required")


def _json_safe(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    return value


def _profile_out(doc: dict) -> RecruiterProfileOut:
    return RecruiterProfileOut(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        company_name=doc.get("company_name", ""),
        company_slug=doc.get("company_slug", ""),
        logo_url=doc.get("logo_url", ""),
        website=doc.get("website", ""),
        description=doc.get("description", ""),
        industry=doc.get("industry", ""),
        size=doc.get("size", ""),
        location=doc.get("location", ""),
        verified=bool(doc.get("verified", False)),
        is_approved=bool(doc.get("is_approved", True)),
        created_at=doc.get("created_at", _utcnow()),
        updated_at=doc.get("updated_at", _utcnow()),
    )


def _pool_out(doc: dict, candidate_count: int = 0) -> TalentPoolOut:
    return TalentPoolOut(
        id=str(doc["_id"]),
        recruiter_id=doc["recruiter_id"],
        name=doc.get("name", ""),
        description=doc.get("description", ""),
        candidate_count=candidate_count,
        created_at=doc.get("created_at", _utcnow()),
        updated_at=doc.get("updated_at", _utcnow()),
    )


def _candidate_summary(cv_snapshot: dict | None) -> dict:
    data = (cv_snapshot or {}).get("data") or {}
    personal = data.get("personal_info") or {}
    return {
        "candidate_name": personal.get("full_name", ""),
        "candidate_title": personal.get("job_title", ""),
        "candidate_location": personal.get("location", ""),
        "skills": data.get("skills") or [],
    }


def _saved_candidate_out(doc: dict) -> SavedCandidateOut:
    return SavedCandidateOut(
        id=str(doc["_id"]),
        recruiter_id=doc["recruiter_id"],
        pool_id=doc.get("pool_id"),
        application_id=doc["application_id"],
        candidate_id=doc["candidate_id"],
        job_id=doc["job_id"],
        cv_id=doc["cv_id"],
        candidate_name=doc.get("candidate_name", ""),
        candidate_title=doc.get("candidate_title", ""),
        candidate_location=doc.get("candidate_location", ""),
        skills=doc.get("skills", []),
        cv_snapshot=_json_safe(doc.get("cv_snapshot")),
        notes=doc.get("notes", ""),
        source_job_title=doc.get("source_job_title", ""),
        status=doc.get("status", ""),
        created_at=doc.get("created_at", _utcnow()),
        updated_at=doc.get("updated_at", _utcnow()),
    )


async def _unique_slug(db, company_name: str, user_id: str) -> str:
    base = _slugify(company_name)
    slug = base
    suffix = 2
    while await db.company_profiles.find_one({"company_slug": slug, "user_id": {"$ne": user_id}}):
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


@router.post("/register", response_model=RecruiterProfileOut)
async def register_recruiter(body: RecruiterRegisterRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    user_id = str(current_user["_id"])
    now = _utcnow()
    existing = await db.company_profiles.find_one({"user_id": user_id})
    slug = await _unique_slug(db, body.company_name, user_id)
    profile = {
        "user_id": user_id,
        "company_name": body.company_name,
        "company_slug": slug,
        "logo_url": body.logo_url,
        "website": body.website,
        "description": body.description,
        "industry": body.industry,
        "size": body.size,
        "location": body.location,
        "verified": False,
        "is_approved": settings.axiom_auto_approve_recruiters,
        "updated_at": now,
    }
    if existing:
        await db.company_profiles.update_one({"_id": existing["_id"]}, {"$set": profile})
        doc = await db.company_profiles.find_one({"_id": existing["_id"]})
    else:
        profile["created_at"] = now
        result = await db.company_profiles.insert_one(profile)
        doc = await db.company_profiles.find_one({"_id": result.inserted_id})
    if (
        settings.axiom_auto_approve_recruiters
        and current_user.get("role", "user") not in ("admin", "superadmin", "staff")
    ):
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"role": "recruiter"}})
    return _profile_out(doc)


@router.get("/profile", response_model=RecruiterProfileOut)
async def get_profile(current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.company_profiles.find_one({"user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    return _profile_out(doc)


@router.get("/company/{slug}")
async def public_company(slug: str, db=Depends(get_db)):
    doc = await db.company_profiles.find_one({"company_slug": slug, "is_approved": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Company not found")
    cursor = db.axiom_jobs.find(
        {"employer_id": doc["user_id"], "is_active": True, "is_approved": True}
    ).sort("created_at", -1)
    jobs = await cursor.to_list(100)
    return {
        "profile": _profile_out(doc).model_dump(mode="json"),
        "jobs": [
            {
                "id": str(job["_id"]),
                "title": job.get("title", ""),
                "location": job.get("location", ""),
                "remote": bool(job.get("remote", False)),
                "job_type": job.get("job_type", ""),
                "created_at": job.get("created_at"),
            }
            for job in jobs
        ],
    }


@router.put("/profile", response_model=RecruiterProfileOut)
async def update_profile(body: RecruiterRegisterRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.company_profiles.find_one({"user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    updates = body.model_dump()
    updates["company_slug"] = await _unique_slug(db, body.company_name, str(current_user["_id"]))
    updates["updated_at"] = _utcnow()
    await db.company_profiles.update_one({"_id": doc["_id"]}, {"$set": updates})
    updated = await db.company_profiles.find_one({"_id": doc["_id"]})
    return _profile_out(updated)


@router.delete("/profile")
async def delete_profile(current_user=Depends(get_current_user), db=Depends(get_db)):
    user_id = str(current_user["_id"])
    doc = await db.company_profiles.find_one({"user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    await db.company_profiles.delete_one({"_id": doc["_id"]})
    await db.axiom_jobs.update_many(
        {"employer_id": user_id},
        {"$set": {"is_active": False, "updated_at": _utcnow()}},
    )
    if current_user.get("role") == "recruiter":
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"role": "user"}})
    return {"message": "Company profile removed"}


@router.get("/talent-pools", response_model=list[TalentPoolOut])
async def list_talent_pools(current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_recruiter(current_user)
    recruiter_id = str(current_user["_id"])
    docs = await db.talent_pools.find({"recruiter_id": recruiter_id}).sort("updated_at", -1).to_list(100)
    counts = {}
    for row in await db.saved_candidates.aggregate([
        {"$match": {"recruiter_id": recruiter_id, "pool_id": {"$ne": None}}},
        {"$group": {"_id": "$pool_id", "count": {"$sum": 1}}},
    ]).to_list(100):
        counts[row["_id"]] = row["count"]
    return [_pool_out(doc, counts.get(str(doc["_id"]), 0)) for doc in docs]


@router.post("/talent-pools", response_model=TalentPoolOut)
async def create_talent_pool(body: TalentPoolCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_recruiter(current_user)
    now = _utcnow()
    doc = {
        "recruiter_id": str(current_user["_id"]),
        "name": body.name.strip(),
        "description": body.description,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.talent_pools.insert_one(doc)
    created = await db.talent_pools.find_one({"_id": result.inserted_id})
    return _pool_out(created)


@router.get("/saved-candidates", response_model=list[SavedCandidateOut])
async def list_saved_candidates(pool_id: str | None = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_recruiter(current_user)
    query = {"recruiter_id": str(current_user["_id"])}
    if pool_id:
        query["pool_id"] = pool_id
    docs = await db.saved_candidates.find(query).sort("updated_at", -1).to_list(300)
    return [_saved_candidate_out(doc) for doc in docs]


@router.post("/saved-candidates", response_model=SavedCandidateOut)
async def save_candidate(body: SavedCandidateCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_recruiter(current_user)
    recruiter_id = str(current_user["_id"])
    if body.pool_id:
        pool = await db.talent_pools.find_one({"_id": _oid(body.pool_id), "recruiter_id": recruiter_id})
        if not pool:
            raise HTTPException(status_code=404, detail="Talent pool not found")
    application = await db.axiom_applications.find_one({"_id": _oid(body.application_id)})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.get("employer_id") != recruiter_id and current_user.get("role") not in ("staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Not your application")
    job = await db.axiom_jobs.find_one({"_id": _oid(application["job_id"])})
    now = _utcnow()
    summary = _candidate_summary(application.get("cv_snapshot"))
    doc = {
        "recruiter_id": recruiter_id,
        "pool_id": body.pool_id,
        "application_id": body.application_id,
        "candidate_id": application["candidate_id"],
        "job_id": application["job_id"],
        "cv_id": application["cv_id"],
        **summary,
        "cv_snapshot": application.get("cv_snapshot"),
        "notes": body.notes,
        "source_job_title": (job or {}).get("title", ""),
        "status": application.get("status", ""),
        "created_at": now,
        "updated_at": now,
    }
    existing = await db.saved_candidates.find_one({"recruiter_id": recruiter_id, "application_id": body.application_id})
    if existing:
        await db.saved_candidates.update_one({"_id": existing["_id"]}, {"$set": {**doc, "created_at": existing.get("created_at", now)}})
        updated = await db.saved_candidates.find_one({"_id": existing["_id"]})
        return _saved_candidate_out(updated)
    result = await db.saved_candidates.insert_one(doc)
    created = await db.saved_candidates.find_one({"_id": result.inserted_id})
    return _saved_candidate_out(created)


@router.put("/saved-candidates/{saved_id}", response_model=SavedCandidateOut)
async def update_saved_candidate(saved_id: str, body: SavedCandidateUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_recruiter(current_user)
    recruiter_id = str(current_user["_id"])
    doc = await db.saved_candidates.find_one({"_id": _oid(saved_id), "recruiter_id": recruiter_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Saved candidate not found")
    updates = {"updated_at": _utcnow()}
    if body.pool_id is not None:
        if body.pool_id:
            pool = await db.talent_pools.find_one({"_id": _oid(body.pool_id), "recruiter_id": recruiter_id})
            if not pool:
                raise HTTPException(status_code=404, detail="Talent pool not found")
        updates["pool_id"] = body.pool_id or None
    if body.notes is not None:
        updates["notes"] = body.notes
    await db.saved_candidates.update_one({"_id": doc["_id"]}, {"$set": updates})
    updated = await db.saved_candidates.find_one({"_id": doc["_id"]})
    return _saved_candidate_out(updated)


@router.delete("/saved-candidates/{saved_id}")
async def delete_saved_candidate(saved_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_recruiter(current_user)
    result = await db.saved_candidates.delete_one({"_id": _oid(saved_id), "recruiter_id": str(current_user["_id"])})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Saved candidate not found")
    return {"message": "Candidate removed"}


# Interview Results for Recruiters

@router.get("/candidates/{candidate_id}/interviews")
async def get_candidate_interviews(
    candidate_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get all interview sessions for a candidate (for recruiter view)."""
    _require_recruiter(current_user)

    # The candidate_id is actually a user ID - get candidate info
    candidate = await db.users.find_one({"_id": _oid(candidate_id)})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Find all completed interview sessions for this user
    cursor = db.interview_sessions.find({
        "user_id": candidate_id,
        "status": "completed",
    }).sort("created_at", -1)
    sessions = await cursor.to_list(50)

    result = []
    for session in sessions:
        result.append({
            "session_id": str(session["_id"]),
            "job_title": session.get("job_title", "Unknown role"),
            "company": session.get("company", "Unknown company"),
            "mode": session.get("mode", "behavioural"),
            "question_count": session.get("question_count", 0),
            "overall_score": session.get("overall_score"),
            "summary": session.get("summary"),
            "created_at": session.get("created_at"),
        })

    return {"candidate_id": candidate_id, "candidate_name": candidate.get("name", ""), "sessions": result}


@router.get("/candidates/{candidate_id}/interviews/{session_id}")
async def get_interview_session_detail(
    candidate_id: str,
    session_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get detailed interview session with questions, answers, and feedback."""
    _require_recruiter(current_user)

    # Get session
    session = await db.interview_sessions.find_one({"_id": _oid(session_id), "user_id": candidate_id})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    # Get all messages with answers
    cursor = db.interview_messages.find({"session_id": session_id}).sort("created_at", 1)
    messages = await cursor.to_list(50)

    # Get candidate info
    candidate = await db.users.find_one({"_id": _oid(candidate_id)})

    return {
        "session_id": str(session["_id"]),
        "candidate_id": candidate_id,
        "candidate_name": candidate.get("name", "") if candidate else "",
        "job_title": session.get("job_title", ""),
        "company": session.get("company", ""),
        "mode": session.get("mode", "behavioural"),
        "status": session.get("status"),
        "overall_score": session.get("overall_score"),
        "summary": session.get("summary"),
        "created_at": session.get("created_at"),
        "messages": [
            {
                "id": str(msg["_id"]),
                "question": msg.get("question", ""),
                "answer": msg.get("answer", ""),
                "feedback": msg.get("feedback"),
                "score": msg.get("score"),
            }
            for msg in messages
            if msg.get("answer")
        ],
    }


# List all candidates who have completed interviews

@router.get("/interview-candidates")
async def list_interview_candidates(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
    limit: int = 20,
    skip: int = 0,
):
    """List candidates who have completed mock interviews."""
    _require_recruiter(current_user)

    # Find unique users who have completed interview sessions
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": "$user_id", "session_count": {"$sum": 1}, "latest": {"$max": "$created_at"}}},
        {"$sort": {"latest": -1}},
        {"$skip": skip},
        {"$limit": limit},
    ]

    cursor = db.interview_sessions.aggregate(pipeline)
    results = await cursor.to_list(limit)

    candidates = []
    for r in results:
        user = await db.users.find_one({"_id": _oid(r["_id"])})
        if user:
            # Get their latest interview summary
            latest_session = await db.interview_sessions.find_one(
                {"user_id": r["_id"], "status": "completed"},
                sort=[("created_at", -1)]
            )
            candidates.append({
                "candidate_id": str(r["_id"]),
                "name": user.get("name", ""),
                "email": user.get("email", ""),
                "session_count": r["session_count"],
                "latest_job_title": latest_session.get("job_title", "") if latest_session else "",
                "latest_company": latest_session.get("company", "") if latest_session else "",
                "latest_score": latest_session.get("overall_score") if latest_session else None,
                "latest_date": latest_session.get("created_at") if latest_session else None,
            })

    return {"candidates": candidates}
