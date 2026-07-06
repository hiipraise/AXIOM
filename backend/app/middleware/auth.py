import asyncio
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth_service import decode_token, is_token_revoked
from app.database import get_db
from bson import ObjectId

COOKIE_NAME = "axiom_token"
bearer      = HTTPBearer(auto_error=False)


def _extract_token(request: Request, credentials) -> str | None:
    """Cookie first, Bearer header fallback."""
    cookie = request.cookies.get(COOKIE_NAME)
    if cookie:
        return cookie
    if credentials:
        return credentials.credentials
    return None


async def _touch_last_seen(db, user_id: ObjectId) -> None:
    """Fire-and-forget: update the user's last_seen_at timestamp."""
    try:
        await db.users.update_one(
            {"_id": user_id},
            {"$set": {"last_seen_at": datetime.now(timezone.utc)}},
        )
    except Exception:
        pass


async def get_current_user(
    request:     Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db=Depends(get_db),
):
    token = _extract_token(request, credentials)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    # Check if token was revoked
    jti = payload.get("jti")
    if jti and await is_token_revoked(db, jti):
        raise HTTPException(status_code=401, detail="Token revoked")
    user_id = ObjectId(payload["sub"])
    user = await db.users.find_one({"_id": user_id})
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="User not found")

    # Record activity timestamp in the background
    asyncio.create_task(_touch_last_seen(db, user_id))

    return user


async def get_optional_user(
    request:     Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db=Depends(get_db),
):
    token = _extract_token(request, credentials)
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    # Check if token was revoked
    jti = payload.get("jti")
    if jti and await is_token_revoked(db, jti):
        return None
    user_id = ObjectId(payload["sub"])
    user = await db.users.find_one({"_id": user_id})
    if user:
        asyncio.create_task(_touch_last_seen(db, user_id))
    return user


def require_role(*roles):
    async def _check(current_user=Depends(get_current_user)):
        if current_user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return _check


require_admin = require_role("admin", "superadmin")
require_staff = require_role("staff", "admin", "superadmin")