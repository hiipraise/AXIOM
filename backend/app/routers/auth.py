from fastapi import APIRouter, Depends, HTTPException, Response, Request
from app.database import get_db
from app.middleware.auth import get_current_user
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.models.schemas import UserCreate, UserLogin, PasswordChange, RecoverAccount
from app.config import settings
from datetime import datetime, timezone
import os, re

router = APIRouter()

COOKIE_NAME    = "axiom_token"
COOKIE_MAX_AGE = settings.jwt_expire_minutes * 60
IS_PROD        = os.getenv("ENV", "development").lower() == "production"


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
        "role":                 u.get("role", "user"),
        "must_change_password": u.get("must_change_password", False),
        "created_at":           u.get("created_at", datetime.now(timezone.utc)),
        "is_active":            u.get("is_active", True),
    }


@router.post("/register")
async def register(body: UserCreate, response: Response, db=Depends(get_db)):
    if not re.match(r"^[a-zA-Z0-9_\-]+$", body.username):
        raise HTTPException(400, "Username may only contain letters, numbers, underscores, and hyphens")
    if await db.users.find_one({"username": {"$regex": f"^{re.escape(body.username)}$", "$options": "i"}}):
        raise HTTPException(400, "Username already taken")
    if body.email and await db.users.find_one({"email": body.email}):
        raise HTTPException(400, "Email already registered")

    user_doc = {
        "username": body.username, "email": body.email,
        "password_hash": hash_password(body.password),
        "role": "user", "must_change_password": False,
        "created_at": datetime.now(timezone.utc),
        "secret_question": body.secret_question,
        "secret_answer_hash": hash_password(body.secret_answer) if body.secret_answer else None,
        "is_active": True,
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    token = create_access_token({"sub": str(result.inserted_id)})
    set_auth_cookie(response, token)
    # Return token in body — mobile Bearer fallback
    return {"user": serialize_user(user_doc), "token": token}


@router.post("/login")
async def login(body: UserLogin, response: Response, db=Depends(get_db)):
    user = await db.users.find_one({"username": {"$regex": f"^{re.escape(body.username)}$", "$options": "i"}})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    if not user.get("is_active"):
        raise HTTPException(403, "Account deactivated")
    token = create_access_token({"sub": str(user["_id"])})
    set_auth_cookie(response, token)
    # Return token in body — mobile Bearer fallback
    return {"user": serialize_user(user), "token": token}


@router.post("/logout")
async def logout(response: Response):
    clear_auth_cookie(response)
    return {"message": "Logged out"}


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return serialize_user(current_user)


@router.put("/change-password")
async def change_password(body: PasswordChange, current_user=Depends(get_current_user), db=Depends(get_db)):
    if not verify_password(body.old_password, current_user["password_hash"]):
        raise HTTPException(400, "Current password is incorrect")
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password_hash": hash_password(body.new_password), "must_change_password": False}},
    )
    return {"message": "Password updated"}


@router.put("/update-profile")
async def update_profile(body: dict, current_user=Depends(get_current_user), db=Depends(get_db)):
    allowed = {}
    if "email"           in body: allowed["email"]               = body["email"]
    if "secret_question" in body: allowed["secret_question"]     = body["secret_question"]
    if "secret_answer"   in body and body["secret_answer"]:
        allowed["secret_answer_hash"] = hash_password(body["secret_answer"])
    if allowed:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": allowed})
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return serialize_user(updated)


@router.post("/forgot-username")
async def forgot_username(body: dict, db=Depends(get_db)):
    email = body.get("email")
    if not email:
        raise HTTPException(400, "Email required")
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "If that email is registered, a username hint was returned.", "username": None}
    return {"message": "Username found", "username": user["username"]}


@router.post("/recover-account")
async def recover_account(body: RecoverAccount, db=Depends(get_db)):
    user = await db.users.find_one({"username": {"$regex": f"^{re.escape(body.username)}$", "$options": "i"}})
    if not user:
        raise HTTPException(404, "User not found")
    if not user.get("secret_answer_hash"):
        raise HTTPException(400, "No secret question set for this account")
    if not verify_password(body.secret_answer, user["secret_answer_hash"]):
        raise HTTPException(400, "Incorrect answer")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"message": "Password reset successfully"}


@router.delete("/delete-account")
async def delete_account(response: Response, current_user=Depends(get_current_user), db=Depends(get_db)):
    user_id = current_user["_id"]
    cvs     = await db.cvs.find({"owner_id": str(user_id)}).to_list(None)
    cv_ids  = [str(c["_id"]) for c in cvs]
    if cv_ids:
        await db.cv_history.delete_many({"cv_id": {"$in": cv_ids}})
    await db.cvs.delete_many({"owner_id": str(user_id)})
    await db.ratings.delete_many({"owner_id": str(user_id)})
    await db.users.delete_one({"_id": user_id})
    clear_auth_cookie(response)
    return {"message": "Account and all data permanently deleted"}