import time
import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import settings

router = APIRouter(tags=["Health & Metadata"])

SERVER_START_TIME = time.time()

@router.get("/health")
def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "uptime_seconds": round(time.time() - SERVER_START_TIME, 2),
    }

@router.get("/ready")
def ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1;"))
        db_status = "connected"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    return {
        "status": "ready" if db_status == "connected" else "degraded",
        "database": db_status,
        "database_url_type": "PostgreSQL" if db.bind and "postgres" in str(db.bind.url) else "SQLite"
    }

@router.get("/metadata")
def metadata():
    return {
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "tagline": "From operational signals to business decisions.",
        "primary_source": "US Consumer Financial Protection Bureau (CFPB) Consumer Complaint Database",
        "documentation_url": "/docs",
    }
