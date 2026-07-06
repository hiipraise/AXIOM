from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from app.database import get_db
from app.limiter import limiter, DEFAULT_LIMIT, AI_LIMIT
from app.middleware.auth import get_current_user, get_optional_user
from app.models.schemas import (
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


@router.get("/search", response_model=JobSearchResponse)
@limiter.limit(DEFAULT_LIMIT)
async def search_jobs(
    request: Request,
    q: str = "",
    location: str = "",
    remote: bool | None = None,
    region: str = "",
    nigeria_state: str = "",
    page: int = 1,
    per_page: int = 20,
    current_user=Depends(get_optional_user),
    db=Depends(get_db),
):
    cache_key = job_service.make_search_cache_key(q, location, remote, page, per_page, region, nigeria_state)
    cached = await job_service.fetch_cached_search(db, cache_key)
    if cached:
        return JobSearchResponse(
            items=[JobResult.model_validate(item) for item in cached.get("payload", [])],
            total=len(cached.get("payload", [])),
            page=page,
            per_page=per_page,
            cached=True,
        )

    jobs, source_health = await job_service.search_jobs(q, location, remote, region, nigeria_state)
    await job_service.cache_search_results(db, cache_key, jobs, {"q": q, "location": location, "remote": remote, "region": region, "page": page, "per_page": per_page})
    return JobSearchResponse(items=jobs, total=len(jobs), page=page, per_page=per_page, cached=False, source_health=source_health)


@router.post("/match-cv", response_model=JobMatchResponse)
@limiter.limit(AI_LIMIT)
async def match_cv(request: Request, body: JobMatchRequest, current_user=Depends(get_current_user)):
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
@limiter.limit(AI_LIMIT)
async def cover_letter(request: Request, body: CoverLetterRequest, current_user=Depends(get_current_user)):
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
    return SavedJobToggleResponse(saved=True)


@router.delete("/saved/{job_id}", response_model=SavedJobToggleResponse)
async def unsave_job(job_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    await db.saved_jobs.delete_one({"user_id": str(current_user["_id"]), "job_id": job_id})
    return SavedJobToggleResponse(saved=False)


@router.get("/{job_id}", response_model=JobResult)
async def get_job(job_id: str, current_user=Depends(get_optional_user), db=Depends(get_db)):
    cached = await db.job_cache.find_one({"job_id": job_id})
    if not cached:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResult.model_validate(cached["payload"])
