from __future__ import annotations

import asyncio
import hashlib
import json
import re as _re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx

from app.config import settings
from app.models.schemas import JobResult

SEARCH_TTL_HOURS = 6
DEFAULT_PER_PAGE = 20


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _strip_html(raw: str) -> str:
    """Remove HTML/XML tags and decode common entities."""
    text = _re.sub(r"<[^>]+>", " ", raw)
    text = (
        text.replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&nbsp;", " ")
            .replace("&#39;", "'")
            .replace("&quot;", '"')
    )
    # Collapse runs of whitespace / newlines down to single spaces
    text = _re.sub(r"\s{2,}", " ", text)
    return text.strip()


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        parts: list[str] = []
        for item in value.values():
            if isinstance(item, list):
                parts.extend(_normalize_text(v) for v in item)
            elif item is not None:
                parts.append(_normalize_text(item))
        return _strip_html(" ".join(part for part in parts if part))
    if isinstance(value, list):
        return _strip_html(" ".join(_normalize_text(item) for item in value if item is not None))
    return _strip_html(str(value))


def _region_location(region: str, location: str) -> str:
    if location:
        return location
    normalized = (region or "").lower()
    if normalized == "nigeria":
        return "Nigeria"
    if normalized == "africa":
        return "Africa"
    return ""


def _region_geo(region: str, location: str) -> str:
    text = (region or location or "").strip().lower()
    aliases = {
        "nigeria": "nigeria",
        "kenya": "kenya",
        "ghana": "ghana",
        "south africa": "south-africa",
        "south-africa": "south-africa",
        "africa": "africa",
    }
    return aliases.get(text, "")


def _matches_region(job: JobResult, region: str) -> bool:
    normalized = (region or "").lower()
    if not normalized:
        return True
    haystack = f"{job.location} {job.description} {job.title}".lower()
    if normalized == "nigeria":
        return "nigeria" in haystack or "remote" in haystack
    if normalized == "africa":
        markers = ["africa", "nigeria", "kenya", "ghana", "south africa", "egypt", "rwanda", "remote"]
        return any(marker in haystack for marker in markers)
    return normalized in haystack


def _parse_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not value:
        return _now()
    text = str(value).replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return _now()
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _search_cache_key(query: dict[str, Any]) -> str:
    canonical = json.dumps(query, sort_keys=True, separators=(",", ":"))
    return hashlib.sha1(canonical.encode("utf-8")).hexdigest()


async def _fetch_json(url: str, params: Optional[dict[str, Any]] = None, headers: Optional[dict[str, str]] = None) -> Any:
    async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


async def _search_adzuna(query: str, location: str, remote: Optional[bool]) -> list[JobResult]:
    if not settings.adzuna_app_id or not settings.adzuna_app_key:
        return []

    params = {
        "app_id": settings.adzuna_app_id,
        "app_key": settings.adzuna_app_key,
        "results_per_page": DEFAULT_PER_PAGE,
        "what": query,
    }
    if location:
        params["where"] = location
    if remote is True:
        params["where"] = f"remote {location}".strip()

    payload = await _fetch_json("https://api.adzuna.com/v1/api/jobs/gb/search/1", params=params)
    jobs: list[JobResult] = []
    for item in payload.get("results", []):
        title = _normalize_text(item.get("title"))
        company = _normalize_text(item.get("company", {}).get("display_name") if isinstance(item.get("company"), dict) else item.get("company"))
        if not title or not company:
            continue
        jobs.append(
            JobResult(
                id=f"adzuna:{item.get('id') or item.get('redirect_url') or title}",
                title=title,
                company=company,
                location=_normalize_text(item.get("location", {}).get("display_name") if isinstance(item.get("location"), dict) else item.get("location")),
                remote="remote" in _normalize_text(item.get("description")).lower(),
                salary_min=float(item["salary_min"]) if item.get("salary_min") not in (None, "") else None,
                salary_max=float(item["salary_max"]) if item.get("salary_max") not in (None, "") else None,
                currency=_normalize_text(item.get("salary_currency")),
                description=_normalize_text(item.get("description")),
                apply_url=_normalize_text(item.get("redirect_url")),
                posted_at=_parse_datetime(item.get("created")),
                source="adzuna",
                category=_normalize_text(item.get("category", {}).get("label") if isinstance(item.get("category"), dict) else item.get("category")),
                logo_url=None,
            )
        )
    if remote is False:
        jobs = [job for job in jobs if not job.remote]
    return jobs


