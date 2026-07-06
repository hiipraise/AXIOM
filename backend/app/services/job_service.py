from __future__ import annotations

import asyncio
import hashlib
import json
import re as _re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx

from app.config import settings
from app.models.schemas import JobResult, SourceHealth
from app.lib.nigeria_states import NIGERIA_STATES

# Cache TTLs: 30 min for external API, 5 min for AXIOM internal
EXTERNAL_TTL_MINUTES = 30
AXIOM_TTL_MINUTES = 5
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


async def _fetch_json(
    url: str,
    params: Optional[dict[str, Any]] = None,
    headers: Optional[dict[str, str]] = None,
) -> Any:
    async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


# ── Adzuna UK (global) ────────────────────────────────────────────────────────

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

    try:
        payload = await _fetch_json(
            "https://api.adzuna.com/v1/api/jobs/gb/search/1", params=params
        )
    except Exception:
        return []

    jobs: list[JobResult] = []
    for item in payload.get("results", []):
        title = _normalize_text(item.get("title"))
        company = _normalize_text(
            item.get("company", {}).get("display_name")
            if isinstance(item.get("company"), dict)
            else item.get("company")
        )
        if not title or not company:
            continue
        jobs.append(
            JobResult(
                id=f"adzuna:{item.get('id') or item.get('redirect_url') or title}",
                title=title,
                company=company,
                location=_normalize_text(
                    item.get("location", {}).get("display_name")
                    if isinstance(item.get("location"), dict)
                    else item.get("location")
                ),
                remote="remote" in _normalize_text(item.get("description", "")).lower(),
                salary_min=float(item["salary_min"]) if item.get("salary_min") not in (None, "") else None,
                salary_max=float(item["salary_max"]) if item.get("salary_max") not in (None, "") else None,
                currency=_normalize_text(item.get("salary_currency")),
                description=_normalize_text(item.get("description")),
                apply_url=_normalize_text(item.get("redirect_url")),
                posted_at=_parse_datetime(item.get("created")),
                source="adzuna",
                category=_normalize_text(
                    item.get("category", {}).get("label")
                    if isinstance(item.get("category"), dict)
                    else item.get("category")
                ),
                logo_url=None,
            )
        )
    if remote is False:
        jobs = [job for job in jobs if not job.remote]
    return jobs


# ── Adzuna Nigeria (/ng/) ─────────────────────────────────────────────────────

async def _search_adzuna_nigeria(
    query: str,
    nigeria_state: str = "",
    remote: Optional[bool] = None,
) -> list[JobResult]:
    """
    Search Adzuna's Nigeria endpoint.
    nigeria_state: lowercase state key from NIGERIA_STATES (e.g. "lagos", "rivers").
    Falls back to a generic Nigeria search when no state is provided.
    """
    if not settings.adzuna_app_id or not settings.adzuna_app_key:
        return []

    params: dict[str, Any] = {
        "app_id": settings.adzuna_app_id,
        "app_key": settings.adzuna_app_key,
        "results_per_page": DEFAULT_PER_PAGE,
        "what": query or "jobs",
    }

    # Map state key → primary city for Adzuna `where`
    if nigeria_state:
        state_lower = nigeria_state.lower()
        cities = NIGERIA_STATES.get(state_lower, [nigeria_state.title()])
        params["where"] = cities[0]
    elif remote is True:
        params["where"] = "remote"
    # If no state + not remote, omit `where` — Adzuna returns nationwide Nigeria results

    try:
        payload = await _fetch_json(
            "https://api.adzuna.com/v1/api/jobs/ng/search/1", params=params
        )
    except Exception:
        return []

    jobs: list[JobResult] = []
    for item in payload.get("results", []):
        title = _normalize_text(item.get("title"))
        company_raw = item.get("company", {})
        company = _normalize_text(
            company_raw.get("display_name")
            if isinstance(company_raw, dict)
            else company_raw
        )
        if not title or not company:
            continue
        loc_raw = item.get("location", {})
        location = _normalize_text(
            loc_raw.get("display_name") if isinstance(loc_raw, dict) else loc_raw
        ) or (nigeria_state.title() if nigeria_state else "Nigeria")

        jobs.append(
            JobResult(
                id=f"adzuna-ng:{item.get('id') or title}",
                title=title,
                company=company,
                location=location,
                remote="remote" in _normalize_text(item.get("description", "")).lower(),
                salary_min=float(item["salary_min"]) if item.get("salary_min") not in (None, "") else None,
                salary_max=float(item["salary_max"]) if item.get("salary_max") not in (None, "") else None,
                currency="NGN",
                description=_normalize_text(item.get("description", "")),
                apply_url=_normalize_text(item.get("redirect_url", "")),
                posted_at=_parse_datetime(item.get("created")),
                source="adzuna-ng",
                category=_normalize_text(
                    (item.get("category", {}) or {}).get("label", "")
                    if isinstance(item.get("category"), dict)
                    else item.get("category", "")
                ),
                logo_url=None,
            )
        )
    if remote is False:
        jobs = [job for job in jobs if not job.remote]
    return jobs


