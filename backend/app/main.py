import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.api import (
    health,
    overview,
    complaints,
    quality,
    ingestion,
    narratives,
    investigations,
    reports,
    workbench,
)
import app.models  # ensure models are loaded

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed sample dataset if database is empty so application is immediately usable!
    db = SessionLocal()
    try:
        from app.models.entities import Complaint
        from app.services.ingestion_service import IngestionService
        from app.services.nlp_service import NLPService
        
        count = db.query(Complaint).count()
        sample_complaints_path = os.path.join("data", "sample", "sample_complaints.csv")
        sample_narratives_path = os.path.join("data", "sample", "sample_narratives.csv")
        
        if count == 0 and os.path.exists(sample_complaints_path):
            print("Auto-seeding CFPB sample dataset into PostgreSQL...")
            IngestionService.ingest_complaints(db, sample_complaints_path)
            if os.path.exists(sample_narratives_path):
                IngestionService.ingest_narratives(db, sample_narratives_path)
            NLPService.run_theme_extraction(db, n_clusters=5)
            print("Auto-seeding and theme extraction completed!")
    except Exception as e:
        print(f"Notice: Auto-seeding skipped ({e})")
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Full-Stack Financial-Services Investigation and Analytics Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(overview.router, prefix=settings.API_PREFIX)
app.include_router(complaints.router, prefix=settings.API_PREFIX)
app.include_router(quality.router, prefix=settings.API_PREFIX)
app.include_router(ingestion.router, prefix=settings.API_PREFIX)
app.include_router(narratives.router, prefix=settings.API_PREFIX)
app.include_router(investigations.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)
app.include_router(workbench.router, prefix=settings.API_PREFIX)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