async def _search_remotive(query: str, location: str, remote: Optional[bool]) -> list[JobResult]:
    payload = await _fetch_json("https://remotive.com/api/remote-jobs", params={"search": query})
    jobs: list[JobResult] = []
    for item in payload.get("jobs", []):
        title = _normalize_text(item.get("title"))
        company = _normalize_text(item.get("company_name"))
        if not title or not company:
            continue
        job = JobResult(
            id=f"remotive:{item.get('id') or item.get('url') or title}",
            title=title,
            company=company,
            location=_normalize_text(item.get("candidate_required_location") or "Remote"),
            remote=True,
            salary_min=None,
            salary_max=None,
            currency=_normalize_text(item.get("salary_currency")),
            description=_normalize_text(item.get("description")),
            apply_url=_normalize_text(item.get("url")),
            posted_at=_parse_datetime(item.get("publication_date") or item.get("date")),
            source="remotive",
            category=_normalize_text(item.get("job_type") or item.get("category")),
            logo_url=_normalize_text(item.get("company_logo_url")) or None,
        )
        if remote is False:
            continue
        if location and location.lower() not in job.location.lower() and location.lower() not in job.description.lower():
            continue
        jobs.append(job)
    return jobs


async def _search_arbeitnow(query: str, location: str, remote: Optional[bool]) -> list[JobResult]:
    payload = await _fetch_json("https://www.arbeitnow.com/api/job-board-api", params={"search": query})
    jobs: list[JobResult] = []
    for item in payload.get("data", []):
        title = _normalize_text(item.get("title"))
        company = _normalize_text(item.get("company_name") or item.get("company"))
        if not title or not company:
            continue
        job = JobResult(
            id=f"arbeitnow:{item.get('slug') or item.get('url') or title}",
            title=title,
            company=company,
            location=_normalize_text(item.get("location") or "Remote"),
            remote=True,
            salary_min=None,
            salary_max=None,
            currency="",
            description=_normalize_text(item.get("description") or item.get("content")),
            apply_url=_normalize_text(item.get("url") or item.get("slug") or ""),
            posted_at=_parse_datetime(item.get("created_at") or item.get("date")),
            source="arbeitnow",
            category=_normalize_text(item.get("tag") or item.get("category")),
            logo_url=None,
        )
        if remote is False:
            continue
        if location and location.lower() not in job.location.lower() and location.lower() not in job.description.lower():
            continue
        jobs.append(job)
    return jobs