# ── Remotive ──────────────────────────────────────────────────────────────────

async def _search_remotive(query: str, location: str, remote: Optional[bool]) -> list[JobResult]:
    try:
        payload = await _fetch_json(
            "https://remotive.com/api/remote-jobs", params={"search": query}
        )
    except Exception:
        return []

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


# ── Arbeitnow ─────────────────────────────────────────────────────────────────

async def _search_arbeitnow(query: str, location: str, remote: Optional[bool]) -> list[JobResult]:
    try:
        payload = await _fetch_json(
            "https://www.arbeitnow.com/api/job-board-api", params={"search": query}
        )
    except Exception:
        return []

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


# ── Jobicy ────────────────────────────────────────────────────────────────────

async def _search_jobicy(
    query: str, location: str, remote: Optional[bool], region: str = ""
) -> list[JobResult]:
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
    return _parse_jobicy_response(payload, remote, location)


async def _search_jobicy_with_params(params: dict[str, Any]) -> list[JobResult]:
    """Search Jobicy with pre-built params (used for per-country Africa queries)."""
    try:
        payload = await _fetch_json("https://jobicy.com/api/v2/remote-jobs", params=params)
    except Exception:
        return []
    return _parse_jobicy_response(payload, None, "")


def _parse_jobicy_response(payload: dict, remote: Optional[bool], location: str) -> list[JobResult]:
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



# ── Main search entry point ───────────────────────────────────────────────────

