import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.validation import valid_object_id
from app.services.pdf_service import generate_pdf
from app.services.docx_export import generate_docx, generate_plain_text
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


from app.services.pdf_service import cache_key_for_pdf


async def _get_or_create_pdf(
    db,
    cv: dict,
    cv_data: CVData,
    public_url: str | None = None,
    pdfa: bool = False,
) -> tuple[bytes, str]:
    """
    Check PDF cache first; generate if miss, store result, return (pdf_bytes, cache_hit).
    """
    # Include updated_at in cache key so edits auto-invalidate the cache
    updated_at = cv.get("updated_at")
    updated_at_str = updated_at.isoformat() if hasattr(updated_at, "isoformat") else str(updated_at or "")

    cache_key = cache_key_for_pdf(
        cv_id=str(cv["_id"]),
        theme=cv.get("theme", "minimal"),
        template=cv.get("template", "standard"),
        page_count=cv.get("page_count", 1),
        public_url=public_url or "",
        pdfa=pdfa,
        cv_updated_at=updated_at_str,
    )

    # Check cache
    cached = await db.pdf_cache.find_one({"cache_key": cache_key})
    if cached and cached.get("pdf_bytes"):
        return cached["pdf_bytes"], True

    # Generate (use the passed cv_data, already parsed by caller)
    pdf_bytes = generate_pdf(
        cv_data=cv_data,
        owner_username=cv["owner_username"],
        cv_title=cv["title"],
        theme_name=cv.get("theme", "minimal"),
        page_count=cv.get("page_count", 1),
        public_url=public_url or "",
        template=cv.get("template", "standard"),
        pdfa=pdfa,
    )
    enforce_pdf_size_limit(pdf_bytes)

    # Store in cache (expire after 1 hour)
    now = datetime.now(timezone.utc)
    from datetime import timedelta
    await db.pdf_cache.update_one(
        {"cache_key": cache_key},
        {"$set": {
            "cache_key": cache_key,
            "cv_id": str(cv["_id"]),
            "pdf_bytes": pdf_bytes,
            "size_bytes": len(pdf_bytes),
            "created_at": now,
            "expires_at": now + timedelta(hours=1),
        }},
        upsert=True,
    )

    return pdf_bytes, False


@router.get("/pdf/{cv_id}")
async def export_pdf(
    cv_id: str,
    pdfa: bool = False,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
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

    pdf_bytes, _cached = await _get_or_create_pdf(db, cv, cv_data, public_url, pdfa=pdfa)

    await db.export_events.insert_one({
        "user_id": str(current_user["_id"]),
        "cv_id": cv_id,
        "type": "cv-pdf",
        "size_bytes": len(pdf_bytes),
        "cached": _cached,
        "pdfa": pdfa,
        "ts": datetime.now(timezone.utc),
    })

    fname_suffix = "-pdfa" if pdfa else ""
    return StreamingResponse(
        io.BytesIO(pdf_bytes), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}{fname_suffix}.pdf"',
                 "Content-Length": str(len(pdf_bytes))},
    )


@router.get("/public-pdf/{username}/{slug}")
async def export_public_pdf(
    username: str,
    slug: str,
    pdfa: bool = False,
    db=Depends(get_db),
):
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

    pdf_bytes, _cached = await _get_or_create_pdf(db, cv, cv_data, public_url, pdfa=pdfa)

    await db.export_events.insert_one({
        "user_id": cv["owner_id"],
        "cv_id": str(cv["_id"]),
        "type": "public-pdf",
        "size_bytes": len(pdf_bytes),
        "cached": _cached,
        "pdfa": pdfa,
        "ts": datetime.now(timezone.utc),
    })

    fname_suffix = "-pdfa" if pdfa else ""
    return StreamingResponse(
        io.BytesIO(pdf_bytes), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}{fname_suffix}.pdf"'},
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


# ─── Download Analytics ────────────────────────────────────────────────────────


