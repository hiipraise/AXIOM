from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.schemas import AxiomApplicationCreate, AxiomApplicationOut, AxiomApplicationStatus, AxiomApplicationUpdate, AxiomJobOut
from app.routers.axiom_jobs import _job_out
from app.services.notification_service import create_notification

router = APIRouter()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid id")
    return ObjectId(value)


def _app_out(doc: dict, job: AxiomJobOut | None = None) -> AxiomApplicationOut:
    return AxiomApplicationOut(
        id=str(doc["_id"]),
        job_id=doc["job_id"],
        candidate_id=doc["candidate_id"],
        employer_id=doc["employer_id"],
        cv_id=doc["cv_id"],
        cv_snapshot=doc.get("cv_snapshot"),
        cover_letter=doc.get("cover_letter", ""),
        status=AxiomApplicationStatus(doc.get("status", "applied")),
        employer_notes=doc.get("employer_notes", ""),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        job=job,
    )

@router.get("", response_model=list[AxiomApplicationOut], include_in_schema=False)
@router.get("/", response_model=list[AxiomApplicationOut])
async def list_candidate_applications(current_user=Depends(get_current_user), db=Depends(get_db)):
    cursor = db.axiom_applications.find({"candidate_id": str(current_user["_id"])}).sort("updated_at", -1)
    docs = await cursor.to_list(100)
    result = []
    for doc in docs:
        job_doc = None
        try:
            job_doc = await db.axiom_jobs.find_one({"_id": _oid(doc["job_id"])})
        except Exception:
            pass
        result.append(_app_out(doc, _job_out(job_doc) if job_doc else None))
    return result


@router.post("/", response_model=AxiomApplicationOut)
async def apply_to_axiom_job(body: AxiomApplicationCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    job = await db.axiom_jobs.find_one({"_id": _oid(body.job_id), "is_active": True, "is_approved": True})
    if not job:
        raise HTTPException(status_code=404, detail="AXIOM job not found")
    if job.get("employer_id") == str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You cannot apply to your own job")
    cv = await db.cvs.find_one({"_id": _oid(body.cv_id), "owner_id": str(current_user["_id"])})
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    now = _utcnow()
    doc = {
        "job_id": body.job_id,
        "candidate_id": str(current_user["_id"]),
        "employer_id": job["employer_id"],
        "cv_id": body.cv_id,
        "cv_snapshot": cv,
        "cover_letter": body.cover_letter,
        "status": "applied",
        "employer_notes": "",
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await db.axiom_applications.insert_one(doc)
    except Exception:
        raise HTTPException(status_code=400, detail="You have already applied to this job")
    await create_notification(db, job["employer_id"], "New AXIOM job application", f"{current_user.get('username')} applied for {job.get('title')}", "application", "/recruiter/applications")
    created = await db.axiom_applications.find_one({"_id": result.inserted_id})
    return _app_out(created, _job_out(job))


@router.get("/employer", response_model=list[AxiomApplicationOut])
async def employer_applications(current_user=Depends(get_current_user), db=Depends(get_db)):
    if current_user.get("role") not in ("recruiter", "staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Recruiter role required")
    cursor = db.axiom_applications.find({"employer_id": str(current_user["_id"])}).sort("updated_at", -1)
    docs = await cursor.to_list(200)
    result = []
    for doc in docs:
        job_doc = None
        try:
            job_doc = await db.axiom_jobs.find_one({"_id": _oid(doc["job_id"])})
        except Exception:
            pass
        result.append(_app_out(doc, _job_out(job_doc) if job_doc else None))
    return result


@router.put("/{application_id}/status", response_model=AxiomApplicationOut)
async def update_application_status(application_id: str, body: AxiomApplicationUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.axiom_applications.find_one({"_id": _oid(application_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    if doc["employer_id"] != str(current_user["_id"]) and current_user.get("role") not in ("staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Not your application")
    updates = {"updated_at": _utcnow()}
    if body.status is not None:
        updates["status"] = body.status.value
    if body.employer_notes is not None:
        updates["employer_notes"] = body.employer_notes
    await db.axiom_applications.update_one({"_id": doc["_id"]}, {"$set": updates})
    updated = await db.axiom_applications.find_one({"_id": doc["_id"]})
    if body.status is not None:
        await create_notification(db, updated["candidate_id"], "Application status updated", f"Your application is now {body.status.value.replace('_', ' ')}.", "application", "/tracker")
    job_doc = await db.axiom_jobs.find_one({"_id": _oid(updated["job_id"])})
    return _app_out(updated, _job_out(job_doc) if job_doc else None)
