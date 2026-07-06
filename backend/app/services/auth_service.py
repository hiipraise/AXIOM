# app/services/auth_service.py
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _bcrypt_safe_secret(secret: str) -> str:
    # bcrypt only processes the first 72 bytes; keep hash/verify behavior consistent.
    return secret.encode("utf-8")[:72].decode("utf-8", errors="ignore")


def hash_password(password: str):
    return pwd_context.hash(_bcrypt_safe_secret(password))


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(_bcrypt_safe_secret(plain), hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_expire_minutes)
    )
    # Add unique JWT ID for revocation tracking
    to_encode.update({"jti": uuid4().hex, "exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


async def revoke_token(db, jti: str) -> None:
    """Revoke a token by its jti. Expires after 24 hours via TTL index."""
    from datetime import datetime, timedelta, timezone
    await db.revoked_tokens.insert_one({"jti": jti, "expires_at": datetime.now(timezone.utc) + timedelta(hours=24)})


async def is_token_revoked(db, jti: str) -> bool:
    """Check if a token's jti is in the revocation list."""
    revoked = await db.revoked_tokens.find_one({"jti": jti})
    return revoked is not None
