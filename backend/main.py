import os
import sys
import logging

# ── Windows: switch to ProactorEventLoop before any asyncio usage ─────────────
if sys.platform == "win32":
    import asyncio as _asyncio
    _policy = getattr(_asyncio, "WindowsProactorEventLoopPolicy", None)
    if _policy is not None:
        _asyncio.set_event_loop_policy(_policy())

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger(__name__)

from app.config import settings
from app.database import connect_db, close_db, init_admin, ping_db
from app.limiter import limiter
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routers import (
    admin,
    analytics,
    announcements,
    auth,
    comments,
    cv,
    email,
    export,
    feedback,
    interview,
    jobs,
    notifications,
    public,
    search,
)

async def _cleanup_orphaned_recordings() -> None:
    """Delete recording files on disk that no longer have a DB record."""
    from app.database import db

    media_root = os.path.join(settings.media_dir, "interviews")
    if not os.path.isdir(media_root):
        return
    for user_dir in os.listdir(media_root):
        user_path = os.path.join(media_root, user_dir)
        if not os.path.isdir(user_path):
            continue
        for fname in os.listdir(user_path):
            file_path = os.path.join(user_path, fname)
            if not os.path.isfile(file_path):
                continue
            exists = await db.interview_recordings.find_one({"file_name": fname})
            if not exists:
                try:
                    os.remove(file_path)
                except OSError:
                    pass


def _enforce_production_cors() -> None:
    """Fail fast if CORS misconfiguration detected (wildcard in prod)."""
    origins = settings.origins_list
    if "*" in origins:
        raise ValueError(
            "CORS wildcard '*' detected in production. "
            "Set ALLOWED_ORIGINS to explicit origins (e.g., 'https://axiomcv.site,https://www.axiomcv.site')."
        )
    # Validate production origins contain expected domain
    if settings.is_production:
        prod_origins = [o for o in origins if not o.startswith("http://localhost")]
        if not prod_origins:
            raise ValueError(
                "CORS has no production origins configured. "
                "Set ALLOWED_ORIGINS to include your production domain."
            )


def _enforce_production_secrets() -> None:
    """Fail fast if critical secrets are absent in a production environment."""
    _enforce_production_cors()
    if not settings.is_production:
        return

    required = {
        "JWT_SECRET":     os.getenv("JWT_SECRET"),
        "MONGO_URL":      os.getenv("MONGO_URL"),
        "ADMIN_PASSWORD": os.getenv("ADMIN_PASSWORD"),
        "GROQ_API_KEY":   os.getenv("GROQ_API_KEY"),
    }
    missing = [name for name, value in required.items() if not value]

    if missing:
        raise RuntimeError(
            f"AXIOM refuses to start in production with missing secrets: "
            f"{', '.join(missing)}. Set them as environment variables."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _enforce_production_secrets()
    await connect_db()
    await init_admin()
    await _cleanup_orphaned_recordings()
    yield
    await close_db()


app = FastAPI(
    title="AXIOM CV Generator API",
    description="AI-powered CV/Resume generator — truthful, ATS-safe, zero cliché.",
    version="1.0.0",
    lifespan=lifespan,
)

if settings.is_production:
    app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# ── Rate limiting ──────────────────────────────────────────────────────────────
app.state.limiter = limiter


# ── Request logging middleware ──────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log each request at INFO level with method, path, status, duration."""
    import time
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "request completed",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(duration_ms, 2),
        },
    )
    return response


# ── Rate limit exceeded handler ───────────────────────────────────────────
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: Exception):
    """Log rate limit hits at WARNING level."""
    logger.warning(
        "rate limit exceeded",
        extra={
            "path": request.url.path,
            "method": request.method,
            "client_ip": request.client.host if request.client else "unknown",
        },
    )
    return await _rate_limit_exceeded_handler(request, exc)


# ── Global exception handler ───────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Convert unhandled exceptions to 500 responses with generic message but logged traceback."""
    logger.error(
        "unhandled exception",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_type": type(exc).__name__,
        },
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )


# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=settings.credentials_allowed,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router,               prefix="/api/v1/auth",                tags=["Auth"])
app.include_router(cv.router,                 prefix="/api/v1/cv",                  tags=["CV"])
app.include_router(export.router,             prefix="/api/v1/export",              tags=["Export"])
app.include_router(admin.router,              prefix="/api/v1/admin",               tags=["Admin"])
app.include_router(public.router,             prefix="/api/v1/public",              tags=["Public"])
app.include_router(analytics.router,          prefix="/api/v1/analytics",           tags=["Analytics"])
app.include_router(feedback.router,           prefix="/api/v1/feedback",            tags=["Feedback"])
app.include_router(announcements.router,      prefix="/api/v1/announcements",       tags=["Announcements"])
app.include_router(jobs.router,               prefix="/api/v1/jobs",                tags=["Jobs"])
app.include_router(interview.router,          prefix="/api/v1/interview",           tags=["Interview"])

app.include_router(notifications.router,      prefix="/api/v1/notifications",       tags=["Notifications"])
app.include_router(email.router,              prefix="/api/v1/email",               tags=["Email"])
app.include_router(search.router,             prefix="/api/v1/search",             tags=["Search"])
app.include_router(comments.router,            prefix="/api/v1/cv",                  tags=["CV Comments"])


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "AXIOM CV Generator API",
        "version": "1.0.0",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health", tags=["Root"])
async def health():
    db_ok = await ping_db()
    if not db_ok:
        raise service_unavailable("Database connection failed")
    return {"status": "ok", "service": "AXIOM API"}
