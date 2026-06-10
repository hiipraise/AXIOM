import os
import sys

# ── Windows: switch to ProactorEventLoop before any asyncio usage ─────────────
if sys.platform == "win32":
    import asyncio as _asyncio
    _policy = getattr(_asyncio, "WindowsProactorEventLoopPolicy", None)
    if _policy is not None:
        _asyncio.set_event_loop_policy(_policy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import connect_db, close_db, init_admin
from app.limiter import limiter
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routers import (
    admin,
    analytics,
    announcements,
    auth,
    axiom_applications,
    axiom_jobs,
    cv,
    export,
    feedback,
    interview,
    interview_live,
    jobs,
    notifications,
    public,
    recruiter,
)


def _enforce_production_secrets() -> None:
    """Fail fast if critical secrets are absent in a production environment."""
    if not settings.is_production:
        return

    required = {
        "JWT_SECRET":     os.getenv("JWT_SECRET"),
        "MONGO_URL":      os.getenv("MONGO_URL"),
       # "ADMIN_PASSWORD": os.getenv("ADMIN_PASSWORD"),
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
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=settings.credentials_allowed,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router,               prefix="/api/auth",                tags=["Auth"])
app.include_router(cv.router,                 prefix="/api/cv",                  tags=["CV"])
app.include_router(export.router,             prefix="/api/export",              tags=["Export"])
app.include_router(admin.router,              prefix="/api/admin",               tags=["Admin"])
app.include_router(public.router,             prefix="/api/public",              tags=["Public"])
app.include_router(analytics.router,          prefix="/api/analytics",           tags=["Analytics"])
app.include_router(feedback.router,           prefix="/api/feedback",            tags=["Feedback"])
app.include_router(announcements.router,      prefix="/api/announcements",       tags=["Announcements"])
app.include_router(jobs.router,               prefix="/api/jobs",                tags=["Jobs"])
app.include_router(interview.router,          prefix="/api/interview",           tags=["Interview"])
app.include_router(recruiter.router,          prefix="/api/recruiter",           tags=["Recruiter"])
app.include_router(axiom_jobs.router,         prefix="/api/axiom-jobs",          tags=["AXIOM Jobs"])
app.include_router(axiom_applications.router, prefix="/api/axiom-applications",  tags=["AXIOM Applications"])
app.include_router(interview_live.router,     prefix="/api/interview-live",      tags=["Live Interview"])
app.include_router(notifications.router,      prefix="/api/notifications",       tags=["Notifications"])


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
    return {"status": "ok", "service": "AXIOM API"}
