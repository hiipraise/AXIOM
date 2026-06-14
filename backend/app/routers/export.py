import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.validation import valid_object_id
from app.services.pdf_service import generate_pdf
from app.services.html_pdf import html_to_pdf
from app.models.schemas import CVData, ExportRequest
from app.config import settings
from app.utils.errors import not_found, forbidden, bad_request, too_large
from bson import ObjectId
from datetime import datetime, timezone
import io
import re

router = APIRouter()
logger = logging.getLogger(__name__)
MAX_PDF_BYTES = 20 * 1024 * 1024


def safe_filename(name: str) -> str:
    return re.sub(r"[^\w\-]", "_", name)


def enforce_pdf_size_limit(pdf_bytes: bytes) -> None:
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise too_large("Generated PDF too large")


@router.post("/html-pdf")
async def export_html_pdf(body: ExportRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    html = body.html or ""
    if not html:
        raise bad_request("html field is required")
    if len(html) > 5_000_000:
        raise too_large("HTML payload too large")
    try:
        pdf_bytes = await html_to_pdf(html)
    except ValueError as e:
        raise bad_request(str(e))
    except Exception as e:
        logger.exception("html-pdf generation failed")
        raise HTTPException(status_code=500, detail="PDF generation failed. Please try again later.")
    enforce_pdf_size_limit(pdf_bytes)
    await db.export_events.insert_one({
        "user_id": str(current_user["_id"]),
        "type": "html-pdf",
        "size_bytes": len(pdf_bytes),
        "ts": datetime.now(timezone.utc),
    })
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="cv.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.get("/pdf/{cv_id}")
async def export_pdf(cv_id: str, current_user=Depends(get_current_user),
                     db=Depends(get_db)):
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise not_found("CV")
    if cv["owner_id"] != str(current_user["_id"]) and not cv.get("is_public"):
        raise forbidden("Access denied")
    cv_data    = CVData(**cv["data"])
    public_url = ""
    if cv.get("is_public") and cv.get("slug"):
        public_url = f"{settings.frontend_url}/cv/{cv['owner_username']}/{cv['slug']}"
    fname = safe_filename(
        f"{cv_data.personal_info.full_name or cv['owner_username']}_{cv['title']}"
    )
    pdf_bytes = generate_pdf(
        cv_data=cv_data, owner_username=cv["owner_username"],
        cv_title=cv["title"], theme_name=cv.get("theme", "minimal"),
        page_count=cv.get("page_count", 1), public_url=public_url,
        template=cv.get("template", "standard"),
    )
    enforce_pdf_size_limit(pdf_bytes)
    await db.export_events.insert_one({
        "user_id": str(current_user["_id"]),
        "type": "cv-pdf",
        "size_bytes": len(pdf_bytes),
        "ts": datetime.now(timezone.utc),
    })
    return StreamingResponse(
        io.BytesIO(pdf_bytes), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}.pdf"',
                 "Content-Length": str(len(pdf_bytes))},
    )


@router.get("/public-pdf/{username}/{slug}")
async def export_public_pdf(username: str, slug: str, db=Depends(get_db)):
    cv = await db.cvs.find_one(
        {"owner_username": username, "slug": slug, "is_public": True}
    )
    if not cv:
        raise not_found("CV")
    cv_data    = CVData(**cv["data"])
    public_url = f"{settings.frontend_url}/cv/{username}/{slug}"
    fname      = safe_filename(
        f"{cv_data.personal_info.full_name or username}_{cv['title']}"
    )
    pdf_bytes = generate_pdf(
        cv_data=cv_data, owner_username=cv["owner_username"],
        cv_title=cv["title"], theme_name=cv.get("theme", "minimal"),
        page_count=cv.get("page_count", 1), public_url=public_url,
        template=cv.get("template", "standard"),
    )
    enforce_pdf_size_limit(pdf_bytes)
    await db.export_events.insert_one({
        "user_id": cv["owner_id"],
        "type": "public-pdf",
        "size_bytes": len(pdf_bytes),
        "ts": datetime.now(timezone.utc),
    })
    return StreamingResponse(
        io.BytesIO(pdf_bytes), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}.pdf"'},
    )


@router.post("/pdf-preview")
async def export_pdf_preview(body: dict, current_user=Depends(get_current_user), db=Depends(get_db)):
    if body.get("html"):
        return await export_html_pdf(body, current_user, db)
    try:
        cv_data = CVData(**body.get("data", {}))
    except Exception as e:
        raise bad_request(f"Invalid CV data: {e}")
    theme      = body.get("theme", "minimal")
    title      = body.get("title", "CV") or "CV"
    username   = body.get("username", "guest") or "guest"
    template   = body.get("template", "standard") or "standard"
    page_count = max(1, min(3, int(body.get("page_count", 1))))
    fname      = safe_filename(f"{cv_data.personal_info.full_name or username}_{title}")
    try:
        pdf_bytes = generate_pdf(
            cv_data=cv_data, owner_username=username, cv_title=title,
            theme_name=theme, page_count=page_count, public_url="",
            template=template,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="PDF generation failed. Please try again later.")
    enforce_pdf_size_limit(pdf_bytes)
    return StreamingResponse(
        io.BytesIO(pdf_bytes), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}.pdf"',
                 "Content-Length": str(len(pdf_bytes))},
    )


@router.post("/preview", include_in_schema=False)
async def export_preview_alias(body: dict, current_user=Depends(get_current_user), db=Depends(get_db)):
    return await export_pdf_preview(body, current_user, db)
