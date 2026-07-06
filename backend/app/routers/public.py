from fastapi import APIRouter, Depends, HTTPException, Response, Query
from app.config import settings
from app.database import get_db
from app.utils.errors import not_found
from bson import ObjectId

router = APIRouter()


def _redact_cv(cv: dict) -> dict:
    """Redact CV data based on the owner's privacy settings."""
    data = cv.get("data", {})
    show_name = cv.get("show_name", True)
    show_email = cv.get("show_email", False)
    show_phone = cv.get("show_phone", False)
    show_experience = cv.get("show_experience", True)

    # Shallow copy personal_info so we don't mutate the original
    info = dict(data.get("personal_info", {}))

    if not show_name:
        info["full_name"] = ""
    if not show_email:
        info["email"] = ""
    if not show_phone:
        info["phone"] = ""

    redacted_data = dict(data)
    redacted_data["personal_info"] = info

    if not show_experience:
        redacted_data["experience"] = []

    return {
        "id": str(cv["_id"]),
        "owner_username": cv.get("owner_username", ""),
        "title": cv["title"],
        "data": redacted_data,
        "theme": cv.get("theme", "minimal"),
        "template": cv.get("template", "standard"),
        "page_count": cv.get("page_count", 1),
        "updated_at": cv["updated_at"],
    }


def _browse_card(cv: dict) -> dict:
    """Build a compact card for the CV browse grid, respecting privacy."""
    data = cv.get("data", {})
    info = data.get("personal_info", {}) or {}
    show_name = cv.get("show_name", True)
    show_email = cv.get("show_email", False)

    skills = data.get("skills", [])
    summary = data.get("summary", "")

    return {
        "id": str(cv["_id"]),
        "owner_username": cv.get("owner_username", ""),
        "title": cv["title"],
        "name": info.get("full_name", "") if show_name else "",
        "email": info.get("email", "") if show_email else "",
        "job_title": info.get("job_title", ""),
        "location": info.get("location", ""),
        "skills": skills[:10] if skills else [],
        "summary": (summary[:200] + "...") if len(summary) > 200 else summary,
        "updated_at": cv["updated_at"],
    }


@router.get("/cv/{username}/{slug}")
async def get_public_cv(username: str, slug: str, db=Depends(get_db)):
    cv = await db.cvs.find_one({"owner_username": username, "slug": slug, "is_public": True})
    # Fallback: if slug looks like a MongoDB ObjectId, try lookup by _id
    if not cv and ObjectId.is_valid(slug):
        cv = await db.cvs.find_one({"_id": ObjectId(slug), "is_public": True})
    if not cv:
        raise not_found("CV")
    return _redact_cv(cv)


@router.get("/profile/{username}")
async def get_public_profile(username: str, db=Depends(get_db)):
    user = await db.users.find_one({"username": username})
    if not user:
        raise not_found("User")
    cursor = db.cvs.find({"owner_id": str(user["_id"]), "is_public": True}).sort("updated_at", -1)
    cvs = await cursor.to_list(50)

    # Pull visible contact info from the most recently updated public CV
    contact = {}
    if cvs:
        latest = cvs[0]
        pi = latest.get("data", {}).get("personal_info", {}) or {}
        show_email = latest.get("show_email", False)
        show_phone = latest.get("show_phone", False)
        if pi.get("location"):
            contact["location"] = pi["location"]
        if show_email and pi.get("email"):
            contact["email"] = pi["email"]
        if show_phone and pi.get("phone"):
            contact["phone"] = pi["phone"]
        for k in ["linkedin", "github", "portfolio", "website"]:
            if pi.get(k):
                contact[k] = pi[k]

    return {
        "username": user["username"],
        "role": user.get("role", "user"),
        "contact": contact,
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


@router.get("/cvs/browse")
async def browse_public_cvs(
    q: str = "",
    skills: str = "",
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db=Depends(get_db),
):
    """Browse public CVs with optional search by keyword or skills."""
    query: dict = {"is_public": True}

    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"data.summary": {"$regex": q, "$options": "i"}},
            {"owner_username": {"$regex": q, "$options": "i"}},
        ]

    if skills:
        skills_list = [s.strip() for s in skills.split(",") if s.strip()]
        if skills_list:
            query["data.skills"] = {"$in": skills_list}

    total = await db.cvs.count_documents(query)
    cursor = (
        db.cvs.find(query)
        .sort("updated_at", -1)
        .skip((page - 1) * per_page)
        .limit(per_page)
    )
    cvs = await cursor.to_list(per_page)

    return {
        "items": [_browse_card(c) for c in cvs],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


# Keep the sitemap endpoint
@router.get("/sitemap.xml")
async def sitemap(db=Depends(get_db)):
    base = settings.frontend_url
    cursor = db.cvs.find({"is_public": True}, {"owner_username": 1, "slug": 1, "updated_at": 1})
    cvs = await cursor.to_list(5000)
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.3">']
    for cv in cvs:
        if cv.get("slug"):
            lines.append(f"  <url><loc>{base}/cv/{cv['owner_username']}/{cv['slug']}</loc></url>")
    lines.append("</urlset>")
    return Response("\n".join(lines), media_type="application/xml")
