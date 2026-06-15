from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.utils.errors import not_found

router = APIRouter()


@router.get("/cv/{username}/{slug}")
async def get_public_cv(username: str, slug: str, db=Depends(get_db)):
    cv = await db.cvs.find_one({"owner_username": username, "slug": slug, "is_public": True})
    if not cv:
        raise not_found("CV")
    return {
        "id": str(cv["_id"]),
        "owner_username": cv["owner_username"],
        "title": cv["title"],
        "data": cv["data"],
        "theme": cv.get("theme", "minimal"),
        "template": cv.get("template", "standard"),
        "page_count": cv.get("page_count", 1),
        "updated_at": cv["updated_at"],
    }


@router.get("/profile/{username}")
async def get_public_profile(username: str, db=Depends(get_db)):
    user = await db.users.find_one({"username": username})
    if not user:
        raise not_found("User")
    cursor = db.cvs.find({"owner_id": str(user["_id"]), "is_public": True}).sort("updated_at", -1)
    cvs = await cursor.to_list(50)
    company = await db.company_profiles.find_one({"user_id": str(user["_id"])})
    return {
        "username": user["username"],
        "role": user.get("role", "user"),
        "recruiter": {
            "company_name": (company or {}).get("company_name", ""),
            "company_slug": (company or {}).get("company_slug", ""),
            "verified": bool((company or {}).get("verified", False)),
            "is_approved": bool((company or {}).get("is_approved", False)),
        } if company else None,
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

# backend/app/routers/public.py
@router.get("/sitemap.xml")
async def sitemap(db=Depends(get_db)):
    base = settings.frontend_url
    cursor = db.cvs.find({"is_public": True}, {"owner_username": 1, "slug": 1, "updated_at": 1})
    cvs = await cursor.to_list(5000)
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for cv in cvs:
        if cv.get("slug"):
            lines.append(f"  <url><loc>{base}/cv/{cv['owner_username']}/{cv['slug']}</loc></url>")
    lines.append("</urlset>")
    return Response("\n".join(lines), media_type="application/xml")