async def _search_jsearch(query: str, location: str, remote: Optional[bool]) -> list[JobResult]:
    """Search via RapidAPI JSearch (jsearch.p.rapidapi.com).

    This is defensive: the JSearch response shapes vary across providers on RapidAPI,
    so we attempt to extract common fields if present.
    """
    if not settings.rapidapi_key or not settings.rapidapi_host:
        return []

    headers = {
        "X-RapidAPI-Key": settings.rapidapi_key,
        "X-RapidAPI-Host": settings.rapidapi_host,
    }
    params: dict[str, Any] = {"query": query or "", "page": 1, "num_pages": 1}
    if location:
        params["location"] = location

    try:
        payload = await _fetch_json("https://jsearch.p.rapidapi.com/search", params=params, headers=headers)
    except Exception:
        return []

    data = payload.get("data") or payload.get("results") or []
    jobs: list[JobResult] = []
    for item in data:
        # tolerant field selection
        title = _normalize_text(item.get("job_title") or item.get("title") or item.get("position") or item.get("name"))
        company = _normalize_text(item.get("employer_name") or item.get("company_name") or (item.get("company") if isinstance(item.get("company"), str) else (item.get("company", {}).get("name") if isinstance(item.get("company"), dict) else None)))
        if not title or not company:
            continue
        city = _normalize_text(item.get("job_city") or item.get("city") or item.get("location"))
        location_text = city or _normalize_text(item.get("job_country") or item.get("country") or "")
        highlights = item.get("job_highlights")
        responsibility_text = ""
        if isinstance(highlights, dict):
            responsibility_text = " ".join(highlights.get("Responsibilities", []) or [])
        description = _normalize_text(item.get("job_description") or item.get("snippet") or responsibility_text or item.get("description") or highlights)
        apply_url = _normalize_text(item.get("job_apply_link") or item.get("job_link") or item.get("job_google_link") or item.get("apply_link") or item.get("url") or "")
        jid = item.get("job_id") or item.get("id") or apply_url or f"{title}-{company}"
        job = JobResult(
            id=f"jsearch:{jid}",
            title=title,
            company=company,
            location=location_text or "",
            remote=(item.get("remote") is True) or ("remote" in description.lower()),
            salary_min=None,
            salary_max=None,
            currency=_normalize_text(item.get("salary_currency") or ""),
            description=description,
            apply_url=apply_url,
            posted_at=_parse_datetime(item.get("publication_date") or item.get("date") or item.get("posted_at")),
            source="jsearch",
            category=_normalize_text(item.get("job_employment_type") or item.get("job_type") or item.get("category")),
            logo_url=_normalize_text(item.get("company_logo") or item.get("company_logo_url") or item.get("company_logo_url")) or None,
        )
        if remote is False and job.remote:
            continue
        if location and location.lower() not in job.location.lower() and location.lower() not in job.description.lower():
            continue
        jobs.append(job)
    return jobs


async def _search_jobicy(query: str, location: str, remote: Optional[bool], region: str = "") -> list[JobResult]:
    params: dict[str, Any] = {"count": DEFAULT_PER_PAGE}
    geo = _region_geo(region, location)
    if geo:
        params["geo"] = geo
    if query:
        params["tag"] = query
    try:
        payload = await _fetch_json("https://jobicy.com/api/v2/remote-jobs", params=params)
    except Exception:
        return []

    jobs: list[JobResult] = []
    for item in payload.get("jobs", []):
        title = _normalize_text(item.get("jobTitle") or item.get("title"))
        company = _normalize_text(item.get("companyName") or item.get("company"))
        if not title or not company:
            continue
        description = _normalize_text(item.get("jobDescription") or item.get("jobExcerpt") or "")
        job = JobResult(
            id=f"jobicy:{item.get('id') or item.get('url') or title}",
            title=title,
            company=company,
            location=_normalize_text(item.get("jobGeo") or "Remote"),
            remote=True,
            salary_min=float(item["annualSalaryMin"]) if item.get("annualSalaryMin") not in (None, "") else None,
            salary_max=float(item["annualSalaryMax"]) if item.get("annualSalaryMax") not in (None, "") else None,
            currency=_normalize_text(item.get("salaryCurrency") or ""),
            description=description,
            apply_url=_normalize_text(item.get("url")),
            posted_at=_parse_datetime(item.get("pubDate")),
            source="jobicy",
            category=_normalize_text(item.get("jobType") or item.get("jobIndustry") or ""),
            logo_url=_normalize_text(item.get("companyLogo")) or None,
        )
        if remote is False:
            continue
        if location and location.lower() not in job.location.lower() and location.lower() not in job.description.lower():
            continue
        jobs.append(job)
    return jobs


