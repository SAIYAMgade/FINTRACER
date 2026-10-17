from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import settings

router = APIRouter(tags=["Health & Metadata"])

@router.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.VERSION}

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
        "database_url_type": "PostgreSQL" if "postgres" in settings.DATABASE_URL else "SQLite"
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
