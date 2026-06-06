from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.schemas import (
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewFeedback,
    InterviewMessageOut,
    InterviewMode,
    InterviewSessionDetail,
    InterviewSessionListItem,
    InterviewStartRequest,
    InterviewStartResponse,
)
from app.services import ai_service

router = APIRouter()

QUESTION_TARGETS = {
    InterviewMode.behavioural: 5,
    InterviewMode.technical: 6,
    InterviewMode.full: 7,
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(id_value: str) -> ObjectId:
    if not ObjectId.is_valid(id_value):
        raise HTTPException(status_code=400, detail="Invalid id")
    return ObjectId(id_value)


def _session_item(doc: dict) -> InterviewSessionListItem:
    return InterviewSessionListItem(
        id=str(doc["_id"]),
        cv_id=doc["cv_id"],
        job_id=doc.get("job_id"),
        job_title=doc.get("job_title", ""),
        company=doc.get("company", ""),
        mode=InterviewMode(doc.get("mode", "behavioural")),
        status=doc.get("status", "active"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        question_count=int(doc.get("question_count", 0) or 0),
        answered_count=int(doc.get("answered_count", 0) or 0),
        overall_score=(doc.get("summary") or {}).get("overall_score"),
    )


def _message_out(doc: dict) -> InterviewMessageOut:
    return InterviewMessageOut(
        id=str(doc["_id"]),
        session_id=doc["session_id"],
        question=doc.get("question", ""),
        answer=doc.get("answer", ""),
        feedback=InterviewFeedback.model_validate(doc["feedback"]) if doc.get("feedback") else None,
        created_at=doc["created_at"],
        answered_at=doc.get("answered_at"),
    )


async def _load_cv(db, cv_id: str, user_id: str) -> dict:
    cv = await db.cvs.find_one({"_id": _oid(cv_id), "owner_id": user_id})
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    return cv


async def _load_job_context(db, user_id: str, job_id: str | None) -> dict:
    if not job_id:
        return {}
    application = await db.applications.find_one({"user_id": user_id, "job_id": job_id})
    if application and application.get("job"):
        return application["job"]
    saved = await db.saved_jobs.find_one({"user_id": user_id, "job_id": job_id})
    if saved and saved.get("job"):
        return saved["job"]
    cached = await db.job_cache.find_one({"job_id": job_id})
    return cached.get("payload", {}) if cached else {}


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(body: InterviewStartRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    user_id = str(current_user["_id"])
    cv = await _load_cv(db, body.cv_id, user_id)
    job = await _load_job_context(db, user_id, body.job_id)
    job_description = (body.job_description or job.get("description") or cv.get("data", {}).get("job_description") or "").strip()
    if not job_description:
        raise HTTPException(status_code=400, detail="Provide a job_id with a description or paste a job_description")

    now = _utcnow()
    session_doc = {
        "user_id": user_id,
        "cv_id": body.cv_id,
        "job_id": body.job_id,
        "job_title": job.get("title", cv.get("data", {}).get("target_role", "")),
        "company": job.get("company", ""),
        "job_description": job_description,
        "cv_data": cv.get("data", {}),
        "mode": body.mode.value,
        "use_star": body.use_star,
        "status": "active",
        "question_count": 0,
        "answered_count": 0,
        "target_questions": QUESTION_TARGETS[body.mode],
        "summary": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.interview_sessions.insert_one(session_doc)
    session_id = str(result.inserted_id)
    first_question = await ai_service.generate_interview_question(
        cv.get("data", {}),
        job_description,
        body.mode.value,
        [],
        body.use_star,
    )
    await db.interview_messages.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "question": first_question,
        "answer": "",
        "feedback": None,
        "created_at": now,
        "answered_at": None,
    })
    await db.interview_sessions.update_one(
        {"_id": result.inserted_id},
        {"$set": {"question_count": 1, "updated_at": _utcnow()}},
    )
    return InterviewStartResponse(session_id=session_id, first_question=first_question)


@router.post("/answer", response_model=InterviewAnswerResponse)
async def answer_interview(body: InterviewAnswerRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    user_id = str(current_user["_id"])
    session = await db.interview_sessions.find_one({"_id": _oid(body.session_id), "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Interview session is already completed")

    pending = await db.interview_messages.find_one(
        {"session_id": body.session_id, "user_id": user_id, "answer": ""},
        sort=[("created_at", -1)],
    )
    if not pending:
        raise HTTPException(status_code=400, detail="No pending interview question")

    feedback_data = await ai_service.evaluate_interview_answer(
        session.get("cv_data", {}),
        session.get("job_description", ""),
        session.get("mode", "behavioural"),
        pending.get("question", ""),
        body.answer,
        bool(session.get("use_star", True)),
    )
    feedback = InterviewFeedback.model_validate(feedback_data)
    now = _utcnow()
    await db.interview_messages.update_one(
        {"_id": pending["_id"]},
        {"$set": {"answer": body.answer, "feedback": feedback.model_dump(), "answered_at": now}},
    )

    answered_count = int(session.get("answered_count", 0) or 0) + 1
    target_questions = int(session.get("target_questions", 5) or 5)
    done = answered_count >= target_questions
    next_question = None
    update_doc = {"answered_count": answered_count, "updated_at": now}

    if done:
        cursor = db.interview_messages.find({"session_id": body.session_id}).sort("created_at", 1)
        messages = await cursor.to_list(100)
        transcript = [
            {"question": msg.get("question", ""), "answer": msg.get("answer", ""), "feedback": msg.get("feedback")}
            for msg in messages
        ]
        summary = await ai_service.summarize_interview_session(
            session.get("cv_data", {}),
            session.get("job_description", ""),
            session.get("mode", "behavioural"),
            transcript,
            bool(session.get("use_star", True)),
        )
        update_doc.update({"status": "completed", "summary": summary})
    else:
        cursor = db.interview_messages.find({"session_id": body.session_id}).sort("created_at", 1)
        asked = [msg.get("question", "") for msg in await cursor.to_list(100)]
        next_question = await ai_service.generate_interview_question(
            session.get("cv_data", {}),
            session.get("job_description", ""),
            session.get("mode", "behavioural"),
            asked,
            bool(session.get("use_star", True)),
        )
        await db.interview_messages.insert_one({
            "session_id": body.session_id,
            "user_id": user_id,
            "question": next_question,
            "answer": "",
            "feedback": None,
            "created_at": now,
            "answered_at": None,
        })
        update_doc["question_count"] = int(session.get("question_count", 1) or 1) + 1

    await db.interview_sessions.update_one({"_id": session["_id"]}, {"$set": update_doc})
    return InterviewAnswerResponse(feedback=feedback, next_question=next_question, done=done)


@router.get("/sessions", response_model=list[InterviewSessionListItem])
async def list_interview_sessions(current_user=Depends(get_current_user), db=Depends(get_db)):
    cursor = db.interview_sessions.find({"user_id": str(current_user["_id"])}).sort("updated_at", -1)
    sessions = await cursor.to_list(100)
    return [_session_item(session) for session in sessions]


@router.get("/sessions/{session_id}", response_model=InterviewSessionDetail)
async def get_interview_session(session_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    session = await db.interview_sessions.find_one({"_id": _oid(session_id), "user_id": str(current_user["_id"])})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    cursor = db.interview_messages.find({"session_id": session_id}).sort("created_at", 1)
    messages = [_message_out(msg) for msg in await cursor.to_list(100)]
    item = _session_item(session).model_dump()
    return InterviewSessionDetail(
        **item,
        job_description=session.get("job_description", ""),
        summary=session.get("summary"),
        messages=messages,
    )
