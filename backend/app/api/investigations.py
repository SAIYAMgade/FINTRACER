from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.investigation_service import InvestigationService
from app.models.entities import SavedInvestigation

router = APIRouter(prefix="/investigations", tags=["Investigation Studio"])

class RunInvestigationRequest(BaseModel):
    template_key: str
    params: Optional[Dict[str, Any]] = None

class SaveInvestigationRequest(BaseModel):
    title: str
    question: str
    template_key: str
    description: Optional[str] = None
    filters_json: Optional[Dict[str, Any]] = None

class GenerateReportRequest(BaseModel):
    title: str
    executive_summary: str
    recommendations: List[str]

@router.get("/templates")
def list_templates():
    return InvestigationService.get_templates()

@router.post("/run")
def run_investigation(req: RunInvestigationRequest, db: Session = Depends(get_db)):
    try:
        return InvestigationService.run_investigation(db, req.template_key, req.params)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("")
def list_saved_investigations(db: Session = Depends(get_db)):
    records = db.query(SavedInvestigation).order_by(SavedInvestigation.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "question": r.question,
            "template_key": r.template_key,
            "filters": r.filters_json,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]

@router.post("")
def save_investigation(req: SaveInvestigationRequest, db: Session = Depends(get_db)):
    inv = InvestigationService.save_investigation(
        db,
        title=req.title,
        question=req.question,
        template_key=req.template_key,
        description=req.description,
        filters_json=req.filters_json,
    )
    return {"id": inv.id, "title": inv.title, "status": "SAVED"}

@router.get("/{investigation_id}")
def get_saved_investigation(investigation_id: int, db: Session = Depends(get_db)):
    inv = db.query(SavedInvestigation).filter(SavedInvestigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Saved investigation not found")
    
    # Run the investigation to return fresh results
    results = InvestigationService.run_investigation(
        db, inv.template_key or "TEMPLATE_COMPLAINT_TREND", inv.filters_json
    )

    return {
        "id": inv.id,
        "title": inv.title,
        "description": inv.description,
        "question": inv.question,
        "template_key": inv.template_key,
        "filters": inv.filters_json,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "results": results,
    }

@router.post("/{investigation_id}/generate-report")
def generate_report(
    investigation_id: int,
    req: GenerateReportRequest,
    db: Session = Depends(get_db),
):
    try:
        report = InvestigationService.generate_report_from_investigation(
            db,
            investigation_id=investigation_id,
            title=req.title,
            executive_summary=req.executive_summary,
            recommendations=req.recommendations,
        )
        return {
            "id": report.id,
            "title": report.title,
            "status": report.status,
            "created_at": report.created_at.isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
