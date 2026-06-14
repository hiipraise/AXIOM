from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request
from typing import Optional


def get_user_key(request: Request) -> Optional[str]:
    """Rate limit key: user ID from JWT if authenticated, otherwise IP."""
    # Try to get user ID from JWT claims in Authorization header
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        # Decode without verification - we just need the user ID for rate limiting
        # The actual JWT validation happens in the auth middleware
        try:
            import jwt
            token = auth_header[7:]  # Strip "Bearer "
            # Get user ID from token without strict verification
            decoded = jwt.decode(token, options={"verify_signature": False})
            user_id = decoded.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass
    # Fall back to IP address
    return get_remote_address(request)


limiter = Limiter(key_func=get_user_key)

# Default limits
DEFAULT_LIMIT = "100/minute"
AUTH_LIMIT = "5/minute"
AI_LIMIT = "20/minute"