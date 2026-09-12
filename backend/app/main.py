from fastapi import FastAPI, HTTPException
from sqlalchemy import text

from .config import settings
from .db.session import get_engine


app = FastAPI(title="AI Viva Backend", version=settings.app_version)

from .api_auth import router as auth_router
app.include_router(auth_router)

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
