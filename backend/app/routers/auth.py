from fastapi import APIRouter, Depends, HTTPException, Response, Request
from starlette.responses import StreamingResponse
from app.database import get_db
from app.limiter import limiter
from app.middleware.auth import get_current_user
from app.utils.errors import not_found, forbidden, bad_request, unauthorized
from app.services.auth_service import hash_password, verify_password, create_access_token, decode_token, revoke_token
from app.services.oauth_service import is_provider_configured, generate_state, get_authorization_url, exchange_code, get_user_info
from app.models.schemas import UserCreate, UserLogin, PasswordChange, RecoverAccount, ProfileUpdate, RoadmapStepComplete, CVData, RegisterWithCV
from app.config import settings
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import Any, Optional
from starlette.responses import RedirectResponse
import os, re, json, io
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

COOKIE_NAME      = "axiom_token"
COOKIE_MAX_AGE   = settings.jwt_expire_minutes * 60
IS_PROD          = os.getenv("ENV", "development").lower() == "production"

# Mobile clients send this header to receive the token in the response body.
# Browser clients omit it — the HttpOnly cookie is their only transport.
_BEARER_REQUEST_HEADER = "X-Return-Token"


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME, value=token, max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=IS_PROD,
        samesite="none" if IS_PROD else "lax",
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=COOKIE_NAME, path="/",
        secure=IS_PROD,
        samesite="none" if IS_PROD else "lax",
    )


def serialize_user(u: dict) -> dict:
    return {
        "id":                   str(u["_id"]),
        "username":             u["username"],
        "email":                u.get("email"),
        "email_notifications":  u.get("email_notifications", False),
        "role":                 u.get("role", "user"),
        "must_change_password": u.get("must_change_password", False),
        "created_at":           u.get("created_at", datetime.now(timezone.utc)),
        "is_active":            u.get("is_active", True),
        "is_first_login":       u.get("is_first_login", False),
        "oauth_provider":       u.get("oauth_provider"),
        "has_password":         u.get("password_hash") is not None,
    }


def _auth_response(request: Request, user: dict, token: str) -> dict:
    """Build the login/register response body.

    The token is included only when the caller sends `X-Return-Token: true`,
    signalling a mobile / non-cookie client. Browser clients rely solely on
    the HttpOnly cookie set before this is called and never see the raw JWT.
    """
    wants_bearer = request.headers.get(_BEARER_REQUEST_HEADER, "").lower() == "true"
    payload: dict = {"user": serialize_user(user)}
    if wants_bearer:
        payload["token"] = token
    return payload


