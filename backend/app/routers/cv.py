from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from app.database import get_db
from app.limiter import limiter
from app.middleware.auth import get_current_user
from app.middleware.validation import valid_object_id
from app.utils.errors import not_found, forbidden, bad_request, too_large, conflict
from app.models.schemas import (
    CVData,
    CVCreate,
    CVUpdate,
    CVHistoryRequest,
    AIPromptRequest,
    AIEditRequest,
    JobMatchRequest,
    CVReviewRequest,
    OptimizeBulletsRequest,
    KeywordGapRequest,
    AIInterviewRequest,
    CVAnalyticsCreate,
    CVAnalyticsEventOut,
    CVAnalyticsOut,
    CVKeywordTrendOut,
    SkillGapRequest,
    SkillGapResponse,
)
from app.services import ai_service
from app.services.ats_service import simulateATS
from datetime import datetime, timezone
from bson import ObjectId
import pdfplumber
import io
import re

# Magic bytes for file type validation
MAGIC_PDF = b"%PDF"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

def _validate_pdf(content: bytes) -> None:
    """Validate PDF by magic bytes and size. Raises HTTPException on failure."""
    if len(content) > MAX_FILE_SIZE:
        raise too_large(f"File too large. Maximum size is {MAX_FILE_SIZE // 1024 // 1024}MB")
    if not content.startswith(MAGIC_PDF):
        raise bad_request("Invalid file type. Only PDF files are accepted")

router = APIRouter()


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_-]+", "-", text)


def serialize_cv(cv: dict) -> dict:
    return {
        "id": str(cv["_id"]),
        "owner_id": cv["owner_id"],
        "owner_username": cv.get("owner_username", ""),
        "title": cv["title"],
        "data": cv["data"],
        "is_public": cv.get("is_public", False),
        "theme": cv.get("theme", "minimal"),
        "page_count": cv.get("page_count", 1),
        "template": cv.get("template", "standard"),
        "slug": cv.get("slug"),
        "created_at": cv["created_at"],
        "updated_at": cv["updated_at"],
    }


def serialize_analytics_event(doc: dict) -> CVAnalyticsEventOut:
    return CVAnalyticsEventOut(
        id=str(doc["_id"]),
        cv_id=doc["cv_id"],
        owner_id=doc["owner_id"],
        ats_score=doc.get("ats_score", 0),
        present_keywords=doc.get("present_keywords", []),
        missing_keywords=doc.get("missing_keywords", []),
        job_description=doc.get("job_description", ""),
        source=doc.get("source", "keyword_gap"),
        created_at=doc["created_at"],
    )


def keyword_trends(events: list[dict], field: str) -> list[CVKeywordTrendOut]:
    trends: dict[str, dict] = {}
    for event in events:
        created_at = event["created_at"]
        values = event.get(field, [])
        for value in values:
            if isinstance(value, str):
                keyword = value.strip()
                priority = "present"
                placement = ""
            else:
                keyword = str(value.get("keyword", "")).strip()
                priority = value.get("priority", "medium")
                placement = value.get("suggested_placement", "")
            if not keyword:
                continue
            key = keyword.lower()
            current = trends.setdefault(
                key,
                {
                    "keyword": keyword,
                    "count": 0,
                    "priority": priority,
                    "suggested_placement": placement,
                    "last_seen_at": created_at,
                },
            )
            current["count"] += 1
            if created_at > current["last_seen_at"]:
                current["keyword"] = keyword
                current["priority"] = priority
                current["suggested_placement"] = placement
                current["last_seen_at"] = created_at
    return [
        CVKeywordTrendOut(**item)
        for item in sorted(
            trends.values(),
            key=lambda item: (item["count"], item["last_seen_at"]),
            reverse=True,
        )
    ]


