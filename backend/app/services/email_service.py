from __future__ import annotations

import httpx
from typing import Optional

from app.config import settings


class EmailServiceError(Exception):
    pass


def _get_from() -> str:
    if not settings.sendhiiv_from_address:
        raise EmailServiceError("sendhiiv_from_address not configured")
    if settings.sendhiiv_from_name:
        return f"{settings.sendhiiv_from_name} <{settings.sendhiiv_from_address}>"
    return settings.sendhiiv_from_address


def _make_request(payload: dict) -> dict:
    if not settings.sendhiiv_api_key:
        raise EmailServiceError("sendhiiv_api_key not configured")

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            "https://api.sendhiiv.com/api/v1/messages",
            headers={
                "Authorization": f"Bearer {settings.sendhiiv_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
    try:
        result = response.json()
    except ValueError:
        raise EmailServiceError(f"Invalid JSON response: {response.text[:200]}")

    if response.status_code >= 400:
        raise EmailServiceError(result.get("error", f"HTTP {response.status_code}"))

    return result


def send_email(
    to: str | list[str],
    subject: str,
    html: Optional[str] = None,
    template_key: Optional[str] = None,
    variables: Optional[dict] = None,
) -> dict:
    """Send a single email or multiple emails."""
    payload = {
        "from": _get_from(),
        "subject": subject,
    }

    if isinstance(to, list):
        payload["to"] = to
    else:
        payload["to"] = to

    if html:
        payload["html"] = html

    if template_key:
        payload["template_key"] = template_key

    if variables:
        payload.setdefault("variables", {}).update(variables)

    return _make_request(payload)


def send_email_batch(
    to: list[str],
    subject: str,
    html: Optional[str] = None,
    template_key: Optional[str] = None,
    variables: Optional[dict] = None,
    batch_size: int = 50,
    batch_interval_minutes: int = 15,
) -> dict:
    """Send emails in batches (drip mode for large recipient lists)."""
    payload = {
        "from": _get_from(),
        "to": to,
        "subject": subject,
        "send_mode": "drip",
        "batch_size": batch_size,
        "batch_interval_minutes": batch_interval_minutes,
    }

    if html:
        payload["html"] = html

    if template_key:
        payload["template_key"] = template_key

    if variables:
        payload["variables"] = variables

    return _make_request(payload)