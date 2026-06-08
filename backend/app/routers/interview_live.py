from __future__ import annotations

import uuid
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.schemas import LiveInterviewSession, LiveInterviewStart
from app.services.notification_service import create_notification

router = APIRouter()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid id")
    return ObjectId(value)


def _session_out(doc: dict) -> LiveInterviewSession:
    return LiveInterviewSession(
        id=str(doc["_id"]),
        session_type=doc.get("session_type", "live_manual"),
        axiom_application_id=doc.get("axiom_application_id"),
        jitsi_room=doc.get("jitsi_room"),
        jitsi_password=doc.get("jitsi_password"),
        scheduled_at=doc.get("scheduled_at"),
        duration_minutes=int(doc.get("duration_minutes", 30) or 30),
        employer_id=doc.get("employer_id"),
        candidate_id=doc.get("candidate_id"),
        employer_joined_at=doc.get("employer_joined_at"),
        candidate_joined_at=doc.get("candidate_joined_at"),
        ended_at=doc.get("ended_at"),
        recording_consent=bool(doc.get("recording_consent", False)),
        transcript=doc.get("transcript", []),
        employer_notes=doc.get("employer_notes", ""),
        employer_decision=doc.get("employer_decision"),
        created_at=doc.get("created_at", _utcnow()),
        updated_at=doc.get("updated_at", _utcnow()),
    )


@router.post("/schedule", response_model=LiveInterviewSession)
async def schedule_interview(body: LiveInterviewStart, current_user=Depends(get_current_user), db=Depends(get_db)):
    app = await db.axiom_applications.find_one({"_id": _oid(body.application_id)})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app["employer_id"] != str(current_user["_id"]) and current_user.get("role") not in ("staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Not your application")
    now = _utcnow()
    doc = {
        "session_type": body.session_type,
        "axiom_application_id": body.application_id,
        "jitsi_room": f"axiom-{uuid.uuid4().hex}",
        "jitsi_password": None,
        "scheduled_at": body.scheduled_at,
        "duration_minutes": body.duration_minutes,
        "employer_id": app["employer_id"],
        "candidate_id": app["candidate_id"],
        "recording_consent": False,
        "transcript": [],
        "employer_notes": "",
        "employer_decision": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.interview_sessions.insert_one(doc)
    await db.axiom_applications.update_one({"_id": app["_id"]}, {"$set": {"status": "interview_scheduled", "updated_at": now}})
    await create_notification(db, app["candidate_id"], "Interview scheduled", "Your AXIOM interview invite is ready.", "interview", f"/interview/live/{str(result.inserted_id)}")
    created = await db.interview_sessions.find_one({"_id": result.inserted_id})
    return _session_out(created)


@router.get("/{session_id}", response_model=LiveInterviewSession)
async def get_live_interview(session_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.interview_sessions.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    user_id = str(current_user["_id"])
    if user_id not in (doc.get("employer_id"), doc.get("candidate_id")) and current_user.get("role") not in ("staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Not your interview")
    field = "employer_joined_at" if user_id == doc.get("employer_id") else "candidate_joined_at"
    await db.interview_sessions.update_one({"_id": doc["_id"]}, {"$set": {field: _utcnow(), "updated_at": _utcnow()}})
    updated = await db.interview_sessions.find_one({"_id": doc["_id"]})
    return _session_out(updated)


@router.put("/{session_id}/feedback", response_model=LiveInterviewSession)
async def update_live_feedback(session_id: str, body: dict, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.interview_sessions.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    if doc.get("employer_id") != str(current_user["_id"]) and current_user.get("role") not in ("staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Employer only")
    updates = {
        "employer_notes": body.get("employer_notes", doc.get("employer_notes", "")),
        "employer_decision": body.get("employer_decision", doc.get("employer_decision")),
        "updated_at": _utcnow(),
    }
    if body.get("ended"):
        updates["ended_at"] = _utcnow()
    await db.interview_sessions.update_one({"_id": doc["_id"]}, {"$set": updates})
    updated = await db.interview_sessions.find_one({"_id": doc["_id"]})
    return _session_out(updated)
