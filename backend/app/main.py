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
    global engine, SessionLocal
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Notice: Primary engine error during create_all ({e}). Switching to local SQLite...")
        from sqlalchemy import create_engine
        from app.db import session as sess_module
        fallback_engine = create_engine("sqlite:///./fintracer.db", connect_args={"check_same_thread": False})
        sess_module.engine = fallback_engine
        sess_module.SessionLocal.configure(bind=fallback_engine)
        engine = fallback_engine
        Base.metadata.create_all(bind=fallback_engine)
    
    # Auto-seed sample dataset if database is empty so application is immediately usable!
    db = SessionLocal()
    try:
        from app.models.entities import Complaint
        from app.services.ingestion_service import IngestionService
        from app.services.nlp_service import NLPService
        
        count = db.query(Complaint).count()
        sample_complaints_candidates = [
            os.path.join("data", "sample", "sample_complaints.csv"),
            os.path.join("..", "data", "sample", "sample_complaints.csv"),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "sample", "sample_complaints.csv")),
        ]
        sample_narratives_candidates = [
            os.path.join("data", "sample", "sample_narratives.csv"),
            os.path.join("..", "data", "sample", "sample_narratives.csv"),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "sample", "sample_narratives.csv")),
        ]
        sample_complaints_path = next((p for p in sample_complaints_candidates if os.path.exists(p)), None)
        sample_narratives_path = next((p for p in sample_narratives_candidates if os.path.exists(p)), None)
        
        if count == 0 and sample_complaints_path:
            print("Auto-seeding CFPB sample dataset into database...")
            IngestionService.ingest_complaints(db, sample_complaints_path)
            if sample_narratives_path:
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

# Static files and SPA serving for single-service production deployments (e.g. Render)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

frontend_candidates = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend", "static")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")),
    os.path.join("backend", "static"),
    os.path.join("frontend", "dist"),
    os.path.join("..", "frontend", "dist"),
]
frontend_dist = next(
    (p for p in frontend_candidates if os.path.exists(os.path.join(p, "index.html"))),
    None
)

if frontend_dist:
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(os.path.join(frontend_dist, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    async def fallback_root():
        return HTMLResponse(
            "<h1>FINTRACER Backend Active</h1><p>Visit <a href='/docs'>/docs</a> for API specifications.</p>"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
