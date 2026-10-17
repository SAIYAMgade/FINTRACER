from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.entities import (
    SourceFile,
    IngestionRun,
    DataQualityResult,
    Complaint,
    ComplaintNarrative,
)

router = APIRouter(prefix="/data-quality", tags=["Data Quality"])

@router.get("/summary")
def get_quality_summary(db: Session = Depends(get_db)):
    total_complaints = db.query(Complaint).count()
    total_narratives = db.query(ComplaintNarrative).count()
    total_runs = db.query(IngestionRun).count()
    
    # Missingness
    missing_zip = db.query(Complaint).filter(Complaint.zip_code.is_(None)).count()
    missing_state = db.query(Complaint).filter(Complaint.state.is_(None)).count()
    missing_subproduct = db.query(Complaint).filter(Complaint.sub_product.is_(None)).count()
    missing_subissue = db.query(Complaint).filter(Complaint.sub_issue.is_(None)).count()

    checks = db.query(DataQualityResult).order_by(DataQualityResult.created_at.desc()).all()

    # Pass vs Warn vs Fail count
    pass_count = sum(1 for c in checks if c.status == "PASS")
    warn_count = sum(1 for c in checks if c.status == "WARN")
    fail_count = sum(1 for c in checks if c.status == "FAIL")

    return {
        "dataset_inventory": {
            "total_complaints": total_complaints,
            "total_narratives": total_narratives,
            "total_ingestion_runs": total_runs,
        },
        "dq_status": {
            "total_checks": len(checks),
            "pass_count": pass_count,
            "warn_count": warn_count,
            "fail_count": fail_count,
            "overall_health": "DEGRADED" if fail_count > 0 else ("WARNING" if warn_count > 0 else "HEALTHY")
        },
        "missingness_matrix": [
            {"field": "zip_code", "missing_count": missing_zip, "missing_pct": round(missing_zip / max(total_complaints, 1) * 100, 2), "is_required": False},
            {"field": "state", "missing_count": missing_state, "missing_pct": round(missing_state / max(total_complaints, 1) * 100, 2), "is_required": False},
            {"field": "sub_product", "missing_count": missing_subproduct, "missing_pct": round(missing_subproduct / max(total_complaints, 1) * 100, 2), "is_required": False},
            {"field": "sub_issue", "missing_count": missing_subissue, "missing_pct": round(missing_subissue / max(total_complaints, 1) * 100, 2), "is_required": False},
        ],
        "recent_checks": [
            {
                "id": c.id,
                "check_name": c.check_name,
                "category": c.check_category,
                "severity": c.severity,
                "status": c.status,
                "affected_rows": c.affected_rows,
                "details": c.details_json,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in checks[:20]
        ]
    }

@router.get("/runs")
def list_ingestion_runs(db: Session = Depends(get_db)):
    runs = db.query(IngestionRun).order_by(IngestionRun.started_at.desc()).all()
    results = []
    for r in runs:
        sf = r.source_file
        results.append({
            "id": r.id,
            "source_name": sf.source_name if sf else "Direct Input",
            "file_name": sf.file_name if sf else "Unknown",
            "file_checksum": sf.file_checksum if sf else None,
            "status": r.status,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "rows_read": r.rows_read,
            "rows_inserted": r.rows_inserted,
            "rows_updated": r.rows_updated,
            "rows_rejected": r.rows_rejected,
            "error_summary": r.error_summary,
            "metadata": r.metadata_json,
        })
    return results