@router.get("/analytics/{cv_id}")
async def download_analytics(cv_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Download stats for a CV: total, by format, last download."""
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise not_found("CV")
    if cv["owner_id"] != str(current_user["_id"]):
        raise forbidden("Access denied")

    pipeline = [
        {"$match": {"cv_id": cv_id}},
        {"$group": {
            "_id": "$type",
            "count": {"$sum": 1},
            "last_ts": {"$max": "$ts"},
            "total_bytes": {"$sum": "$size_bytes"},
            "cache_hits": {"$sum": {"$cond": ["$cached", 1, 0]}},
        }},
        {"$sort": {"count": -1}},
    ]
    results = await db.export_events.aggregate(pipeline).to_list(20)

    total = sum(r["count"] for r in results)
    total_cache_hits = sum(r.get("cache_hits", 0) for r in results)
    formats = {}
    for r in results:
        formats[r["_id"]] = {
            "count": r["count"],
            "last_ts": r.get("last_ts"),
            "total_bytes": r.get("total_bytes", 0),
        }

    return {
        "cv_id": cv_id,
        "total_downloads": total,
        "cache_hit_rate": round(total_cache_hits / total * 100, 1) if total > 0 else 0,
        "formats": formats,
    }


# ─── Invalidate PDF cache when CV is updated ─────────────────────────────────


@router.post("/invalidate-cache/{cv_id}")
async def invalidate_pdf_cache(cv_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Invalidate all cached PDFs for a given CV (called after CV save)."""
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise not_found("CV")
    if cv["owner_id"] != str(current_user["_id"]):
        raise forbidden("Access denied")

    result = await db.pdf_cache.delete_many({"cv_id": cv_id})
    return {"deleted": result.deleted_count}


# ─── DOCX and Plain Text Export ────────────────────────────────────────────────────────


@router.get("/export/{cv_id}")
async def export_cv(
    cv_id: str,
    format: str = Query("pdf", regex="^(pdf|docx|txt)$"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Export CV in specified format: pdf, docx, or txt."""
    if not ObjectId.is_valid(cv_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    cv = await db.cvs.find_one({"_id": ObjectId(cv_id)})
    if not cv:
        raise not_found("CV")
    if cv["owner_id"] != str(current_user["_id"]) and not cv.get("is_public"):
        raise forbidden("Access denied")

    cv_data = CVData(**cv["data"])
    fname = safe_filename(
        f"{cv_data.personal_info.full_name or cv['owner_username']}_{cv['title']}"
    )

    public_url = ""
    if cv.get("is_public") and cv.get("slug"):
        public_url = f"{settings.frontend_url}/cv/{cv['owner_username']}/{cv['slug']}"

    if format == "docx":
        docx_bytes = generate_docx(
            cv_data=cv_data,
            owner_username=cv["owner_username"],
            cv_title=cv["title"],
            theme_name=cv.get("theme", "minimal"),
            public_url=public_url,
        )
        await db.export_events.insert_one({
            "user_id": str(current_user["_id"]),
            "type": "cv-docx",
            "size_bytes": len(docx_bytes),
            "ts": datetime.now(timezone.utc),
        })
        return StreamingResponse(
            io.BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{fname}.docx"',
                "Content-Length": str(len(docx_bytes)),
            },
        )

    if format == "txt":
        plain_text = generate_plain_text(
            cv_data=cv_data,
            owner_username=cv["owner_username"],
            cv_title=cv["title"],
        )
        text_bytes = plain_text.encode("utf-8")
        await db.export_events.insert_one({
            "user_id": str(current_user["_id"]),
            "type": "cv-txt",
            "size_bytes": len(text_bytes),
            "ts": datetime.now(timezone.utc),
        })
        return StreamingResponse(
            io.BytesIO(text_bytes),
            media_type="text/plain; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{fname}.txt"',
                "Content-Length": str(len(text_bytes)),
            },
        )

    # Default to PDF
    pdf_bytes = generate_pdf(
        cv_data=cv_data,
        owner_username=cv["owner_username"],
        cv_title=cv["title"],
        theme_name=cv.get("theme", "minimal"),
        page_count=cv.get("page_count", 1),
        public_url=public_url,
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
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{fname}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.get("/export-public/{username}/{slug}")
async def export_public_cv(
    username: str,
    slug: str,
    format: str = Query("pdf", regex="^(pdf|docx|txt)$"),
    db=Depends(get_db),
):
    """Export public CV in specified format: pdf, docx, or txt."""
    cv = await db.cvs.find_one(
        {"owner_username": username, "slug": slug, "is_public": True}
    )
    if not cv:
        raise not_found("CV")

    cv_data = CVData(**cv["data"])
    fname = safe_filename(
        f"{cv_data.personal_info.full_name or username}_{cv['title']}"
    )

    public_url = f"{settings.frontend_url}/cv/{username}/{slug}"

    if format == "docx":
        docx_bytes = generate_docx(
            cv_data=cv_data,
            owner_username=cv["owner_username"],
            cv_title=cv["title"],
            theme_name=cv.get("theme", "minimal"),
            public_url=public_url,
        )
        await db.export_events.insert_one({
            "user_id": cv["owner_id"],
            "type": "public-docx",
            "size_bytes": len(docx_bytes),
            "ts": datetime.now(timezone.utc),
        })
        return StreamingResponse(
            io.BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{fname}.docx"',
                "Content-Length": str(len(docx_bytes)),
            },
        )

    if format == "txt":
        plain_text = generate_plain_text(
            cv_data=cv_data,
            owner_username=cv["owner_username"],
            cv_title=cv["title"],
        )
        text_bytes = plain_text.encode("utf-8")
        await db.export_events.insert_one({
            "user_id": cv["owner_id"],
            "type": "public-txt",
            "size_bytes": len(text_bytes),
            "ts": datetime.now(timezone.utc),
        })
        return StreamingResponse(
            io.BytesIO(text_bytes),
            media_type="text/plain; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{fname}.txt"',
                "Content-Length": str(len(text_bytes)),
            },
        )

    # Default to PDF
    pdf_bytes = generate_pdf(
        cv_data=cv_data,
        owner_username=cv["owner_username"],
        cv_title=cv["title"],
        theme_name=cv.get("theme", "minimal"),
        page_count=cv.get("page_count", 1),
        public_url=public_url,
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
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{fname}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )
