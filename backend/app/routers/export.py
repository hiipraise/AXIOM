from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.database import get_db
from app.middleware.auth import get_current_user, get_optional_user
from app.services.pdf_service import generate_pdf
from app.models.schemas import CVData
from app.config import settings
from bson import ObjectId
import io
import re

router = APIRouter()


def safe_filename(name: str) -> str:
    return re.sub(r"[^\w\-]", "_", name)


@router.get("/pdf/{cv_id}")
async def export_pdf(cv_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise HTTPException(404, "CV not found")
    if cv["owner_id"] != str(current_user["_id"]) and not cv.get("is_public"):
        raise HTTPException(403, "Access denied")

    cv_data = CVData(**cv["data"])
    public_url = ""
    if cv.get("is_public") and cv.get("slug"):
        public_url = f"{settings.frontend_url}/cv/{cv['owner_username']}/{cv['slug']}"

    fname = safe_filename(
        f"{cv_data.personal_info.full_name or cv['owner_username']}_{cv['title']}"
    )

    pdf_bytes = generate_pdf(
        cv_data=cv_data,
        owner_username=cv["owner_username"],
        cv_title=cv["title"],
        theme_name=cv.get("theme", "minimal"),
        page_count=cv.get("page_count", 1),
        public_url=public_url,
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{fname}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.get("/public-pdf/{username}/{slug}")
async def export_public_pdf(username: str, slug: str, db=Depends(get_db)):
    cv = await db.cvs.find_one({"owner_username": username, "slug": slug, "is_public": True})
    if not cv:
        raise HTTPException(404, "CV not found or not public")

    cv_data = CVData(**cv["data"])
    public_url = f"{settings.frontend_url}/cv/{username}/{slug}"
    fname = safe_filename(f"{cv_data.personal_info.full_name or username}_{cv['title']}")

    pdf_bytes = generate_pdf(
        cv_data=cv_data,
        owner_username=cv["owner_username"],
        cv_title=cv["title"],
        theme_name=cv.get("theme", "minimal"),
        page_count=cv.get("page_count", 1),
        public_url=public_url,
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{fname}.pdf"',
        },
    )


@router.post("/pdf-preview")
async def export_pdf_preview(body: dict):
    """
    Generate a PDF from raw CV data — no authentication required.
    Used by the session-only (guest) editor.
    Rate-limiting / abuse prevention should be handled at the infrastructure level.
    """
    try:
        cv_data = CVData(**body.get("data", {}))
    except Exception as e:
        raise HTTPException(400, f"Invalid CV data: {e}")

    theme = body.get("theme", "minimal")
    title = body.get("title", "CV") or "CV"
    username = body.get("username", "guest") or "guest"
    page_count = int(body.get("page_count", 1))
    page_count = max(1, min(3, page_count))

    fname = safe_filename(
        f"{cv_data.personal_info.full_name or username}_{title}"
    )

    try:
        pdf_bytes = generate_pdf(
            cv_data=cv_data,
            owner_username=username,
            cv_title=title,
            theme_name=theme,
            page_count=page_count,
            public_url="",
        )
    except Exception as e:
        raise HTTPException(500, f"PDF generation failed: {e}")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{fname}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )