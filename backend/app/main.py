from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .config import settings
from .db.session import get_engine


app = FastAPI(title="AI Viva Backend", version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .api_auth import router as auth_router
from .api_viva import router as viva_router
app.include_router(auth_router)
app.include_router(viva_router)

@app.get("/health/live")
def health_live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
def health_ready() -> dict[str, str]:
    try:
        with get_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database is not ready: {exc}") from exc
    return {"status": "ok"}


@app.get("/api/version")
def api_version() -> dict[str, str]:
    return {"version": settings.app_version}