async def _search_muse(query: str, location: str, remote: Optional[bool]) -> list[JobResult]:
    """Search The Muse public API and normalize results."""
    url = "https://www.themuse.com/api/public/jobs"
    params: dict[str, Any] = {"page": 1}
    try:
        payload = await _fetch_json(url, params=params)
    except Exception:
        return []

    data = payload.get("results") or []
    jobs: list[JobResult] = []
    for item in data:
        title = _normalize_text(item.get("name") or item.get("title"))
        company = _normalize_text(item.get("company", {}).get("name") if isinstance(item.get("company"), dict) else item.get("company") or "")
        if not title or not company:
            continue
        locs = item.get("locations") or []
        location_text = ""
        if isinstance(locs, list) and locs:
            # locations can be objects with 'name' fields or strings
            first = locs[0]
            location_text = _normalize_text(first.get("name") if isinstance(first, dict) else first)
        description = _normalize_text(item.get("contents") or item.get("contents_html") or item.get("description") or "")
        refs = item.get("refs") or {}
        apply_url = _normalize_text(refs.get("landing_page") or refs.get("job") or refs.get("url") or "")
        jid = item.get("id") or apply_url or f"muse-{title}-{company}"
        job = JobResult(
            id=f"muse:{jid}",
            title=title,
            company=company,
            location=location_text or "",
            remote=("remote" in description.lower()) or False,
            salary_min=None,
            salary_max=None,
            currency="",
            description=description,
            apply_url=apply_url,
            posted_at=_parse_datetime(item.get("publication_date") or item.get("date")),
            source="muse",
            category=_normalize_text(item.get("category") or ""),
            logo_url=None,
        )
        if remote is False and job.remote:
            continue
        if location and location.lower() not in job.location.lower() and location.lower() not in job.description.lower():
            continue
        jobs.append(job)
    return jobs


async def search_jobs(query: str = "", location: str = "", remote: Optional[bool] = None, region: str = "") -> list[JobResult]:
    effective_location = _region_location(region, location)
    tasks = [
        _search_remotive(query, effective_location, remote),
        _search_arbeitnow(query, effective_location, remote),
        _search_muse(query, effective_location, remote),
        _search_jobicy(query, effective_location, remote, region),
    ]
    # RapidAPI JSearch (optional)
    if settings.rapidapi_key and settings.rapidapi_host:
        tasks.append(_search_jsearch(query, effective_location, remote))
    if settings.adzuna_app_id and settings.adzuna_app_key:
        tasks.append(_search_adzuna(query, effective_location, remote))

    batches = await asyncio.gather(*tasks, return_exceptions=True)
    results: list[JobResult] = []
    seen: set[str] = set()
    for batch in batches:
        if isinstance(batch, Exception):
            continue
        for job in batch:
            if job.id in seen or not _matches_region(job, region):
                continue
            seen.add(job.id)
            results.append(job)
    return results


async def fetch_cached_search(db, cache_key: str) -> Optional[dict[str, Any]]:
    return await db.job_cache.find_one({"cache_key": cache_key})


async def cache_search_results(db, cache_key: str, jobs: list[JobResult], query_payload: dict[str, Any]) -> None:
    now = _now()
    expires_at = now + timedelta(hours=SEARCH_TTL_HOURS)
    payload = [job.model_dump(mode="json") for job in jobs]
    await db.job_cache.update_one(
        {"cache_key": cache_key},
        {
            "$set": {
                "cache_key": cache_key,
                "kind": "search",
                "query": query_payload,
                "payload": payload,
                "cached_at": now,
                "expires_at": expires_at,
            }
        },
        upsert=True,
    )
    for job in jobs:
        await db.job_cache.update_one(
            {"job_id": job.id},
            {
                "$set": {
                    "job_id": job.id,
                    "kind": "job",
                    "payload": job.model_dump(mode="json"),
                    "cached_at": now,
                    "expires_at": expires_at,
                }
            },
            upsert=True,
        )


def make_search_cache_key(query: str, location: str, remote: Optional[bool], page: int, per_page: int, region: str = "") -> str:
    return _search_cache_key({"q": query, "location": location, "remote": remote, "region": region, "page": page, "per_page": per_page})
