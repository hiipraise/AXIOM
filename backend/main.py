from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import connect_db, close_db, init_admin
from app.routers import auth, cv, export, admin, public


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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(cv.router, prefix="/api/cv", tags=["CV"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(public.router, prefix="/api/public", tags=["Public"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "AXIOM API"}
