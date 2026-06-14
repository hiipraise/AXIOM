from __future__ import annotations

import re
import secrets
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse

from app.database import get_db
from app.services import job_service
from app.middleware.auth import get_current_user, get_optional_user
from app.models.schemas import AxiomJobCreate, AxiomJobOut, AxiomJobUpdate

router = APIRouter()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid id")
    return ObjectId(value)


def escape_mongo_regex(value: str) -> str:
    return re.escape(value)


def _job_out(doc: dict) -> AxiomJobOut:
    return AxiomJobOut(
        id=str(doc["_id"]),
        employer_id=doc["employer_id"],
        company_name=doc.get("company_name", ""),
        company_slug=doc.get("company_slug", ""),
        company_logo_url=doc.get("company_logo_url", ""),
        title=doc.get("title", ""),
        description=doc.get("description", ""),
        location=doc.get("location", ""),
        remote=bool(doc.get("remote", False)),
        job_type=doc.get("job_type", "full-time"),
        salary_min=doc.get("salary_min"),
        salary_max=doc.get("salary_max"),
        currency=doc.get("currency", "USD"),
        skills_required=doc.get("skills_required", []),
        experience_level=doc.get("experience_level", "mid"),
        industry=doc.get("industry", ""),
        apply_deadline=doc.get("apply_deadline"),
        is_active=bool(doc.get("is_active", True)),
        is_approved=bool(doc.get("is_approved", True)),
        share_token=doc.get("share_token", ""),
        views=int(doc.get("views", 0) or 0),
        created_at=doc.get("created_at", _utcnow()),
        updated_at=doc.get("updated_at", _utcnow()),
    )


async def _require_recruiter(current_user):
    if current_user.get("role") not in ("recruiter", "staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Recruiter role required")


@router.get("", response_model=list[AxiomJobOut], include_in_schema=False)
@router.get("/", response_model=list[AxiomJobOut])
async def list_axiom_jobs(q: str = "", region: str = "", source: str = "", mine: bool = False, current_user=Depends(get_optional_user), db=Depends(get_db)):
    query: dict = {"is_active": True, "is_approved": True}
    if q:
        safe_q = escape_mongo_regex(q)
        query["$or"] = [
            {"title": {"$regex": safe_q, "$options": "i"}},
            {"description": {"$regex": safe_q, "$options": "i"}},
            {"company_name": {"$regex": safe_q, "$options": "i"}},
            {"skills_required": {"$regex": safe_q, "$options": "i"}},
        ]
    if mine:
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        query = {"employer_id": str(current_user["_id"])}
    cursor = db.axiom_jobs.find(query).sort("created_at", -1).limit(100)
    items = []
    async for doc in cursor:
        if region and region.lower() not in (doc.get("location", "") + " " + doc.get("description", "")).lower():
            continue
        items.append(_job_out(doc))
    return items


@router.get("/mine", response_model=list[AxiomJobOut])
async def my_jobs(current_user=Depends(get_current_user), db=Depends(get_db)):
    await _require_recruiter(current_user)
    cursor = db.axiom_jobs.find({"employer_id": str(current_user["_id"])}).sort("created_at", -1)
    return [_job_out(doc) for doc in await cursor.to_list(100)]


