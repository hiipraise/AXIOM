from __future__ import annotations

import uuid
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.schemas import LiveInterviewSession, LiveInterviewStart, LiveAnswer, LiveFollowUp, LiveFeedbackUpdate
from app.services.ai_service import evaluate_interview_answer, generate_interview_question, summarize_interview_session
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
        question_queue=doc.get("question_queue", []),
        current_question=doc.get("current_question", ""),
        employer_question=doc.get("employer_question", ""),
        employer_question_updated_at=doc.get("employer_question_updated_at"),
        ai_summary=doc.get("ai_summary", ""),
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

    job_doc = await db.axiom_jobs.find_one({"_id": ObjectId(app["job_id"])}) if app.get("job_id") else None
    job_title = (job_doc or {}).get("title", "your role")

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
        "question_queue": [],
        "current_question": "",
        "employer_question": "",
        "employer_question_updated_at": None,
        "ai_summary": "",
        "employer_notes": "",
        "employer_decision": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.interview_sessions.insert_one(doc)
    await db.axiom_applications.update_one({"_id": app["_id"]}, {"$set": {"status": "interview_scheduled", "updated_at": now}})

    scheduled_str = ""
    if body.scheduled_at:
        scheduled_str = body.scheduled_at.strftime(" on %d %b %Y at %H:%M UTC")

    await create_notification(
        db,
        app["candidate_id"],
        "Interview scheduled",
        f"Your interview for {job_title}{scheduled_str} is confirmed. Duration: {body.duration_minutes} minutes.",
        "interview",
        f"/interview/live/{str(result.inserted_id)}/lobby",
    )

    created = await db.interview_sessions.find_one({"_id": result.inserted_id})
    return _session_out(created)


@router.get("", response_model=list[LiveInterviewSession], include_in_schema=False)
@router.get("/", response_model=list[LiveInterviewSession])
async def list_live_interviews(current_user=Depends(get_current_user), db=Depends(get_db)):
    user_id = str(current_user["_id"])
    query = {"$or": [{"employer_id": user_id}, {"candidate_id": user_id}]}
    if current_user.get("role") in ("staff", "admin", "superadmin"):
        query = {}
    cursor = db.interview_sessions.find(query).sort("scheduled_at", -1).limit(50)
    return [_session_out(doc) for doc in await cursor.to_list(50)]


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


async def _application_context(db, doc: dict) -> tuple[dict, str]:
    app_id = doc.get("axiom_application_id", "")
    if not ObjectId.is_valid(app_id):
        return {}, ""
    app = await db.axiom_applications.find_one({"_id": ObjectId(app_id)})
    if not app:
        return {}, ""
    job_id = app.get("job_id", "")
    job = await db.axiom_jobs.find_one({"_id": ObjectId(job_id)}) if ObjectId.is_valid(job_id) else None
    cv_data = (app.get("cv_snapshot") or {}).get("data") or app.get("cv_snapshot") or {}
    job_description = (job or {}).get("description", "")
    return cv_data, job_description


@router.post("/{session_id}/next-question", response_model=LiveInterviewSession)
async def next_live_question(session_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.interview_sessions.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    if doc.get("candidate_id") != str(current_user["_id"]) and doc.get("employer_id") != str(current_user["_id"]) and current_user.get("role") not in ("staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Not your interview")
    queue = list(doc.get("question_queue") or [])
    question = queue.pop(0) if queue else ""
    if not question:
        cv_data, job_description = await _application_context(db, doc)
        asked = [item.get("question", "") for item in doc.get("transcript", []) if item.get("question")]
        question = await generate_interview_question(cv_data, job_description, "full", asked, True)
    entry = {"type": "ai_question", "question": question, "created_at": _utcnow()}
    await db.interview_sessions.update_one(
        {"_id": doc["_id"]},
        {"$set": {"question_queue": queue, "current_question": question, "updated_at": _utcnow()}, "$push": {"transcript": entry}},
    )
    updated = await db.interview_sessions.find_one({"_id": doc["_id"]})
    return _session_out(updated)


@router.post("/{session_id}/answer", response_model=LiveInterviewSession)
async def answer_live_question(session_id: str, body: LiveAnswer, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.interview_sessions.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    if doc.get("candidate_id") != str(current_user["_id"]) and current_user.get("role") not in ("staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Candidate only")
    answer = body.answer.strip()
    if not answer:
        raise HTTPException(status_code=400, detail="Answer required")
    question = doc.get("current_question") or body.question_id or "Live interview question"
    cv_data, job_description = await _application_context(db, doc)
    feedback = await evaluate_interview_answer(cv_data, job_description, "full", question, answer, True)
    entry = {"type": "candidate_answer", "question": question, "answer": answer, "feedback": feedback, "created_at": _utcnow()}
    await db.interview_sessions.update_one(
        {"_id": doc["_id"]},
        {"$set": {"current_question": "", "updated_at": _utcnow()}, "$push": {"transcript": entry}},
    )
    updated = await db.interview_sessions.find_one({"_id": doc["_id"]})
    return _session_out(updated)


@router.post("/{session_id}/follow-up", response_model=LiveInterviewSession)
async def add_follow_up(session_id: str, body: LiveFollowUp, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.interview_sessions.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    if doc.get("employer_id") != str(current_user["_id"]) and current_user.get("role") not in ("staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Employer only")
    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question required")
    now = _utcnow()
    entry = {"type": "employer_question", "question": question, "created_at": now}
    await db.interview_sessions.update_one(
        {"_id": doc["_id"]},
        {"$set": {"employer_question": question, "employer_question_updated_at": now, "updated_at": now}, "$push": {"transcript": entry}},
    )
    updated = await db.interview_sessions.find_one({"_id": doc["_id"]})
    return _session_out(updated)


@router.post("/{session_id}/summarize", response_model=LiveInterviewSession)
async def summarize_live_interview(session_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.interview_sessions.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    if doc.get("employer_id") != str(current_user["_id"]) and current_user.get("role") not in ("staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Employer only")
    cv_data, job_description = await _application_context(db, doc)
    summary = await summarize_interview_session(cv_data, job_description, "full", doc.get("transcript", []), True)
    await db.interview_sessions.update_one({"_id": doc["_id"]}, {"$set": {"ai_summary": summary.get("summary", ""), "updated_at": _utcnow()}})
    updated = await db.interview_sessions.find_one({"_id": doc["_id"]})
    return _session_out(updated)


@router.put("/{session_id}/feedback", response_model=LiveInterviewSession)
async def update_live_feedback(session_id: str, body: LiveFeedbackUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.interview_sessions.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    if doc.get("employer_id") != str(current_user["_id"]) and current_user.get("role") not in ("staff", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Employer only")
    updates = {
        "employer_notes": body.notes or "",
        "updated_at": _utcnow(),
    }
    if body.rating:
        updates["employer_rating"] = body.rating
    await db.interview_sessions.update_one({"_id": doc["_id"]}, {"$set": updates})
    updated = await db.interview_sessions.find_one({"_id": doc["_id"]})
    return _session_out(updated)