@router.post("")
async def create_cv(body: CVCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    now = datetime.now(timezone.utc)
    base_slug = slugify(body.title)
    slug = None
    if body.is_public:
        slug = f"{current_user['username']}-{base_slug}"

    cv_doc = {
        "owner_id": str(current_user["_id"]),
        "owner_username": current_user["username"],
        "title": body.title,
        "data": body.data.model_dump(),
        "is_public": body.is_public,
        "theme": body.theme,
        "page_count": body.page_count,
        "template": body.template,
        "slug": slug,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.cvs.insert_one(cv_doc)
    cv_doc["_id"] = result.inserted_id
    return serialize_cv(cv_doc)


@router.get("")
async def list_cvs(current_user=Depends(get_current_user), db=Depends(get_db)):
    cursor = db.cvs.find({"owner_id": str(current_user["_id"])}).sort("updated_at", -1)
    cvs = await cursor.to_list(100)
    return [serialize_cv(c) for c in cvs]


@router.get("/{cv_id}")
async def get_cv(cv_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    from bson import ObjectId
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise not_found("CV")
    if cv["owner_id"] != str(current_user["_id"]) and current_user.get("role") not in ("admin", "superadmin"):
        if not cv.get("is_public"):
            raise forbidden("Access denied")
    return serialize_cv(cv)


@router.put("/{cv_id}")
async def update_cv(body: CVUpdate, cv_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    from bson import ObjectId
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise not_found("CV")
    if cv["owner_id"] != str(current_user["_id"]):
        raise forbidden("Access denied")

    # Save history snapshot before update (keep last 50 versions)
    await db.cv_history.insert_one({
        "cv_id": cv_id,
        "owner_id": str(current_user["_id"]),
        "snapshot": cv["data"],
        "title": cv["title"],
        "saved_at": datetime.now(timezone.utc),
    })
    # Enforce 50 version limit - delete oldest entries beyond limit
    count = await db.cv_history.count_documents({"cv_id": cv_id})
    if count > 50:
        oldest = await db.cv_history.find({"cv_id": cv_id}).sort("saved_at", 1).limit(count - 50).to_list(count - 50)
        if oldest:
            ids = [doc["_id"] for doc in oldest]
            await db.cv_history.delete_many({"_id": {"$in": ids}})

    updates = {"updated_at": datetime.now(timezone.utc)}
    if body.title is not None:
        updates["title"] = body.title
    if body.data is not None:
        updates["data"] = body.data.model_dump()
    if body.is_public is not None:
        updates["is_public"] = body.is_public
        if body.is_public:
            base_slug = slugify(body.title or cv["title"])
            updates["slug"] = f"{current_user['username']}-{base_slug}"
        else:
            updates["slug"] = None
    if body.theme is not None:
        updates["theme"] = body.theme
    if body.page_count is not None:
        updates["page_count"] = body.page_count
    if body.template is not None:
        updates["template"] = body.template    

    await db.cvs.update_one({"_id": ObjectId(cv_id)}, {"$set": updates})
    updated = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    return serialize_cv(updated)


@router.delete("/{cv_id}")
async def delete_cv(cv_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    from bson import ObjectId
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise not_found("CV")
    if cv["owner_id"] != str(current_user["_id"]) and current_user.get("role") not in ("admin", "superadmin"):
        raise forbidden("Access denied")
    await db.cv_history.delete_many({"cv_id": cv_id})
    await db.cv_analytics.delete_many({"cv_id": cv_id})
    await db.cvs.delete_one({"_id": ObjectId(cv_id)})
    return {"message": "CV deleted"}


@router.post("/{cv_id}/duplicate")
async def duplicate_cv(cv_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    from bson import ObjectId
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise not_found("CV")
    if cv["owner_id"] != str(current_user["_id"]):
        raise forbidden("Access denied")
    now = datetime.now(timezone.utc)
    new_doc = {
        "owner_id": str(current_user["_id"]),
        "owner_username": current_user["username"],
        "title": f"{cv['title']} (copy)",
        "data": cv["data"],
        "is_public": False,
        "theme": cv.get("theme", "minimal"),
        "page_count": cv.get("page_count", 1),
        "template": cv.get("template", "standard"), 
        "slug": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.cvs.insert_one(new_doc)
    new_doc["_id"] = result.inserted_id
    return serialize_cv(new_doc)


@router.get("/{cv_id}/history")
async def get_cv_history(cv_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    from bson import ObjectId
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv or cv["owner_id"] != str(current_user["_id"]):
        raise forbidden("Access denied")
    cursor = db.cv_history.find({"cv_id": cv_id}).sort("saved_at", -1).limit(20)
    history = await cursor.to_list(20)
    return [{"id": str(h["_id"]), "title": h.get("title"), "saved_at": h["saved_at"], "snapshot": h["snapshot"]} for h in history]


@router.post("/{cv_id}/history/restore")
async def restore_cv_version(
    body: CVHistoryRequest,
    cv_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Restore CV to a previous version from history."""
    from bson import ObjectId
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv or cv["owner_id"] != str(current_user["_id"]):
        raise forbidden("Access denied")

    # Get the history snapshot
    history_doc = await db.cv_history.find_one({"_id": ObjectId(body.history_id), "cv_id": cv_id})
    if not history_doc:
        raise not_found("History entry")

    snapshot = history_doc.get("snapshot")
    if not snapshot:
        raise bad_request("Invalid history snapshot")

    # Save current state to history before restoring
    await db.cv_history.insert_one({
        "cv_id": cv_id,
        "owner_id": str(current_user["_id"]),
        "snapshot": cv["data"],
        "title": cv["title"],
        "saved_at": datetime.now(timezone.utc),
    })

    # Apply the snapshot
    await db.cvs.update_one(
        {"_id": ObjectId(cv_id)},
        {"$set": {"data": snapshot, "updated_at": datetime.now(timezone.utc)}},
    )

    return {"restored": True, "title": history_doc.get("title")}


@router.get("/{cv_id}/analytics", response_model=CVAnalyticsOut)
async def get_cv_analytics(cv_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    from bson import ObjectId
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv or cv["owner_id"] != str(current_user["_id"]):
        raise forbidden("Access denied")
    events = await db.cv_analytics.find({"cv_id": cv_id, "owner_id": str(current_user["_id"])}).sort("created_at", -1).limit(50).to_list(50)
    return CVAnalyticsOut(
        cv_id=cv_id,
        events=[serialize_analytics_event(event) for event in events],
        missing_keyword_trends=keyword_trends(events, "missing_keywords"),
        present_keyword_trends=keyword_trends(events, "present_keywords"),
    )


@router.post("/{cv_id}/analytics", response_model=CVAnalyticsEventOut)
async def create_cv_analytics_event(body: CVAnalyticsCreate, cv_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    from bson import ObjectId
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv or cv["owner_id"] != str(current_user["_id"]):
        raise forbidden("Access denied")
    now = datetime.now(timezone.utc)
    doc = {
        "cv_id": cv_id,
        "owner_id": str(current_user["_id"]),
        "ats_score": body.ats_score,
        "present_keywords": body.present_keywords,
        "missing_keywords": [item.model_dump() for item in body.missing_keywords],
        "job_description": body.job_description,
        "source": body.source,
        "created_at": now,
    }
    result = await db.cv_analytics.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_analytics_event(doc)


# AI Endpoints

@router.post("/ai/chat")
@limiter.limit("20/minute")
async def ai_chat(request: Request, body: AIPromptRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    response = await ai_service.chat_with_ai(
        body.message,
        cv_data=body.cv_data.model_dump() if body.cv_data else None,
        context=body.context or ""
    )
    await db.ai_events.insert_one({
        "user_id": str(current_user["_id"]),
        "feature": "chat",
        "success": True,
        "tokens_approx": 0,
        "ts": datetime.now(timezone.utc),
    })
    return {"response": response}


@router.post("/ai/generate-summary")
@limiter.limit("20/minute")
async def ai_generate_summary(request: Request, body: AIPromptRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    if not body.cv_data:
        raise bad_request("CV data required")
    summary = await ai_service.generate_summary(body.cv_data.model_dump())
    await db.ai_events.insert_one({
        "user_id": str(current_user["_id"]),
        "feature": "generate_summary",
        "success": True,
        "tokens_approx": 0,
        "ts": datetime.now(timezone.utc),
    })
    return {"summary": summary}


@router.post("/ai/edit")
@limiter.limit("20/minute")
async def ai_edit(request: Request, body: AIEditRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    updated = await ai_service.improve_cv_section(
        body.instruction, body.cv_data.model_dump(), body.section
    )
    await db.ai_events.insert_one({
        "user_id": str(current_user["_id"]),
        "feature": "edit",
        "success": True,
        "tokens_approx": 0,
        "ts": datetime.now(timezone.utc),
    })
    return {"data": updated}


@router.post("/ai/match-job")
@limiter.limit("20/minute")
async def ai_match_job(request: Request, body: JobMatchRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    updated = await ai_service.match_job_description(
        body.cv_data.model_dump(), body.job_description
    )
    await db.ai_events.insert_one({
        "user_id": str(current_user["_id"]),
        "feature": "match_job",
        "success": True,
        "tokens_approx": 0,
        "ts": datetime.now(timezone.utc),
    })
    return {"data": updated}


@router.post("/ai/interview")
@limiter.limit("20/minute")
async def ai_interview(request: Request, body: AIInterviewRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    response = await ai_service.interview_user(
        body.message,
        body.history,
        body.cv_data.model_dump() if body.cv_data else None,
    )
    await db.ai_events.insert_one({
        "user_id": str(current_user["_id"]),
        "feature": "interview",
        "success": True,
        "tokens_approx": 0,
        "ts": datetime.now(timezone.utc),
    })
    return {"response": response}


@router.post("/ai/review")
@limiter.limit("20/minute")
async def ai_review(request: Request, body: CVReviewRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    review = await ai_service.review_cv(
        body.cv_data.model_dump(),
        body.job_description or "",
    )
    await db.ai_events.insert_one({
        "user_id": str(current_user["_id"]),
        "feature": "review",
        "success": True,
        "tokens_approx": 0,
        "ts": datetime.now(timezone.utc),
    })
    return {"review": review}


@router.post("/ai/optimize-bullets")
@limiter.limit("20/minute")
async def ai_optimize_bullets(request: Request, body: OptimizeBulletsRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    updated = await ai_service.optimize_bullets(
        body.cv_data.model_dump(),
        body.experience_index,
    )
    await db.ai_events.insert_one({
        "user_id": str(current_user["_id"]),
        "feature": "optimize_bullets",
        "success": True,
        "tokens_approx": 0,
        "ts": datetime.now(timezone.utc),
    })
    return {"data": updated}


@router.post("/ai/keyword-gap")
@limiter.limit("20/minute")
async def ai_keyword_gap(request: Request, body: KeywordGapRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    analysis = await ai_service.keyword_gap_analysis(
        body.cv_data.model_dump(),
        body.job_description,
    )
    await db.ai_events.insert_one({
        "user_id": str(current_user["_id"]),
        "feature": "keyword_gap",
        "success": True,
        "tokens_approx": 0,
        "ts": datetime.now(timezone.utc),
    })
    return analysis


@router.post("/upload-cv")
async def upload_cv(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    content = await file.read()
    # Validate magic bytes and size
    _validate_pdf(content)
    # Extract text from PDF
    text = ""
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    if not text.strip():
        raise bad_request("Could not extract text from PDF")
    extracted = await ai_service.extract_cv_from_text(text)
    return {"data": extracted}


# Skill Gap Engine

@router.post("/ai/skill-gap", response_model=SkillGapResponse)
@limiter.limit("20/minute")
async def analyze_skill_gaps(request: Request, body: SkillGapRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    analysis = await ai_service.analyze_skill_gaps(
        body.cv_data.model_dump(),
        body.target_role,
    )
    await db.ai_events.insert_one({
        "user_id": str(current_user["_id"]),
        "feature": "skill_gap",
        "success": True,
        "tokens_approx": 0,
        "ts": datetime.now(timezone.utc),
    })
    return SkillGapResponse(**analysis)


# ATS Simulation

from pydantic import BaseModel


class ATSRequest(BaseModel):
    cv_data: dict
    job_description: str | None = None


class ATSFlagOut(BaseModel):
    severity: str
    category: str
    message: str
    details: str | None = None


class ATSResultOut(BaseModel):
    score: int
    flags: list[ATSFlagOut]
    extracted_text: str
    section_headers_found: list[str]
    keyword_matches: list[str]
    keyword_density: dict[str, float]
    missing_keywords: list[str]


@router.post("/ai/ats-preview", response_model=ATSResultOut)
async def ats_preview(request: Request, body: ATSRequest, current_user=Depends(get_current_user)):
    """Simulate ATS parsing of a CV and return compatibility score with flagged issues."""
    # Parse CV data
    cv_data = CVData(**body.cv_data)

    # Run ATS simulation
    result = simulateATS(
        cv_data=cv_data,
        job_description=body.job_description,
    )

    # Convert to output model
    return ATSResultOut(
        score=result.score,
        flags=[
            ATSFlagOut(
                severity=f.severity,
                category=f.category,
                message=f.message,
                details=f.details,
            )
            for f in result.flags
        ],
        extracted_text=result.extracted_text,
        section_headers_found=result.section_headers_found,
        keyword_matches=result.keyword_matches,
        keyword_density=result.keyword_density,
        missing_keywords=result.missing_keywords,
    )
