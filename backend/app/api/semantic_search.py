from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.semantic_search_service import SemanticSearchService
from app.models.entities import NarrativeEmbedding, ComplaintNarrative

router = APIRouter(prefix="/semantic-search", tags=["Semantic Search & Vector Retrieval"])

class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500, description="Investigation search intent or phrase")
    top_k: int = Field(10, ge=1, le=50)
    min_score: float = Field(0.05, ge=0.0, le=1.0)
    min_similarity: Optional[float] = None
    product: Optional[str] = None
    issue: Optional[str] = None
    company: Optional[str] = None
    theme_id: Optional[int] = None

@router.post("/query")
def search_narratives(req: SemanticSearchRequest, db: Session = Depends(get_db)):
    """
    Performs semantic vector search across consumer financial complaint narratives
    with cosine similarity ranking and metadata pre-filtering.
    """
    effective_min = req.min_similarity if req.min_similarity is not None else req.min_score
    return SemanticSearchService.search(
        db=db,
        query=req.query,
        top_k=req.top_k,
        min_score=effective_min,
        product=req.product,
        issue=req.issue,
        company=req.company,
        theme_id=req.theme_id,
    )

@router.post("/index")
def index_embeddings(force_reindex: bool = Query(False), db: Session = Depends(get_db)):
    """
    Generates and stores L2-normalized semantic vector embeddings for all complaint narratives.
    """
    return SemanticSearchService.index_all_narratives(db=db, force_reindex=force_reindex)

@router.get("/status")
def get_semantic_status(db: Session = Depends(get_db)):
    """
    Returns current vector index statistics, dimension, and model provenance.
    """
    total_narratives = db.query(ComplaintNarrative).count()
    total_indexed = db.query(NarrativeEmbedding).count()
    return {
        "status": "ready" if total_indexed > 0 else "needs_indexing",
        "embedding_model": "fintracer-semantic-tfidf-384",
        "dimension": SemanticSearchService.DIMENSION,
        "total_narratives": total_narratives,
        "total_indexed": total_indexed,
        "coverage_pct": round((total_indexed / max(total_narratives, 1)) * 100, 1),
    }
