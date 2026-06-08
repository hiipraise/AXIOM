from __future__ import annotations

from datetime import datetime, timedelta, timezone


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def create_notification(db, user_id: str, title: str, body: str = "", kind: str = "general", link: str = "") -> None:
    now = _utcnow()
    await db.notifications.insert_one(
        {
            "user_id": user_id,
            "title": title,
            "body": body,
            "kind": kind,
            "link": link,
            "read": False,
            "created_at": now,
            "expires_at": now + timedelta(days=30),
        }
    )