@router.post("/register")
@limiter.limit("5/minute")
async def register(request: Request, body: UserCreate, response: Response, db=Depends(get_db)):
    body.username = body.username.strip()
    if not re.match(r"^[a-zA-Z0-9_\-]+$", body.username):
        raise bad_request("Username may only contain letters, numbers, underscores, and hyphens")
    if await db.users.find_one({"username": {"$regex": f"^{re.escape(body.username)}$", "$options": "i"}}):
        raise bad_request("Username already taken")
    if body.email and await db.users.find_one({"email": body.email}):
        raise bad_request("Email already registered")

    user_doc = {
        "username":           body.username,
        "email":              body.email,
        "password_hash":      hash_password(body.password),
        "role":               "user",
        "must_change_password": False,
        "created_at":         datetime.now(timezone.utc),
        "secret_question":    body.secret_question,
        "secret_answer_hash": hash_password(body.secret_answer) if body.secret_answer else None,
        "email_notifications": bool(body.email),
        "is_active":          True,
        "is_first_login":     True,
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    token = create_access_token({"sub": str(result.inserted_id)})
    set_auth_cookie(response, token)
    return _auth_response(request, user_doc, token)


@router.post("/register-with-cv")
@limiter.limit("5/minute")
async def register_with_cv(request: Request, body: RegisterWithCV, response: Response, db=Depends(get_db)):
    """Register a new user and import their guest CV data."""
    body.username = body.username.strip()
    if not re.match(r"^[a-zA-Z0-9_\-]+$", body.username):
        raise bad_request("Username may only contain letters, numbers, underscores, and hyphens")
    if await db.users.find_one({"username": {"$regex": f"^{re.escape(body.username)}$", "$options": "i"}}):
        raise bad_request("Username already taken")
    if body.email and await db.users.find_one({"email": body.email}):
        raise bad_request("Email already registered")

    user_doc = {
        "username":           body.username,
        "email":              body.email,
        "password_hash":      hash_password(body.password),
        "role":               "user",
        "must_change_password": False,
        "created_at":         datetime.now(timezone.utc),
        "secret_question":    body.secret_question,
        "secret_answer_hash": hash_password(body.secret_answer) if body.secret_answer else None,
        "email_notifications": bool(body.email),
        "is_active":          True,
        "is_first_login":     False,  # Skip onboarding since they already have a CV
    }
    result = await db.users.insert_one(user_doc)
    user_id = result.inserted_id

    # Create the CV from guest data
    try:
        cv_payload = {
            "owner_id": str(user_id),
            "owner_username": body.username,
            "title": body.cv_title or "My CV",
            "data": body.cv_data,
            "is_public": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        cv_result = await db.cvs.insert_one(cv_payload)
        cv_id = cv_result.inserted_id
    except Exception as e:
        logger.warning(f"Failed to create CV during register-with-cv: {e}")
        cv_id = None

    token = create_access_token({"sub": str(user_id)})
    set_auth_cookie(response, token)
    user_doc["_id"] = user_id
    return _auth_response(request, user_doc, token)


@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, body: UserLogin, response: Response, db=Depends(get_db)):
    login_value = body.username.strip()
    # Try username first, then email
    user = await db.users.find_one({"username": {"$regex": f"^{re.escape(login_value)}$", "$options": "i"}})
    if not user:
        user = await db.users.find_one({"email": {"$regex": f"^{re.escape(login_value)}$", "$options": "i"}})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.security_events.insert_one({
            "type": "failed_login",
            "username": login_value,
            "ip": request.client.host if request.client else None,
            "ts": datetime.now(timezone.utc),
        })
        logger.warning(
            "failed login attempt",
            extra={
                "username": login_value,
                "ip": request.client.host if request.client else None,
            },
        )
        raise unauthorized("Invalid credentials")
    if not user.get("is_active"):
        raise forbidden("Account deactivated")
    token = create_access_token({"sub": str(user["_id"])})
    set_auth_cookie(response, token)
    return _auth_response(request, user, token)


@router.post("/logout")
async def logout(request: Request, response: Response, db=Depends(get_db)):
    # Extract Bearer token from header and revoke it
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        payload = decode_token(token)
        if payload and payload.get("jti"):
            await revoke_token(db, payload["jti"])
    clear_auth_cookie(response)
    return {"message": "Logged out"}


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return serialize_user(current_user)


@router.put("/change-password")
async def change_password(body: PasswordChange, current_user=Depends(get_current_user), db=Depends(get_db)):
    if not verify_password(body.old_password, current_user["password_hash"]):
        raise bad_request("Current password is incorrect")
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password_hash": hash_password(body.new_password), "must_change_password": False}},
    )
    return {"message": "Password updated"}


@router.put("/update-profile")
async def update_profile(body: ProfileUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    allowed = {}
    if body.email is not None:
        if body.email_notifications and not body.email and not current_user.get("email"):
            raise bad_request("Email notifications require an email address")
        allowed["email"] = body.email
    if body.email_notifications is not None:
        allowed["email_notifications"] = body.email_notifications
    if allowed:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": allowed})
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return serialize_user(updated)


@router.post("/forgot-username")
@limiter.limit("5/minute")
async def forgot_username(request: Request, body: ProfileUpdate, db=Depends(get_db)):
    email = body.email
    if not email:
        raise bad_request("Email required")
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "If that email is registered, a username hint was returned.", "username": None}
    return {"message": "Username found", "username": user["username"]}


@router.post("/recover-account")
@limiter.limit("5/minute")
async def recover_account(request: Request, body: RecoverAccount, db=Depends(get_db)):
    user = await db.users.find_one({"username": {"$regex": f"^{re.escape(body.username)}$", "$options": "i"}})
    if not user:
        raise not_found("User")
    if not user.get("secret_answer_hash"):
        raise bad_request("No secret question set for this account")
    if not verify_password(body.secret_answer, user["secret_answer_hash"]):
        raise bad_request("Incorrect answer")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"message": "Password reset successfully"}


