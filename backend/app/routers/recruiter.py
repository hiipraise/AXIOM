from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.schemas import RecruiterProfileOut, RecruiterRegisterRequest

router = APIRouter()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "company"


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
