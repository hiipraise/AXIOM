from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "geolocation=(), payment=(), usb=(), interest-cohort=()",
        )
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
        )
        return response
