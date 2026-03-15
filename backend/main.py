from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

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

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Set ALLOWED_ORIGINS in .env as a comma-separated list:
#   ALLOWED_ORIGINS=http://localhost:5173,https://axiom.cv
# Leave unset or set to * to allow all origins (dev only — breaks credentials).
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
if _raw_origins.strip() == "*" or _raw_origins.strip() == "":
    # allow_credentials=True is incompatible with allow_origins=["*"] in browsers,
    # so we must use allow_origins=["*"] only when credentials are NOT needed,
    # or fall back to a safe dev default.
    _origins     = ["*"]
    _credentials = False   # credentials won't work with wildcard anyway
else:
    _origins     = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    _credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router,          prefix="/api/auth",          tags=["Auth"])
app.include_router(cv.router,            prefix="/api/cv",            tags=["CV"])
app.include_router(export.router,        prefix="/api/export",        tags=["Export"])
app.include_router(admin.router,         prefix="/api/admin",         tags=["Admin"])
app.include_router(public.router,        prefix="/api/public",        tags=["Public"])
app.include_router(analytics.router,     prefix="/api/analytics",     tags=["Analytics"])
app.include_router(feedback.router,      prefix="/api/feedback",      tags=["Feedback"])
app.include_router(announcements.router, prefix="/api/announcements", tags=["Announcements"])


# ─── Root ─────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "AXIOM CV Generator API",
        "version": "1.0.0",
        "status":  "ok",
        "docs":    "/docs",
    }


@app.get("/health", tags=["Root"])
async def health():
    return {"status": "ok", "service": "AXIOM API"}