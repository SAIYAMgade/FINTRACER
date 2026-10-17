from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.nlp_service import NLPService
from app.models.entities import NarrativeTheme

router = APIRouter(prefix="/narratives", tags=["Narrative Intelligence"])

@router.get("/summary")
def get_narrative_summary(db: Session = Depends(get_db)):
    """Returns narrative intelligence summary, extracted themes, n-grams, and cross-tabulation."""
    return NLPService.get_narrative_intelligence_summary(db)

@router.get("/themes")
def list_themes(db: Session = Depends(get_db)):
    """Returns all extracted themes and their keyword profiles."""
    themes = db.query(NarrativeTheme).order_by(NarrativeTheme.id).all()
    return [
        {
            "id": t.id,
            "theme_key": t.theme_key,
            "theme_label": t.theme_label,
            "description": t.description,
            "keywords": t.keywords_json or [],
            "theme_method": t.theme_method,
            "version": t.model_or_rules_version,
        }
        for t in themes
    ]

@router.post("/re-cluster")
def recluster_narratives(
    n_clusters: int = Query(5, ge=2, le=10),
    db: Session = Depends(get_db),
):
    """Re-executes TF-IDF clustering with the specified number of clusters."""
    themes = NLPService.run_theme_extraction(db, n_clusters=n_clusters)
    return {
        "status": "SUCCESS",
        "clusters_created": len(themes),
        "themes": [t.theme_label for t in themes]
    }
