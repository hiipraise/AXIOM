from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.middleware.auth import get_current_user
from app.utils.errors import not_found, forbidden
from app.models.schemas import CommentCreate, CommentUpdate, CommentOut
from app.services.notification_service import create_notification
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional

router = APIRouter()


def _comment_out(doc: dict) -> CommentOut:
    return CommentOut(
        id=str(doc["_id"]),
        cv_id=doc["cv_id"],
        section=doc["section"],
        field_path=doc.get("field_path", ""),
        user_id=doc["user_id"],
        username=doc.get("username", ""),
        text=doc["text"],
        is_suggestion=bool(doc.get("is_suggestion", False)),
        suggested_value=doc.get("suggested_value"),
        resolved=bool(doc.get("resolved", False)),
        parent_id=doc.get("parent_id"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("/{cv_id}/comments", response_model=CommentOut)
async def create_comment(
    cv_id: str,
    body: CommentCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Add a comment or suggestion to a CV section."""
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid CV ID")

    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise not_found("CV")

    now = datetime.now(timezone.utc)
    doc = {
        "cv_id": cv_id,
        "section": body.section,
        "field_path": body.field_path,
        "user_id": str(current_user["_id"]),
        "username": current_user.get("username", ""),
        "text": body.text.strip(),
        "is_suggestion": body.is_suggestion,
        "suggested_value": body.suggested_value.strip() if body.suggested_value else None,
        "resolved": False,
        "parent_id": body.parent_id,
        "created_at": now,
        "updated_at": now,
    }

    # If it's a reply, validate the parent exists
    if body.parent_id:
        if not ObjectId.is_valid(body.parent_id):
            raise HTTPException(status_code=400, detail="Invalid parent comment ID")
        parent = await db.cv_comments.find_one({"_id": ObjectId(body.parent_id)})
        if not parent:
            raise not_found("Parent comment")

    result = await db.cv_comments.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Notify the CV owner if the commenter isn't the owner
    if str(cv["owner_id"]) != str(current_user["_id"]):
        try:
            username = current_user.get("username", "Someone")
            section_label = body.section.replace("_", " ").title()
            await create_notification(
                db,
                user_id=str(cv["owner_id"]),
                title=f"New comment from {username}",
                body=f"{username} {'suggested' if body.is_suggestion else 'commented'} on your {section_label} section",
                kind="general",
                link=f"/cv/{cv_id.split('/')[-1]}",
            )
        except Exception:
            pass  # Notification failure must not break the comment creation

    return _comment_out(doc)


@router.get("/{cv_id}/comments", response_model=list[CommentOut])
async def list_comments(
    cv_id: str,
    section: Optional[str] = None,
    resolved: Optional[bool] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List comments/suggestions for a CV, optionally filtered by section."""
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid CV ID")

    query: dict = {"cv_id": cv_id}
    if section:
        query["section"] = section
    if resolved is not None:
        query["resolved"] = resolved

    cursor = db.cv_comments.find(query).sort("created_at", 1)
    docs = await cursor.to_list(200)
    return [_comment_out(doc) for doc in docs]


@router.put("/{cv_id}/comments/{comment_id}", response_model=CommentOut)
async def update_comment(
    cv_id: str,
    comment_id: str,
    body: CommentUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update a comment's text or resolution status."""
    if not ObjectId.is_valid(cv_id) or not ObjectId.is_valid(comment_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    doc = await db.cv_comments.find_one({"_id": ObjectId(comment_id), "cv_id": cv_id})
    if not doc:
        raise not_found("Comment")

    if str(doc["user_id"]) != str(current_user["_id"]) and current_user.get("role") not in ("staff", "admin", "superadmin"):
        raise forbidden("Cannot edit another user's comment")

    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if body.text is not None:
        updates["text"] = body.text.strip()
    if body.resolved is not None:
        updates["resolved"] = body.resolved

    await db.cv_comments.update_one({"_id": ObjectId(comment_id)}, {"$set": updates})
    updated = await db.cv_comments.find_one({"_id": ObjectId(comment_id)})
    return _comment_out(updated)


@router.delete("/{cv_id}/comments/{comment_id}")
async def delete_comment(
    cv_id: str,
    comment_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a comment. Only the comment author or admin can delete."""
    if not ObjectId.is_valid(cv_id) or not ObjectId.is_valid(comment_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    doc = await db.cv_comments.find_one({"_id": ObjectId(comment_id), "cv_id": cv_id})
    if not doc:
        raise not_found("Comment")

    if str(doc["user_id"]) != str(current_user["_id"]) and current_user.get("role") not in ("staff", "admin", "superadmin"):
        raise forbidden("Cannot delete another user's comment")

    # Delete the comment and any replies
    await db.cv_comments.delete_many({
        "$or": [
            {"_id": ObjectId(comment_id)},
            {"parent_id": comment_id},
        ]
    })
    return {"message": "Comment deleted"}


@router.get("/{cv_id}/comments/count")
async def comment_counts(
    cv_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Return comment counts per section for badge display."""
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid CV ID")

    pipeline = [
        {"$match": {"cv_id": cv_id}},
        {"$group": {
            "_id": {"section": "$section", "resolved": "$resolved"},
            "count": {"$sum": 1},
        }},
    ]
    results = await db.cv_comments.aggregate(pipeline).to_list(50)

    # Transform to per-section counts
    sections: dict[str, dict[str, int]] = {}
    for r in results:
        section = r["_id"]["section"]
        resolved = r["_id"]["resolved"]
        count = r["count"]
        if section not in sections:
            sections[section] = {"total": 0, "open": 0, "suggestions": 0}
        sections[section]["total"] += count
        if not resolved:
            sections[section]["open"] += count

    # Also count suggestions
    suggestion_pipeline = [
        {"$match": {"cv_id": cv_id, "is_suggestion": True}},
        {"$group": {"_id": "$section", "count": {"$sum": 1}}},
    ]
    sug_results = await db.cv_comments.aggregate(suggestion_pipeline).to_list(50)
    for r in sug_results:
        section = r["_id"]
        if section in sections:
            sections[section]["suggestions"] = r["count"]

    return {
        "total": sum(s["total"] for s in sections.values()),
        "open": sum(s["open"] for s in sections.values()),
        "sections": sections,
    }
