from __future__ import annotations

import re
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.middleware.auth import get_current_user, get_optional_user
from app.models.schemas import (
    ApplicationCreate,
    ApplicationEntry,
    ApplicationStatus,
    ApplicationUpdate,
    CoverLetterRequest,
    CoverLetterResponse,
    JobMatchRequest,
    JobMatchResponse,
    JobResult,
    JobSearchResponse,
    SavedJobToggleResponse,
)
from app.services import ai_service, job_service

router = APIRouter()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _application_doc(doc: dict) -> ApplicationEntry:
    return ApplicationEntry(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        job_id=doc["job_id"],
        status=ApplicationStatus(doc.get("status", "saved")),
        cv_id=doc.get("cv_id"),
        notes=doc.get("notes", ""),
        applied_url=doc.get("applied_url"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        job=JobResult.model_validate(doc["job"]) if doc.get("job") else None,
    )


def escape_mongo_regex(value: str) -> str:
    return re.escape(value)


@router.get("/search", response_model=JobSearchResponse)
async def search_jobs(
    q: str = "",
    location: str = "",
    remote: bool | None = None,
    region: str = "",
    page: int = 1,
    per_page: int = 20,
    current_user=Depends(get_optional_user),
    db=Depends(get_db),
):
    cache_key = job_service.make_search_cache_key(q, location, remote, page, per_page, region)
    cached = await job_service.fetch_cached_search(db, cache_key)
    if cached:
        return JobSearchResponse(
            items=[JobResult.model_validate(item) for item in cached.get("payload", [])],
            total=len(cached.get("payload", [])),
            page=page,
            per_page=per_page,
            cached=True,
        )

    jobs = await job_service.search_jobs(q, location, remote, region)
    axiom_jobs = []
    axiom_filter = {"is_active": True, "is_approved": True}
    if q:
        safe_q = escape_mongo_regex(q)
        axiom_filter["$or"] = [
            {"title": {"$regex": safe_q, "$options": "i"}},
            {"description": {"$regex": safe_q, "$options": "i"}},
            {"skills_required": {"$regex": safe_q, "$options": "i"}},
            {"company_name": {"$regex": safe_q, "$options": "i"}},
        ]
    cursor = db.axiom_jobs.find(axiom_filter).sort("created_at", -1).limit(50)
    async for item in cursor:
        if location and location.lower() not in item.get("location", "").lower() and location.lower() not in item.get("description", "").lower():
            continue
        if remote is True and not item.get("remote", False):
            continue
        axiom_jobs.append(JobResult(
            id=f"axiom:{str(item['_id'])}",
            title=item.get("title", ""),
            company=item.get("company_name", "AXIOM employer"),
            location=item.get("location", ""),
            remote=bool(item.get("remote", False)),
            salary_min=item.get("salary_min"),
            salary_max=item.get("salary_max"),
            currency=item.get("currency", ""),
            description=item.get("description", ""),
            apply_url=f"/jobs/axiom/{str(item['_id'])}",
            posted_at=item.get("created_at"),
            source="axiom",
            category=item.get("job_type", ""),
            logo_url=item.get("company_logo_url") or None,
        ))
    jobs = axiom_jobs + jobs
    await job_service.cache_search_results(db, cache_key, jobs, {"q": q, "location": location, "remote": remote, "region": region, "page": page, "per_page": per_page})
    return JobSearchResponse(items=jobs, total=len(jobs), page=page, per_page=per_page, cached=False)


@router.post("/match-cv", response_model=JobMatchResponse)
async def match_cv(body: JobMatchRequest, current_user=Depends(get_current_user)):
    analysis = await ai_service.keyword_gap_analysis(
        body.cv_data.model_dump(),
        body.job_description,
    )
    present = analysis.get("present_keywords", [])
    missing = analysis.get("missing_keywords", [])
    score = int(analysis.get("ats_score_estimate", 0) or 0)
    if not score:
        total = len(present) + len(missing)
        score = int(round((len(present) / total) * 100)) if total else 0
    verdict = "Apply now" if score >= 75 else "Tailor first" if score >= 50 else "Significant gap"
    return JobMatchResponse(
        present_keywords=present,
        missing_keywords=missing,
        ats_score_estimate=score,
        notes=analysis.get("notes", ""),
        match_percentage=score,
        verdict=verdict,
    )


@router.post("/cover-letter", response_model=CoverLetterResponse)
async def cover_letter(body: CoverLetterRequest, current_user=Depends(get_current_user)):
    letter = await ai_service.generate_cover_letter(
        body.cv_data.model_dump(),
        body.job_title,
        body.company,
        body.job_description,
    )
    return CoverLetterResponse(cover_letter=letter)


@router.get("/saved")
async def list_saved_jobs(current_user=Depends(get_current_user), db=Depends(get_db)):
    cursor = db.saved_jobs.find({"user_id": str(current_user["_id"])}).sort("saved_at", -1)
    items = await cursor.to_list(100)
    return [
        {
            "id": str(item["_id"]),
            "user_id": item["user_id"],
            "job_id": item["job_id"],
            "saved_at": item["saved_at"],
            "job": JobResult.model_validate(item["job"]) if item.get("job") else None,
        }
        for item in items
    ]


@router.post("/saved/{job_id}", response_model=SavedJobToggleResponse)
async def save_job(job_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    job_doc = await db.job_cache.find_one({"job_id": job_id})
    if not job_doc:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.saved_jobs.update_one(
        {"user_id": str(current_user["_id"]), "job_id": job_id},
        {
            "$set": {
                "user_id": str(current_user["_id"]),
                "job_id": job_id,
                "job": job_doc.get("payload"),
                "saved_at": _utcnow(),
            }
        },
        upsert=True,
    )
    now = _utcnow()
    await db.applications.update_one(
        {"user_id": str(current_user["_id"]), "job_id": job_id},
        {
            "$set": {
                "user_id": str(current_user["_id"]),
                "job_id": job_id,
                "status": "saved",
                "cv_id": None,
                "job": job_doc.get("payload"),
                "updated_at": now,
            },
            "$setOnInsert": {
                "notes": "",
                "applied_url": None,
                "created_at": now,
            },
        },
        upsert=True,
    )
    return SavedJobToggleResponse(saved=True)


@router.delete("/saved/{job_id}", response_model=SavedJobToggleResponse)
async def unsave_job(job_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    await db.saved_jobs.delete_one({"user_id": str(current_user["_id"]), "job_id": job_id})
    return SavedJobToggleResponse(saved=False)


@router.get("/applications")
async def list_applications(current_user=Depends(get_current_user), db=Depends(get_db)):
    cursor = db.applications.find({"user_id": str(current_user["_id"])}).sort("updated_at", -1)
    items = await cursor.to_list(200)
    return [_application_doc(item).model_dump(mode="json") for item in items]


@router.post("/applications")
async def create_application(body: ApplicationCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    if body.job_id.startswith("axiom:"):
        raise HTTPException(status_code=400, detail="Use the AXIOM application flow for AXIOM jobs")
    job_doc = await db.job_cache.find_one({"job_id": body.job_id})
    if not job_doc:
        raise HTTPException(status_code=404, detail="Job not found")
    now = _utcnow()
    await db.applications.update_one(
        {"user_id": str(current_user["_id"]), "job_id": body.job_id},
        {
            "$set": {
                "user_id": str(current_user["_id"]),
                "job_id": body.job_id,
                "status": body.status.value,
                "cv_id": body.cv_id,
                "notes": body.notes,
                "applied_url": body.applied_url,
                "updated_at": now,
                "job": job_doc.get("payload"),
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    created = await db.applications.find_one({"user_id": str(current_user["_id"]), "job_id": body.job_id})
    return _application_doc(created).model_dump(mode="json")


@router.put("/applications/{application_id}")
async def update_application(application_id: str, body: ApplicationUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.applications.find_one({"_id": ObjectId(application_id), "user_id": str(current_user["_id"])} )
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    updates = {"updated_at": _utcnow()}
    if body.status is not None:
        updates["status"] = body.status.value
    if body.cv_id is not None:
        updates["cv_id"] = body.cv_id
    if body.notes is not None:
        updates["notes"] = body.notes
    if body.applied_url is not None:
        updates["applied_url"] = body.applied_url
    await db.applications.update_one({"_id": ObjectId(application_id)}, {"$set": updates})
    updated = await db.applications.find_one({"_id": ObjectId(application_id)})
    return _application_doc(updated).model_dump(mode="json")


@router.delete("/applications/{application_id}")
async def delete_application(application_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.applications.delete_one({"_id": ObjectId(application_id), "user_id": str(current_user["_id"])} )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"deleted": True}


@router.get("/{job_id}", response_model=JobResult)
async def get_job(job_id: str, current_user=Depends(get_optional_user), db=Depends(get_db)):
    cached = await db.job_cache.find_one({"job_id": job_id})
    if not cached:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResult.model_validate(cached["payload"])
