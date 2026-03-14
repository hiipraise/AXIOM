from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db

router = APIRouter()


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
        "cvs": [{"id": str(c["_id"]), "title": c["title"], "slug": c.get("slug"), "updated_at": c["updated_at"]} for c in cvs],
    }
