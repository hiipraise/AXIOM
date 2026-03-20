from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.schemas import CVCreate, CVUpdate, AIPromptRequest, AIEditRequest, JobMatchRequest, CVRating
from app.services import ai_service
from datetime import datetime, timezone
from bson import ObjectId
import pdfplumber
import io
import re

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
        "rating": cv.get("rating"),
    }


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
        "rating": None,
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
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise HTTPException(404, "CV not found")
    if cv["owner_id"] != str(current_user["_id"]) and current_user.get("role") not in ("admin", "superadmin"):
        if not cv.get("is_public"):
            raise HTTPException(403, "Access denied")
    return serialize_cv(cv)


@router.put("/{cv_id}")
async def update_cv(cv_id: str, body: CVUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise HTTPException(404, "CV not found")
    if cv["owner_id"] != str(current_user["_id"]):
        raise HTTPException(403, "Access denied")

    # Save history snapshot before update
    await db.cv_history.insert_one({
        "cv_id": cv_id,
        "owner_id": str(current_user["_id"]),
        "snapshot": cv["data"],
        "title": cv["title"],
        "saved_at": datetime.now(timezone.utc),
    })

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
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise HTTPException(404, "CV not found")
    if cv["owner_id"] != str(current_user["_id"]) and current_user.get("role") not in ("admin", "superadmin"):
        raise HTTPException(403, "Access denied")
    await db.cv_history.delete_many({"cv_id": cv_id})
    await db.cvs.delete_one({"_id": ObjectId(cv_id)})
    return {"message": "CV deleted"}


@router.post("/{cv_id}/duplicate")
async def duplicate_cv(cv_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise HTTPException(404, "CV not found")
    if cv["owner_id"] != str(current_user["_id"]):
        raise HTTPException(403, "Access denied")
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
        "rating": None,
    }
    result = await db.cvs.insert_one(new_doc)
    new_doc["_id"] = result.inserted_id
    return serialize_cv(new_doc)


@router.get("/{cv_id}/history")
async def get_cv_history(cv_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv or cv["owner_id"] != str(current_user["_id"]):
        raise HTTPException(403, "Access denied")
    cursor = db.cv_history.find({"cv_id": cv_id}).sort("saved_at", -1).limit(20)
    history = await cursor.to_list(20)
    return [{"id": str(h["_id"]), "title": h.get("title"), "saved_at": h["saved_at"], "snapshot": h["snapshot"]} for h in history]


# AI Endpoints

@router.post("/ai/chat")
async def ai_chat(body: AIPromptRequest, current_user=Depends(get_current_user)):
    response = await ai_service.chat_with_ai(
        body.message,
        cv_data=body.cv_data.model_dump() if body.cv_data else None,
        context=body.context or ""
    )
    return {"response": response}


@router.post("/ai/generate-summary")
async def ai_generate_summary(body: AIPromptRequest, current_user=Depends(get_current_user)):
    if not body.cv_data:
        raise HTTPException(400, "CV data required")
    summary = await ai_service.generate_summary(body.cv_data.model_dump())
    return {"summary": summary}


@router.post("/ai/edit")
async def ai_edit(body: AIEditRequest, current_user=Depends(get_current_user)):
    updated = await ai_service.improve_cv_section(
        body.instruction, body.cv_data.model_dump(), body.section
    )
    return {"data": updated}


@router.post("/ai/match-job")
async def ai_match_job(body: JobMatchRequest, current_user=Depends(get_current_user)):
    updated = await ai_service.match_job_description(
        body.cv_data.model_dump(), body.job_description
    )
    return {"data": updated}


@router.post("/ai/interview")
async def ai_interview(body: dict, current_user=Depends(get_current_user)):
    message = body.get("message", "")
    history = body.get("history", [])
    response = await ai_service.interview_user(message, history)
    return {"response": response}


@router.post("/upload-cv")
async def upload_cv(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")
    content = await file.read()
    text = ""
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    if not text.strip():
        raise HTTPException(400, "Could not extract text from PDF")
    extracted = await ai_service.extract_cv_from_text(text)
    return {"data": extracted}


@router.post("/{cv_id}/rate")
async def rate_cv(cv_id: str, body: CVRating, current_user=Depends(get_current_user), db=Depends(get_db)):
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv or cv["owner_id"] != str(current_user["_id"]):
        raise HTTPException(403, "Access denied")
    rating_doc = {
        "cv_id": cv_id,
        "owner_id": str(current_user["_id"]),
        "score": body.score,
        "comment": body.comment,
        "created_at": datetime.now(timezone.utc),
    }
    await db.ratings.insert_one(rating_doc)
    await db.cvs.update_one({"_id": ObjectId(cv_id)}, {"$set": {"rating": body.score}})
    return {"message": "Rating saved"}
