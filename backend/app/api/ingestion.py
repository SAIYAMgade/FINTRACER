import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.ingestion_service import IngestionService
from app.services.nlp_service import NLPService

router = APIRouter(prefix="/ingestion", tags=["Data Ingestion"])

SAMPLE_COMPLAINTS = os.path.join("data", "sample", "sample_complaints.csv")
SAMPLE_NARRATIVES = os.path.join("data", "sample", "sample_narratives.csv")

@router.post("/seed-sample")
def seed_sample_dataset(db: Session = Depends(get_db)):
    """Ingests the documented CFPB sample complaints, sample narratives, and executes NLP theme extraction."""
    if not os.path.exists(SAMPLE_COMPLAINTS) or not os.path.exists(SAMPLE_NARRATIVES):
        raise HTTPException(
            status_code=404,
            detail="Sample data files not found on disk. Run generator script first."
        )

    complaints_run = IngestionService.ingest_complaints(
        db, SAMPLE_COMPLAINTS, source_name="CFPB Consumer Complaints (Sample Dataset)"
    )
    narratives_run = IngestionService.ingest_narratives(
        db, SAMPLE_NARRATIVES, source_name="CFPB Historical Narratives (Sample Dataset)"
    )

    # Automatically extract themes
    themes = NLPService.run_theme_extraction(db, n_clusters=5)

    return {
        "status": "SUCCESS",
        "message": "Sample dataset ingested and narrative intelligence themes extracted successfully.",
        "complaints_run": {
            "id": complaints_run.id,
            "rows_read": complaints_run.rows_read,
            "rows_inserted": complaints_run.rows_inserted,
            "rows_rejected": complaints_run.rows_rejected,
            "status": complaints_run.status,
        },
        "narratives_run": {
            "id": narratives_run.id,
            "rows_read": narratives_run.rows_read,
            "rows_inserted": narratives_run.rows_inserted,
            "unmatched_count": narratives_run.metadata_json.get("unmatched_count", 0),
            "status": narratives_run.status,
        },
        "themes_extracted": len(themes),
    }

@router.post("/upload")
async def upload_csv(
    file_type: str = "complaints", # "complaints" or "narratives"
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Uploads a local CSV file and processes it through the ingestion engine."""
    os.makedirs(os.path.join("data", "uploads"), exist_ok=True)
    temp_path = os.path.join("data", "uploads", file.filename or "upload.csv")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        if file_type == "complaints":
            run = IngestionService.ingest_complaints(
                db, temp_path, source_name=f"User Upload ({file.filename})"
            )
        else:
            run = IngestionService.ingest_narratives(
                db, temp_path, source_name=f"User Upload Narratives ({file.filename})"
            )

        return {
            "status": run.status,
            "run_id": run.id,
            "rows_read": run.rows_read,
            "rows_inserted": run.rows_inserted,
            "rows_rejected": run.rows_rejected,
            "error_summary": run.error_summary,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