async def search_jobs(
    query: str = "",
    location: str = "",
    remote: Optional[bool] = None,
    region: str = "",
    nigeria_state: str = "",
) -> tuple[list[JobResult], SourceHealth]:
    """
    Search external job boards. Returns (results, health_info).
    health_info contains:
      - configured: number of sources attempted
      - succeeded: number of sources that returned data (possibly empty)
      - failed: number of sources that raised exceptions
      - sources_with_results: list of source names that returned >0 results
      - warning: human-readable warning if all sources failed
    """

    effective_location = _region_location(region, location)
    is_nigeria = region.lower() == "nigeria" or bool(nigeria_state)

    # Build tasks with source labels
    source_tasks: list[tuple[str, Any]] = [
        ("remotive", _search_remotive(query, effective_location, remote)),
        ("arbeitnow", _search_arbeitnow(query, effective_location, remote)),
        ("jobicy", _search_jobicy(query, effective_location, remote, region)),
    ]

    has_adzuna = bool(settings.adzuna_app_id and settings.adzuna_app_key)
    if has_adzuna:
        if is_nigeria:
            source_tasks.append(("adzuna-ng", _search_adzuna_nigeria(query, nigeria_state, remote)))
        else:
            source_tasks.append(("adzuna", _search_adzuna(query, effective_location, remote)))

    # If region is Africa and not filtered to Nigeria, try additional Jobicy geos
    if region.lower() == "africa" and not is_nigeria:
        for geo in ["south-africa", "kenya", "ghana", "nigeria"]:
            geo_params: dict[str, Any] = {"count": DEFAULT_PER_PAGE, "geo": geo}
            if query:
                geo_params["tag"] = query
            source_tasks.append((
                f"jobicy-africa-{geo}",
                _search_jobicy_with_params(geo_params),
            ))

    # Run all sources in parallel
    batches = await asyncio.gather(
        *[task for _, task in source_tasks],
        return_exceptions=True,
    )

    results: list[JobResult] = []
    seen: set[str] = set()
    succeeded = 0
    failed = 0
    sources_with_results: list[str] = []

    for (source_name, _), batch in zip(source_tasks, batches):
        if isinstance(batch, Exception):
            failed += 1
            continue
        succeeded += 1
        job_count = 0
        for job in batch:
            if job.id in seen or not _matches_region(job, region):
                continue
            seen.add(job.id)
            results.append(job)
            job_count += 1
        if job_count > 0:
            sources_with_results.append(source_name)

    configured = len(source_tasks)

    # Build a descriptive warning when sources fail
    warning = ""
    if configured > 0 and succeeded == 0:
        attempted = [name for name, _ in source_tasks]
        warning = (
            f"Job sources unavailable: {', '.join(attempted)}. "
            "Try again later or check your internet connection."
        )
    elif configured > 0 and failed > 0:
        attempted = [name for name, _ in source_tasks]
        failed_sources = [name for name, _ in source_tasks
                          if name not in sources_with_results]
        if failed_sources:
            warning = (
                f"{', '.join(failed_sources)} unavailable — "
                "results limited to remaining sources."
            )

    return results, SourceHealth(
        configured=configured,
        succeeded=succeeded,
        failed=failed,
        sources_with_results=sources_with_results,
        warning=warning,
    )


# ── Cache helpers ─────────────────────────────────────────────────────────────

async def fetch_cached_search(db, cache_key: str) -> Optional[dict[str, Any]]:
    now = _now()
    cached = await db.job_cache.find_one({"cache_key": cache_key})
    if not cached:
        return None
    expires_at = cached.get("expires_at")
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or now >= expires_at:
        await db.job_cache.delete_one({"cache_key": cache_key})
        return None
    return cached


async def cache_search_results(
    db, cache_key: str, jobs: list[JobResult], query_payload: dict[str, Any]
) -> None:
    now = _now()
    payload = [job.model_dump(mode="json") for job in jobs]
    has_axiom = any(job.source == "axiom" for job in jobs)
    ttl = AXIOM_TTL_MINUTES if has_axiom else EXTERNAL_TTL_MINUTES
    expires_at = now + timedelta(minutes=ttl)
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
        job_ttl = AXIOM_TTL_MINUTES if job.source == "axiom" else EXTERNAL_TTL_MINUTES
        job_expires_at = now + timedelta(minutes=job_ttl)
        await db.job_cache.update_one(
            {"job_id": job.id},
            {
                "$set": {
                    "job_id": job.id,
                    "kind": "job",
                    "source": job.source,
                    "payload": job.model_dump(mode="json"),
                    "cached_at": now,
                    "expires_at": job_expires_at,
                }
            },
            upsert=True,
        )


def make_search_cache_key(
    query: str,
    location: str,
    remote: Optional[bool],
    page: int,
    per_page: int,
    region: str = "",
    nigeria_state: str = "",
) -> str:
    return _search_cache_key({
        "q": query,
        "location": location,
        "remote": remote,
        "region": region,
        "nigeria_state": nigeria_state,
        "page": page,
        "per_page": per_page,
    })


async def invalidate_job_cache(db, job_id: str, source: str = "axiom") -> None:
    if source == "axiom":
        await db.job_cache.delete_one({"job_id": job_id})
        await db.job_cache.delete_many({"kind": "search"})
        await db.job_cache.delete_many({"job_id": {"$regex": ".*"}})