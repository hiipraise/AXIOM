from __future__ import annotations

import asyncio
from bson import ObjectId
from datetime import datetime, timedelta, timezone
from app.services.email_service import send_email
from app.config import settings
import logging
import json

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _is_quiet_hours(quiet_hours: dict | None) -> bool:
    """Check if current UTC time falls within quiet hours."""
    if not quiet_hours or not quiet_hours.get("enabled"):
        return False
    now = _utcnow()
    current_minutes = now.hour * 60 + now.minute
    try:
        start_parts = quiet_hours.get("start", "22:00").split(":")
        end_parts = quiet_hours.get("end", "08:00").split(":")
        start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
        end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])
    except (ValueError, IndexError):
        return False
    if start_minutes <= end_minutes:
        return start_minutes <= current_minutes <= end_minutes
    # Overnight range (e.g. 22:00 - 08:00)
    return current_minutes >= start_minutes or current_minutes <= end_minutes


def _get_vapid_claims() -> dict | None:
    """Return VAPID claims dict if keys are configured, else None."""
    if not settings.vapid_public_key or not settings.vapid_private_key:
        return None
    return {
        "sub": f"mailto:{settings.vapid_claim_email}",
        "aud": "https://fcm.googleapis.com",
    }


async def _send_push_notification(db, user_id: str, title: str, body: str, link: str = "") -> None:
    """Send a web push notification to the user's registered subscription.

    Silently skips if VAPID keys are not configured or if no subscription exists.
    """
    # Check VAPID keys are configured
    vapid_claims = _get_vapid_claims()
    if not vapid_claims:
        return

    # Fetch push subscription for this user
    sub = await db.push_subscriptions.find_one({"user_id": user_id})
    if not sub:
        return

    # Check quiet hours
    try:
        prefs = await db.notification_preferences.find_one({"user_id": user_id})
        quiet_hours = (prefs or {}).get("quiet_hours")
        if _is_quiet_hours(quiet_hours):
            logger.debug(f"Quiet hours active — skipping push for {user_id}")
            return
    except Exception:
        pass

    payload = json.dumps({
        "title": title,
        "body": body,
        "tag": link if link.startswith("http") else f"{settings.frontend_url}{link}" if link else settings.frontend_url,
        "renotify": False,
    })

    try:
        from pywebpush import webpush, WebPushException

        # webpush() uses requests (synchronous) — run in thread to avoid blocking
        await asyncio.to_thread(
            webpush,
            subscription_info={
                "endpoint": sub["endpoint"],
                "keys": sub.get("keys", {}),
            },
            data=payload,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims=vapid_claims,
        )
        logger.debug(f"Push notification sent to {user_id}")
    except WebPushException as e:
        # If the subscription is expired/invalid, remove it
        if e.response and e.response.status_code in (404, 410):
            logger.info(f"Removing expired push subscription for {user_id}")
            await db.push_subscriptions.delete_one({"user_id": user_id})
        else:
            logger.warning(f"WebPush failed for {user_id}: {e}")
    except ImportError:
        logger.warning("pywebpush not installed — push notifications unavailable")
    except Exception as e:
        logger.warning(f"Unexpected push error for {user_id}: {e}")


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

    # Send push notification in parallel (fire-and-forget)
    try:
        await _send_push_notification(db, user_id, title, body, link)
    except Exception as e:
        logger.warning(f"Push notification send failed for {user_id}: {e}")

    # Check if user wants email delivery
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return

        prefs = await db.notification_preferences.find_one({"user_id": user_id})
        email_enabled = (prefs or {}).get("email_notifications", True)
        kind_enabled = ((prefs or {}).get("kinds") or {}).get(kind, True)
        email_notif_setting = user.get("email_notifications", False)

        if email_enabled and kind_enabled and email_notif_setting and user.get("email"):
            # Check quiet hours
            quiet_hours = (prefs or {}).get("quiet_hours")
            if _is_quiet_hours(quiet_hours):
                logger.debug(f"Quiet hours active — skipping email for {user_id}")
                return

            html = f"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
                <div style="background:#0a0a0a;border-radius:12px;padding:24px;color:#fff;">
                <h2 style="margin:0 0 8px;font-size:18px;">{title}</h2>
                <p style="margin:0;font-size:14px;color:#aaa;line-height:1.5;">{body}</p>
                </div>
                <p style="margin-top:12px;font-size:11px;color:#888;">
                AXIOM · {link if link else "Your career companion"}
                </p>
            </div>
            """
            try:
                send_email(
                    to=user["email"],
                    subject=f"AXIOM — {title}",
                    html=html,
                )
            except Exception as e:
                logger.warning(f"Failed to send notification email to {user.get('email')}: {e}")
    except Exception as e:
        logger.warning(f"Error in notification email delivery: {e}")
