import sys

# ── Windows: switch to ProactorEventLoop before any asyncio usage ─────────────
# SelectorEventLoop (Windows default) does not support create_subprocess_exec,
# which Playwright needs to launch Chromium.
# WindowsProactorEventLoopPolicy only exists on Windows; use getattr so this
# file type-checks cleanly on Linux/macOS too.
if sys.platform == "win32":
    import asyncio as _asyncio
    _policy = getattr(_asyncio, "WindowsProactorEventLoopPolicy", None)
    if _policy is not None:
        _asyncio.set_event_loop_policy(_policy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import connect_db, close_db, init_admin
from app.routers import auth, cv, export, admin, public, analytics, feedback, announcements


@asynccontextmanager
async def lifespan(app: FastAPI):
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=settings.credentials_allowed,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/api/auth",          tags=["Auth"])
app.include_router(cv.router,            prefix="/api/cv",            tags=["CV"])
app.include_router(export.router,        prefix="/api/export",        tags=["Export"])
app.include_router(admin.router,         prefix="/api/admin",         tags=["Admin"])
app.include_router(public.router,        prefix="/api/public",        tags=["Public"])
app.include_router(analytics.router,     prefix="/api/analytics",     tags=["Analytics"])
app.include_router(feedback.router,      prefix="/api/feedback",      tags=["Feedback"])
app.include_router(announcements.router, prefix="/api/announcements", tags=["Announcements"])


@app.get("/", tags=["Root"])
async def root():
    return {"service": "AXIOM CV Generator API", "version": "1.0.0",
            "status": "ok", "docs": "/docs"}


@app.get("/health", tags=["Root"])
async def health():
    return {"status": "ok", "service": "AXIOM API"}