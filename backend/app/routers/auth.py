from fastapi import APIRouter, Depends, HTTPException, Response, Request
from app.database import get_db
from app.limiter import limiter
from app.middleware.auth import get_current_user
from app.utils.errors import not_found, forbidden, bad_request, unauthorized
from app.services.auth_service import hash_password, verify_password, create_access_token, decode_token, revoke_token
from app.models.schemas import UserCreate, UserLogin, PasswordChange, RecoverAccount, ProfileUpdate, RoadmapStepComplete
from app.config import settings
from datetime import datetime, timezone
import os, re
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


@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, body: UserLogin, response: Response, db=Depends(get_db)):
    user = await db.users.find_one({"username": {"$regex": f"^{re.escape(body.username)}$", "$options": "i"}})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.security_events.insert_one({
            "type": "failed_login",
            "username": body.username,
            "ip": request.client.host if request.client else None,
            "ts": datetime.now(timezone.utc),
        })
        logger.warning(
            "failed login attempt",
            extra={
                "username": body.username,
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
    await db.applications.delete_many({"user_id": uid_str})
    await db.axiom_applications.delete_many({"candidate_id": uid_str})
    await db.notifications.delete_many({"user_id": uid_str})
    await db.ratings.delete_many({"owner_id": uid_str})
    await db.interview_sessions.delete_many({"user_id": uid_str})
    await db.interview_messages.delete_many({"user_id": uid_str})
    await db.feedback.delete_many({"user_id": uid_str})
    await db.page_events.delete_many({"user_id": uid_str})

    await db.users.delete_one({"_id": user_id})
    clear_auth_cookie(response)
    return {"message": "Account and all data permanently deleted"}


@router.post("/onboarding-complete")
async def complete_onboarding(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Mark first-time onboarding as complete."""
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"is_first_login": False}}
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