@router.get("/download-my-data")
async def download_my_data(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Export all user data as JSON (GDPR data export)."""
    user_id = current_user["_id"]
    uid_str = str(user_id)

    # Collect user profile
    user_doc = await db.users.find_one({"_id": user_id}, {"password_hash": 0, "secret_answer_hash": 0})
    user_data = {k: v for k, v in user_doc.items() if k != "_id"} if user_doc else {}
    if user_data.get("_id"):
        user_data["_id"] = str(user_data["_id"])

    # Collect CVs
    cvs = await db.cvs.find({"owner_id": uid_str}).to_list(None)
    cv_list = []
    for cv in cvs:
        cv_doc = {k: v for k, v in cv.items() if k not in ("_id", "owner_id", "owner_username")}
        if cv_doc:
            cv_doc["id"] = str(cv["_id"])
            cv_list.append(cv_doc)

    # Collect saved jobs
    saved_jobs = await db.saved_jobs.find({"user_id": uid_str}).to_list(None)
    saved_jobs_list = [
        {k: v for k, v in s.items() if k not in ("_id", "user_id")}
        | {"id": str(s["_id"])} for s in saved_jobs
    ]

    # Collect notifications
    notifications = await db.notifications.find({"user_id": uid_str}).to_list(None)
    notifications_list = [
        {k: v for k, v in n.items() if k not in ("_id", "user_id")}
        | {"id": str(n["_id"])} for n in notifications
    ]

    # Collect feedback
    feedback = await db.feedback.find({"user_id": uid_str}).to_list(None)
    feedback_list = [
        {k: v for k, v in f.items() if k not in ("_id", "user_id")}
        | {"id": str(f["_id"])} for f in feedback
    ]

    # Compile export
    export_data = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": user_data,
        "cvs": cv_list,
        "saved_jobs": saved_jobs_list,
        "notifications": notifications_list,
        "feedback": feedback_list,
    }

    json_bytes = json.dumps(export_data, indent=2, default=str).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="my-axiom-data.json"',
            "Content-Length": str(len(json_bytes)),
        },
    )


@router.delete("/delete-account")
async def delete_account(response: Response, current_user=Depends(get_current_user), db=Depends(get_db)):
    user_id = current_user["_id"]
    uid_str = str(user_id)

    # CV history must be deleted before CVs (references cv_id)
    cvs    = await db.cvs.find({"owner_id": uid_str}, {"_id": 1}).to_list(None)
    cv_ids = [str(c["_id"]) for c in cvs]
    if cv_ids:
        await db.cv_history.delete_many({"cv_id": {"$in": cv_ids}})
    await db.cvs.delete_many({"owner_id": uid_str})

    # All other user-scoped collections
    await db.saved_jobs.delete_many({"user_id": uid_str})
    await db.notifications.delete_many({"user_id": uid_str})
    await db.ratings.delete_many({"owner_id": uid_str})
    await db.interview_sessions.delete_many({"user_id": uid_str})
    await db.interview_messages.delete_many({"user_id": uid_str})
    await db.feedback.delete_many({"user_id": uid_str})
    await db.page_events.delete_many({"user_id": uid_str})

    await db.users.delete_one({"_id": user_id})
    clear_auth_cookie(response)
    return {"message": "Account and all data permanently deleted"}


class SetPassword(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=72)


class OnboardingComplete(BaseModel):
    job_title: Optional[str] = Field(None, max_length=160)
    industry: Optional[str] = Field(None, max_length=100)
    full_name: Optional[str] = Field(None, max_length=120)


# ── OAuth ─────────────────────────────────────────────────────────────────


@router.get("/oauth/providers")
async def oauth_providers():
    """Return list of OAuth providers that have credentials configured."""
    configured = []
    for provider in ("google", "linkedin"):
        if is_provider_configured(provider):
            configured.append(provider)
    return {"providers": configured}


@router.get("/oauth/{provider}")
@limiter.limit("20/minute")
async def oauth_init(provider: str, request: Request, db=Depends(get_db)):
    """Initiate OAuth login flow. Returns the provider's authorization URL."""
    if provider not in ("google", "linkedin"):
        raise bad_request("Unsupported provider. Use 'google' or 'linkedin'.")
    if not is_provider_configured(provider):
        raise bad_request(f"{provider.title()} OAuth is not configured. Ask the admin to set it up.")

    state = generate_state()
    # Store state with 5-minute TTL
    now = datetime.now(timezone.utc)
    await db.oauth_states.insert_one({
        "state": state,
        "provider": provider,
        "created_at": now,
        "expires_at": now + timedelta(minutes=5),
    })

    redirect_uri = str(request.base_url).rstrip("/") + f"/api/v1/auth/oauth/{provider}/callback"
    auth_url = get_authorization_url(provider, state, redirect_uri)
    return {"url": auth_url}


@router.get("/oauth/{provider}/callback")
@limiter.limit("20/minute")
async def oauth_callback(provider: str, code: str, state: str, request: Request, db=Depends(get_db)):
    """Handle OAuth provider callback — exchange code, find/create user, redirect to frontend."""
    if provider not in ("google", "linkedin"):
        raise bad_request("Unsupported provider")

    # Verify state token (CSRF protection)
    stored = await db.oauth_states.find_one({"state": state, "provider": provider})
    if not stored:
        logger.warning(f"OAuth state mismatch or expired for {provider}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=session_expired")
    await db.oauth_states.delete_one({"_id": stored["_id"]})

    # Exchange authorization code for access token
    redirect_uri = str(request.base_url).rstrip("/") + f"/api/v1/auth/oauth/{provider}/callback"
    token_data = await exchange_code(provider, code, redirect_uri)
    if not token_data or "access_token" not in token_data:
        logger.warning(f"OAuth token exchange failed for {provider}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=token_failed")

    access_token = token_data["access_token"]

    # Fetch user info from provider
    user_info = await get_user_info(provider, access_token)
    if not user_info:
        logger.warning(f"OAuth user info fetch failed for {provider}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=userinfo_failed")

    email = user_info.get("email", "")
    if not email:
        logger.warning(f"OAuth {provider} returned no email for user")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=no_email")

    name = user_info.get("name", "") or user_info.get("given_name", "")
    oauth_id = user_info.get("sub", "")

    # Find existing user by email or create one
    user = await db.users.find_one({"email": email})

    if not user:
        # Derive a sane username from email prefix
        base_username = re.sub(r"[^a-zA-Z0-9_\-]", "", email.split("@")[0][:20])
        if not base_username:
            base_username = f"user{oauth_id[:8]}" if oauth_id else f"user{secrets.token_hex(4)}"
        username = base_username
        counter = 1
        while await db.users.find_one({"username": username}):
            username = f"{base_username}{counter}"
            counter += 1

        now = datetime.now(timezone.utc)
        user_doc = {
            "username": username,
            "email": email,
            "password_hash": None,  # OAuth users have no password
            "role": "user",
            "must_change_password": False,
            "created_at": now,
            "oauth_provider": provider,
            "oauth_id": oauth_id,
            "email_notifications": True,
            "is_active": True,
            "is_first_login": True,
        }
        result = await db.users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        user = user_doc
        logger.info(f"New OAuth user created via {provider}: {username} ({email})")
    else:
        # Update OAuth metadata on existing account
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"oauth_provider": provider, "oauth_id": oauth_id}},
        )
        user = await db.users.find_one({"_id": user["_id"]})

    # Create JWT and redirect to frontend with token
    token = create_access_token({"sub": str(user["_id"])})
    redirect_url = f"{settings.frontend_url}/oauth/callback?token={token}"
    return RedirectResponse(url=redirect_url)


