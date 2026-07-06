from fastapi import APIRouter, Depends, Request
from app.database import get_db
from app.middleware.auth import get_optional_user
from app.models.schemas import SearchResults, CVSearchResult, JobSearchResult
from app.limiter import limiter
from typing import Optional
from datetime import datetime

router = APIRouter()

DEFAULT_LIMIT = 10


def escape_mongo_regex(value: str) -> str:
    import re
    return re.escape(value)


@router.get("/", response_model=SearchResults)
@limiter.limit("20/minute")
async def global_search(
    request: Request,
    q: str = "",
    limit: int = DEFAULT_LIMIT,
    current_user=Depends(get_optional_user),
    db=Depends(get_db),
):
    if not q or len(q.strip()) < 2:
        return SearchResults(cvs=[], jobs=[])

    safe_q = escape_mongo_regex(q.strip())

    results_cvs = []
    results_jobs = []

    # Search user's own CVs by title
    if current_user:
        cv_query = {
            "owner_id": str(current_user["_id"]),
            "title": {"$regex": safe_q, "$options": "i"},
        }
        cursor = db.cvs.find(cv_query).sort("updated_at", -1).limit(limit)
        async for cv in cursor:
            results_cvs.append(CVSearchResult(
                id=str(cv["_id"]),
                title=cv["title"],
                owner_username=cv.get("owner_username", ""),
                updated_at=cv["updated_at"].isoformat() if cv.get("updated_at") else None,
            ))

    # Search jobs (external tracker jobs cached in local cache)
    jobs_query = {
        "$or": [
            {"title": {"$regex": safe_q, "$options": "i"}},
            {"company": {"$regex": safe_q, "$options": "i"}},
            {"description": {"$regex": safe_q, "$options": "i"}},
        ],
    }
    cursor = db.job_cache.find(jobs_query).sort("posted_at", -1).limit(limit)
    async for job in cursor:
        results_jobs.append(JobSearchResult(
            id=str(job["_id"]),
            title=job.get("title", ""),
            company=job.get("company", ""),
            location=job.get("location", ""),
            source=job.get("source", "indeed"),
            posted_at=job.get("posted_at").isoformat() if job.get("posted_at") else None,
        ))

    return SearchResults(cvs=results_cvs, jobs=results_jobs)