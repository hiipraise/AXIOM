from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db

router = APIRouter()


@router.get("/feed")
async def get_public_feed(skip: int = 0, limit: int = 20, db=Depends(get_db)):
    """Paginated feed of all public CVs — no auth required."""
    # Clamp limit to prevent abuse
    limit = min(limit, 50)

    cursor = db.cvs.find({"is_public": True}).sort("updated_at", -1).skip(skip).limit(limit)
    cvs = await cursor.to_list(limit)
    total = await db.cvs.count_documents({"is_public": True})

    return {
        "cvs": [
            {
                "id": str(c["_id"]),
                "owner_username": c["owner_username"],
                "title": c["title"],
                "slug": c.get("slug"),
                "theme": c.get("theme", "minimal"),
                "updated_at": c["updated_at"],
                "personal_info": {
                    "full_name":  c["data"].get("personal_info", {}).get("full_name", ""),
                    "job_title":  c["data"].get("personal_info", {}).get("job_title", ""),
                    "location":   c["data"].get("personal_info", {}).get("location", ""),
                },
                "summary": (c["data"].get("summary", "") or "")[:200],
                "skills":  c["data"].get("skills", [])[:8],
            }
            for c in cvs
        ],
        "total": total,
    }


@router.get("/cv/{username}/{slug}")
async def get_public_cv(username: str, slug: str, db=Depends(get_db)):
    cv = await db.cvs.find_one({"owner_username": username, "slug": slug, "is_public": True})
    if not cv:
        raise HTTPException(404, "CV not found or not public")
    return {
        "id": str(cv["_id"]),
        "owner_username": cv["owner_username"],
        "title": cv["title"],
        "data": cv["data"],
        "theme": cv.get("theme", "minimal"),
        "page_count": cv.get("page_count", 1),
        "updated_at": cv["updated_at"],
    }


@router.get("/profile/{username}")
async def get_public_profile(username: str, db=Depends(get_db)):
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(404, "User not found")
    cursor = db.cvs.find({"owner_id": str(user["_id"]), "is_public": True}).sort("updated_at", -1)
    cvs = await cursor.to_list(50)
    return {
        "username": user["username"],
        "cvs": [
            {
                "id": str(c["_id"]),
                "title": c["title"],
                "slug": c.get("slug"),
                "updated_at": c["updated_at"],
            }
            for c in cvs
        ],
    }