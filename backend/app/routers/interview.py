from __future__ import annotations

from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
import os
import aiofiles
import glob

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
    ReviewCardCreate,
    ReviewCardRating,
    ReviewCardOut,
    ReviewCardDifficulty,
    DifficultyAdjustRequest,
    DifficultyAdjustResponse,
)
from app.services import ai_service
from app.config import settings

router = APIRouter()

QUESTION_TARGETS = {
    InterviewMode.behavioural: 5,
    InterviewMode.technical: 6,
    InterviewMode.full: 7,
}

# Session expires after 24 hours of inactivity
SESSION_TTL_HOURS = 24


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
        share_token=doc.get("share_token"),
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
    saved = await db.saved_jobs.find_one({"user_id": user_id, "job_id": job_id})
    if saved and saved.get("job"):
        return saved["job"]
    cached = await db.job_cache.find_one({"job_id": job_id})
    return cached.get("payload", {}) if cached else {}


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(body: InterviewStartRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    user_id = str(current_user["_id"])

    # Check for existing active or paused session with same cv_id + job_id combo
    existing = await db.interview_sessions.find_one({
        "user_id": user_id,
        "cv_id": body.cv_id,
        "job_id": body.job_id,
        "status": {"$in": ["active", "paused"]},
    })
    if existing:
        if not body.force:
            raise HTTPException(
                status_code=409,
                detail="An interview session already exists for this CV and job. Resume it or start a new one.",
                headers={"X-Existing-Session-Id": str(existing["_id"])},
            )
        # force=True: abandon the old session
        await db.interview_sessions.update_one(
            {"_id": existing["_id"]},
            {"$set": {"status": "abandoned", "updated_at": _utcnow()}},
        )

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
        "expires_at": now + timedelta(hours=SESSION_TTL_HOURS),
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
    # Check if session has expired
    if session.get("expires_at") and session["expires_at"] < _utcnow():
        raise HTTPException(status_code=410, detail="Interview session expired")
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
async def list_interview_sessions(
    status: str = "",
    limit: int = 50,
    skip: int = 0,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List interview sessions for the current user.

    - status: optional filter ('active', 'paused', 'completed', 'abandoned')
      Default returns all sessions.
    - limit/skip: pagination
    """
    query: dict = {"user_id": str(current_user["_id"])}
    if status:
        query["status"] = status

    cursor = (
        db.interview_sessions.find(query)
        .sort("updated_at", -1)
        .skip(skip)
        .limit(limit)
    )
    sessions = await cursor.to_list(limit)
    return [_session_item(session) for session in sessions]


@router.post("/sessions/{session_id}/pause")
async def pause_interview_session(
    session_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Pause an interview session and save progress."""
    user_id = str(current_user["_id"])
    session = await db.interview_sessions.find_one({"_id": _oid(session_id), "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot pause a completed session")
    if session.get("expires_at") and session["expires_at"] < _utcnow():
        raise HTTPException(status_code=410, detail="Interview session expired")

    await db.interview_sessions.update_one(
        {"_id": session["_id"]},
        {"$set": {"status": "paused", "updated_at": _utcnow()}},
    )
    return {"message": "Session paused", "session_id": session_id}


@router.get("/sessions/{session_id}", response_model=InterviewSessionDetail)
async def get_interview_session(session_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    session = await db.interview_sessions.find_one({"_id": _oid(session_id), "user_id": str(current_user["_id"])})
    # Check if session has expired
    if session and session.get("expires_at"):
        if session["expires_at"] < _utcnow():
            raise HTTPException(status_code=410, detail="Interview session expired")
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


# Video recording upload
@router.post("/upload-recording/{session_id}")
async def upload_recording(
    session_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Upload a video recording for an interview session."""
    user_id = str(current_user["_id"])
    # Verify session belongs to user
    session = await db.interview_sessions.find_one({"_id": _oid(session_id), "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    # Create media directory
    media_dir = os.path.join(settings.media_dir, "interviews", user_id)
    os.makedirs(media_dir, exist_ok=True)

    # Cap recordings: keep max 5 per session, delete oldest files
    existing_for_session = await db.interview_recordings.find(
        {"session_id": session_id, "user_id": user_id}
    ).sort("created_at", -1).to_list(100)
    if len(existing_for_session) >= 5:
        # Delete the oldest recordings beyond the limit
        to_delete = existing_for_session[4:]
        for rec in to_delete:
            try:
                old_path = rec.get("file_path")
                if old_path and os.path.exists(old_path):
                    os.remove(old_path)
            except OSError:
                pass
        old_ids = [rec["_id"] for rec in to_delete]
        await db.interview_recordings.delete_many({"_id": {"$in": old_ids}})

    # Save file
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "webm"
    file_name = f"{session_id}_{ObjectId()}.{file_ext}"
    file_path = os.path.join(media_dir, file_name)

    content = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Store reference in database
    await db.interview_recordings.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "file_name": file_name,
        "file_path": file_path,
        "content_type": file.content_type or "video/webm",
        "size": len(content),
        "created_at": datetime.now(timezone.utc),
    })

    return {"recording_id": file_name, "url": f"/api/v1/interview/recordings/{file_name}"}


@router.get("/recordings/{file_name}")
async def get_recording(file_name: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Stream a video recording."""
    # Find the recording
    recording = await db.interview_recordings.find_one({
        "file_name": file_name,
        "user_id": str(current_user["_id"]),
    })
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    file_path = recording["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Recording file not found")

    return FileResponse(
        file_path,
        media_type=recording.get("content_type", "video/webm"),
        headers={"Accept-Ranges": "bytes"},
    )


# ─── Spaced-repetition review cards ───────────────────────────────────────────

@router.post("/review/generate")
async def generate_review_cards(
    session_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Generate review cards from a completed interview session."""
    user_id = str(current_user["_id"])
    session = await db.interview_sessions.find_one({"_id": _oid(session_id), "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    cursor = db.interview_messages.find({"session_id": session_id}).sort("created_at", 1)
    messages = await cursor.to_list(100)
    transcript = [
        {"question": msg.get("question", ""), "answer": msg.get("answer", ""), "feedback": msg.get("feedback")}
        for msg in messages if msg.get("answer")
    ]
    if not transcript:
        raise HTTPException(status_code=400, detail="No answered questions to generate cards from")

    cards = await ai_service.generate_review_questions(transcript)
    now = _utcnow()
    created = []
    for card in cards:
        doc = {
            "user_id": user_id,
            "session_id": session_id,
            "question": card.get("question", ""),
            "answer": "",
            "topic": card.get("topic", "general"),
            "difficulty": card.get("difficulty", "medium"),
            "last_reviewed": None,
            "review_count": 0,
            "next_review_at": now,
            "created_at": now,
        }
        result = await db.review_cards.insert_one(doc)
        doc.pop("_id", None)
        doc["id"] = str(result.inserted_id)
        created.append(doc)

    return {"cards": created, "count": len(created)}


@router.get("/review/cards")
async def list_review_cards(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get all review cards due for review (next_review_at <= now)."""
    user_id = str(current_user["_id"])
    now = _utcnow()
    cursor = db.review_cards.find({"user_id": user_id, "next_review_at": {"$lte": now}}).sort("next_review_at", 1).limit(20)
    cards = await cursor.to_list(20)
    return [
        {
            "id": str(c["_id"]),
            "user_id": c["user_id"],
            "session_id": c["session_id"],
            "question": c["question"],
            "answer": c.get("answer", ""),
            "topic": c.get("topic", "general"),
            "difficulty": c.get("difficulty", "medium"),
            "last_reviewed": c.get("last_reviewed"),
            "review_count": c.get("review_count", 0),
            "next_review_at": c.get("next_review_at"),
            "created_at": c["created_at"],
        }
        for c in cards
    ]


@router.post("/review/rate")
async def rate_review_card(
    body: ReviewCardRating,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Rate a review card (easy/medium/hard) to adjust its next review interval."""
    user_id = str(current_user["_id"])
    card = await db.review_cards.find_one({"_id": _oid(body.card_id), "user_id": user_id})
    if not card:
        raise HTTPException(status_code=404, detail="Review card not found")

    now = _utcnow()
    review_count = int(card.get("review_count", 0) or 0) + 1

    # Spaced repetition intervals: easy=7d, medium=3d, hard=1d
    interval_hours = {
        "easy": 168,
        "medium": 72,
        "hard": 24,
    }
    hours = interval_hours.get(body.rating.value, 72)
    next_review = now + timedelta(hours=hours)

    await db.review_cards.update_one(
        {"_id": card["_id"]},
        {"$set": {
            "difficulty": body.rating.value,
            "last_reviewed": now,
            "next_review_at": next_review,
            "review_count": review_count,
        }},
    )
    return {"ok": True, "next_review_at": next_review, "review_count": review_count}


@router.get("/review/stats")
async def review_card_stats(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get review card statistics."""
    user_id = str(current_user["_id"])
    now = _utcnow()
    total = await db.review_cards.count_documents({"user_id": user_id})
    due = await db.review_cards.count_documents({"user_id": user_id, "next_review_at": {"$lte": now}})
    completed = await db.review_cards.count_documents({"user_id": user_id, "review_count": {"$gte": 1}})
    return {"total": total, "due": due, "completed": completed}


@router.get("/review/cards/all")
async def list_all_review_cards(
    topic: str = "",
    status: str = "",
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get ALL review cards (not just due) with optional topic and status filters.
    
    - topic: filter by topic (partial match, case-insensitive)
    - status: 'due' (next_review_at <= now), 'upcoming' (next_review_at > now), 'reviewed' (last_reviewed is not None)
    """
    user_id = str(current_user["_id"])
    now = _utcnow()
    query: dict = {"user_id": user_id}

    if topic:
        query["topic"] = {"$regex": topic, "$options": "i"}
    if status == "due":
        query["next_review_at"] = {"$lte": now}
    elif status == "upcoming":
        query["next_review_at"] = {"$gt": now}
    elif status == "reviewed":
        query["last_reviewed"] = {"$ne": None}

    cursor = db.review_cards.find(query).sort("created_at", -1).limit(100)
    cards = await cursor.to_list(100)
    return [
        {
            "id": str(c["_id"]),
            "user_id": c["user_id"],
            "session_id": c["session_id"],
            "question": c["question"],
            "answer": c.get("answer", ""),
            "topic": c.get("topic", "general"),
            "difficulty": c.get("difficulty", "medium"),
            "last_reviewed": c.get("last_reviewed"),
            "review_count": c.get("review_count", 0),
            "next_review_at": c.get("next_review_at"),
            "created_at": c["created_at"],
        }
        for c in cards
    ]


# ─── Topic heatmap ────────────────────────────────────────────────────────────

@router.get("/topics")
async def get_interview_topics(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get topic breakdown across all completed sessions for the heatmap."""
    user_id = str(current_user["_id"])
    cursor = db.interview_sessions.find({"user_id": user_id, "status": "completed"}).sort("created_at", -1).limit(10)
    sessions = await cursor.to_list(10)

    if not sessions:
        return {"topics": [], "total_sessions": 0}

    # Build simple stat-based topics from session data
    # Each scores entry is now (score, timestamp) for trend computation
    topics_map: dict[str, dict] = {}
    for session in sessions:
        summary = session.get("summary") or {}
        overall = summary.get("overall_score", 0) or 0
        session_ts = session.get("created_at", _utcnow())
        messages_cursor = db.interview_messages.find({"session_id": str(session["_id"])}).sort("created_at", 1)
        messages = await messages_cursor.to_list(100)

        mode = session.get("mode", "behavioural")
        mode_topic = topics_map.setdefault(mode, {"count": 0, "scores": []})
        mode_topic["count"] += len(messages)
        if overall and isinstance(overall, (int, float)):
            mode_topic["scores"].append((overall, session_ts))

        for msg in messages:
            fb = msg.get("feedback") or {}
            question = msg.get("question", "")
            # Assign a topic keyword based on question content
            topic_label = "general"
            q_lower = question.lower()
            if any(w in q_lower for w in ["team", "conflict", "lead", "collaborat", "stakeholder"]):
                topic_label = "teamwork & leadership"
            elif any(w in q_lower for w in ["system", "architect", "design", "scale", "perform"]):
                topic_label = "system design"
            elif any(w in q_lower for w in ["metric", "data", "analys", "kpi", "result"]):
                topic_label = "data & metrics"
            elif any(w in q_lower for w in ["motivat", "challeng", "fail", "mistake", "growth"]):
                topic_label = "growth & motivation"
            elif any(w in q_lower for w in ["skill", "tool", "technolog", "stack", "code"]):
                topic_label = "technical skills"
            elif any(w in q_lower for w in ["project", "deploy", "launch", "ship"]):
                topic_label = "project delivery"

            entry = topics_map.setdefault(topic_label, {"count": 0, "scores": []})
            entry["count"] += 1
            score = (fb.get("overall_score") or 0) if fb else 0
            if score:
                entry["scores"].append((score, msg.get("created_at", session_ts)))

    def _compute_trend(scores_with_ts: list[tuple]) -> str:
        """Compare first vs second half of chronologically sorted scores."""
        if len(scores_with_ts) < 3:
            return "stable"
        sorted_scores = [s for s, _ in sorted(scores_with_ts, key=lambda x: x[1])]
        mid = len(sorted_scores) // 2
        first_half = sorted_scores[:mid]
        second_half = sorted_scores[mid:]
        avg_first = sum(first_half) / len(first_half)
        avg_second = sum(second_half) / len(second_half)
        diff = avg_second - avg_first
        if diff >= 8:
            return "improving"
        elif diff <= -8:
            return "declining"
        return "stable"

    topics = []
    for name, data in topics_map.items():
        scores_only = [s for s, _ in data["scores"]]
        avg = round(sum(scores_only) / len(scores_only), 1) if scores_only else None
        trend = _compute_trend(data["scores"])
        topics.append({
            "name": name,
            "count": data["count"],
            "avg_score": avg,
            "trend": trend,
        })

    topics.sort(key=lambda t: t["count"], reverse=True)
    return {"topics": topics, "total_sessions": len(sessions)}


# ─── Share results ──────────────────────────────────────────────────────────────

import secrets


@router.post("/sessions/{session_id}/share")
async def create_share_token(
    session_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Generate a share token for a completed interview session."""
    user_id = str(current_user["_id"])
    session = await db.interview_sessions.find_one({"_id": _oid(session_id), "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Only completed sessions can be shared")

    # Reuse existing share token if one exists
    existing_token = session.get("share_token")
    if existing_token:
        return {"share_token": existing_token, "share_url": f"{settings.frontend_url}/interview/shared/{existing_token}"}

    share_token = secrets.token_urlsafe(16)
    await db.interview_sessions.update_one(
        {"_id": session["_id"]},
        {"$set": {"share_token": share_token, "updated_at": _utcnow()}},
    )

    # Load messages for the share payload
    cursor = db.interview_messages.find({"session_id": session_id}).sort("created_at", 1)
    messages = [_message_out(msg) for msg in await cursor.to_list(100)]

    # Cache the share snapshot for public access
    await db.interview_share_cache.update_one(
        {"share_token": share_token},
        {"$set": {
            "share_token": share_token,
            "session_id": session_id,
            "user_id": user_id,
            "username": current_user.get("username", ""),
            "job_title": session.get("job_title", ""),
            "company": session.get("company", ""),
            "mode": session.get("mode", "behavioural"),
            "overall_score": (session.get("summary") or {}).get("overall_score"),
            "summary": session.get("summary"),
            "question_count": int(session.get("question_count", 0)),
            "answered_count": int(session.get("answered_count", 0)),
            "messages": [m.model_dump() for m in messages],
            "created_at": _utcnow(),
        }},
        upsert=True,
    )

    return {
        "share_token": share_token,
        "share_url": f"{settings.frontend_url}/interview/shared/{share_token}",
    }


@router.get("/shared/{share_token}")
async def get_shared_session(share_token: str, db=Depends(get_db)):
    """Public endpoint — get shared interview session data (no auth required)."""
    cached = await db.interview_share_cache.find_one({"share_token": share_token})
    if not cached:
        # Fallback: check if token exists on a session
        session = await db.interview_sessions.find_one({"share_token": share_token})
        if not session:
            raise HTTPException(status_code=404, detail="Shared interview not found")

        cursor = db.interview_messages.find({"session_id": str(session["_id"])}).sort("created_at", 1)
        messages = [_message_out(msg) for msg in await cursor.to_list(100)]
        return {
            "username": "",
            "job_title": session.get("job_title", ""),
            "company": session.get("company", ""),
            "mode": session.get("mode", "behavioural"),
            "overall_score": (session.get("summary") or {}).get("overall_score"),
            "summary": session.get("summary"),
            "question_count": int(session.get("question_count", 0)),
            "answered_count": int(session.get("answered_count", 0)),
            "messages": [m.model_dump() for m in messages],
        }

    return {
        "username": cached.get("username", ""),
        "job_title": cached.get("job_title", ""),
        "company": cached.get("company", ""),
        "mode": cached.get("mode", "behavioural"),
        "overall_score": cached.get("overall_score"),
        "summary": cached.get("summary"),
        "question_count": cached.get("question_count", 0),
        "answered_count": cached.get("answered_count", 0),
        "messages": cached.get("messages", []),
    }


@router.delete("/shared/{share_token}")
async def revoke_share_token(
    share_token: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Revoke a share token."""
    user_id = str(current_user["_id"])
    session = await db.interview_sessions.find_one({"share_token": share_token, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Shared session not found")

    await db.interview_sessions.update_one(
        {"_id": session["_id"]},
        {"$unset": {"share_token": ""}, "$set": {"updated_at": _utcnow()}},
    )
    await db.interview_share_cache.delete_many({"share_token": share_token})
    return {"message": "Share link revoked"}


# ─── Difficulty scaling ───────────────────────────────────────────────────────

@router.get("/difficulty")
async def get_difficulty(
    mode: str = "behavioural",
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get recommended difficulty level based on past performance."""
    user_id = str(current_user["_id"])
    cursor = db.interview_sessions.find({"user_id": user_id, "status": "completed"}).sort("created_at", -1).limit(5)
    sessions = await cursor.to_list(5)

    recent_scores = []
    for session in sessions:
        summary = session.get("summary") or {}
        score = summary.get("overall_score") or 0
        if score:
            recent_scores.append(int(score))

    result = await ai_service.adjust_interview_difficulty(recent_scores, mode)
    return DifficultyAdjustResponse(**result)