@router.post("", response_model=AxiomJobOut, include_in_schema=False)
@router.post("/", response_model=AxiomJobOut)
async def create_axiom_job(body: AxiomJobCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    await _require_recruiter(current_user)
    active_count = await db.axiom_jobs.count_documents({"employer_id": str(current_user["_id"]), "is_active": True})
    if active_count >= 5 and current_user.get("role") == "recruiter":
        raise HTTPException(status_code=400, detail="Free recruiter limit is 5 active jobs")
    profile = await db.company_profiles.find_one({"user_id": str(current_user["_id"])})
    now = _utcnow()
    doc = body.model_dump()
    doc.update(
        {
            "employer_id": str(current_user["_id"]),
            "company_name": (profile or {}).get("company_name", current_user.get("username", "AXIOM employer")),
            "company_slug": (profile or {}).get("company_slug", ""),
            "company_logo_url": (profile or {}).get("logo_url", ""),
            "is_approved": True,
            "share_token": secrets.token_urlsafe(8),
            "views": 0,
            "created_at": now,
            "updated_at": now,
        }
    )
    result = await db.axiom_jobs.insert_one(doc)
    job_id = str(result.inserted_id)
    created = await db.axiom_jobs.find_one({"_id": result.inserted_id})
    # Invalidate job cache for AXIOM jobs
    await job_service.invalidate_job_cache(db, f"axiom:{job_id}", "axiom")
    return _job_out(created)


@router.get("/{job_id}", response_model=AxiomJobOut)
async def get_axiom_job(job_id: str, db=Depends(get_db)):
    doc = await db.axiom_jobs.find_one({"_id": _oid(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="AXIOM job not found")
    await db.axiom_jobs.update_one({"_id": doc["_id"]}, {"$inc": {"views": 1}})
    doc["views"] = int(doc.get("views", 0) or 0) + 1
    return _job_out(doc)


@router.put("/{job_id}", response_model=AxiomJobOut)
async def update_axiom_job(job_id: str, body: AxiomJobUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.axiom_jobs.find_one({"_id": _oid(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="AXIOM job not found")
    if doc["employer_id"] != str(current_user["_id"]) and current_user.get("role") not in ("admin", "superadmin", "staff"):
        raise HTTPException(status_code=403, detail="Not your job")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = _utcnow()
    await db.axiom_jobs.update_one({"_id": doc["_id"]}, {"$set": updates})
    updated = await db.axiom_jobs.find_one({"_id": doc["_id"]})
    # Invalidate job cache for AXIOM jobs
    await job_service.invalidate_job_cache(db, f"axiom:{job_id}", "axiom")
    return _job_out(updated)


@router.delete("/{job_id}")
async def delete_axiom_job(job_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.axiom_jobs.find_one({"_id": _oid(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="AXIOM job not found")
    if doc["employer_id"] != str(current_user["_id"]) and current_user.get("role") not in ("admin", "superadmin", "staff"):
        raise HTTPException(status_code=403, detail="Not your job")
    await db.axiom_jobs.update_one({"_id": doc["_id"]}, {"$set": {"is_active": False, "updated_at": _utcnow()}})
    # Invalidate job cache for AXIOM jobs
    await job_service.invalidate_job_cache(db, f"axiom:{job_id}", "axiom")
    return {"deleted": True}


@router.post("/{job_id}/share")
async def share_axiom_job(job_id: str, db=Depends(get_db)):
    doc = await db.axiom_jobs.find_one({"_id": _oid(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="AXIOM job not found")
    return {
        "url": f"/jobs/axiom/{job_id}",
        "title": doc.get("title", ""),
        "company": doc.get("company_name", ""),
        "description": doc.get("description", "")[:180],
        "logo_url": doc.get("company_logo_url", ""),
    }


@router.get("/{job_id}/meta")
async def axiom_job_meta(job_id: str, db=Depends(get_db)):
    doc = await db.axiom_jobs.find_one({"_id": _oid(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="AXIOM job not found")
    description = " ".join((doc.get("description", "") or "").split())[:220]
    return {
        "title": doc.get("title", ""),
        "description": description,
        "company": doc.get("company_name", ""),
        "image": doc.get("company_logo_url", ""),
        "url": f"/jobs/axiom/{job_id}",
    }


@router.get("/{job_id}/preview", response_class=HTMLResponse)
async def axiom_job_preview(job_id: str, db=Depends(get_db)):
    meta = await axiom_job_meta(job_id, db)
    title = f"{meta['title']} at {meta['company']}".strip()
    description = meta["description"]
    image = meta["image"]
    url = meta["url"]
    return f"""<!doctype html>
<html><head>
<title>{title}</title>
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="{url}" />
<meta property="og:image" content="{image}" />
<meta name="twitter:card" content="summary_large_image" />
<meta http-equiv="refresh" content="0; url={url}" />
</head><body><a href="{url}">{title}</a></body></html>"""
