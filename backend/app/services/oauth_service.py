"""
OAuth service — Google and LinkedIn OAuth 2.0 helpers.

Uses httpx (already installed) for all provider API calls.
"""

from urllib.parse import urlencode
import secrets
import httpx
from app.config import settings


# ─── Provider configurations ─────────────────────────────────────────────────

OAUTH_PROVIDERS: dict[str, dict] = {
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scopes": "openid email profile",
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
    },
    "linkedin": {
        "authorize_url": "https://www.linkedin.com/oauth/v2/authorization",
        "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
        "userinfo_url": "https://api.linkedin.com/v2/userinfo",
        "scopes": "openid email profile",
        "client_id": settings.linkedin_client_id,
        "client_secret": settings.linkedin_client_secret,
    },
}


def is_provider_configured(provider: str) -> bool:
    """Check if a provider's OAuth credentials are configured."""
    cfg = OAUTH_PROVIDERS.get(provider)
    if not cfg:
        return False
    return bool(cfg["client_id"] and cfg["client_secret"])


def generate_state() -> str:
    """Generate a cryptographically secure state parameter for CSRF protection."""
    return secrets.token_urlsafe(32)


def get_authorization_url(provider: str, state: str, redirect_uri: str) -> str:
    """Build the OAuth authorization URL for a provider."""
    cfg = OAUTH_PROVIDERS[provider]
    params = {
        "client_id": cfg["client_id"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": cfg["scopes"],
        "state": state,
        "access_type": "offline" if provider == "google" else "",
        "prompt": "consent" if provider == "google" else "",
    }
    # Remove empty values
    params = {k: v for k, v in params.items() if v}
    return f"{cfg['authorize_url']}?{urlencode(params)}"


async def exchange_code(provider: str, code: str, redirect_uri: str) -> dict | None:
    """Exchange an authorization code for an access token."""
    cfg = OAUTH_PROVIDERS[provider]
    data = {
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(cfg["token_url"], data=data)
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None


async def get_user_info(provider: str, access_token: str) -> dict | None:
    """Fetch user info (email, name) from the provider."""
    cfg = OAUTH_PROVIDERS[provider]
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(cfg["userinfo_url"], headers=headers)
            resp.raise_for_status()
            data = resp.json()

            # Normalize response to standard fields
            if provider == "google":
                return {
                    "sub": data.get("id", ""),
                    "email": data.get("email", ""),
                    "name": data.get("name", ""),
                    "given_name": data.get("given_name", ""),
                    "family_name": data.get("family_name", ""),
                }
            elif provider == "linkedin":
                return {
                    "sub": data.get("sub", ""),
                    "email": data.get("email", ""),
                    "name": data.get("name", ""),
                    "given_name": data.get("given_name", ""),
                    "family_name": data.get("family_name", ""),
                }
            return data
        except Exception:
            return None