@router.post("/set-password")
@limiter.limit("5/minute")
async def set_password(body: SetPassword, request: Request, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Set a password for OAuth users who signed up via Google/LinkedIn."""
    if current_user.get("password_hash") is not None:
        raise bad_request("You already have a password. Use 'change password' instead.")
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password_hash": hash_password(body.new_password)}},
    )
    return {"message": "Password set successfully"}


@router.post("/onboarding-complete")
async def complete_onboarding(body: OnboardingComplete, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Mark first-time onboarding as complete and store collected info."""
    updates: dict[str, Any] = {"is_first_login": False}
    if body.job_title:
        updates["onboarding_job_title"] = body.job_title
    if body.industry:
        updates["onboarding_industry"] = body.industry
    if body.full_name:
        updates["onboarding_full_name"] = body.full_name

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": updates}
    )
    return {"message": "Onboarding completed"}


@router.get("/roadmap-progress")
async def get_roadmap_progress(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Get user's roadmap progress."""
    user = await db.users.find_one({"_id": current_user["_id"]})
    return {"roadmap_progress": user.get("roadmap_progress", [])}


@router.post("/roadmap-progress")
async def update_roadmap_progress(body: RoadmapStepComplete, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Mark a roadmap step as complete."""
    from datetime import datetime, timezone
    new_item = {"step_id": body.step_id, "completed_at": datetime.now(timezone.utc)}
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$push": {"roadmap_progress": new_item},
            "$set": {"is_first_login": False}
        }
    )
    return {"message": "Step completed", "item": new_item}
