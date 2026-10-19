import re
import time
import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from sklearn.feature_extraction.text import TfidfVectorizer

from app.models.entities import (
    Complaint,
    ComplaintNarrative,
    NarrativeEmbedding,
    NarrativeThemeAssignment,
    NarrativeTheme,
)
from app.services.nlp_service import NLPService, FINANCIAL_STOPWORDS

class SemanticSearchService:
    _vectorizer: Optional[TfidfVectorizer] = None
    _vectorizer_version: str = "v1.0"
    DIMENSION: int = 384

    @classmethod
    def get_or_fit_vectorizer(cls, db: Session, force_refit: bool = False) -> TfidfVectorizer:
        """Retrieves or trains a corpus-calibrated TF-IDF semantic vectorizer."""
        if cls._vectorizer is not None and not force_refit:
            return cls._vectorizer

        narratives = db.query(ComplaintNarrative.narrative_text).all()
        texts = [n[0] for n in narratives if n[0]]
        if not texts:
            # Fallback vocabulary if DB is empty
            texts = [
                "credit reporting tradeline accuracy dispute identity theft",
                "debt collection unverified balance phone harassment workplace",
                "checking account overdraft fee unauthorized hold wire transfer",
                "mortgage escrow dispute loan modification servicing glitch",
                "credit card billing dispute late fee refund chargeback",
            ]

        cleaned = [NLPService.preprocess_text(t) for t in texts]
        vec = TfidfVectorizer(
            max_features=cls.DIMENSION,
            ngram_range=(1, 3),
            stop_words=list(FINANCIAL_STOPWORDS),
            sublinear_tf=True,
            norm="l2",
            min_df=1,
        )
        vec.fit(cleaned)
        cls._vectorizer = vec
        return vec

    @classmethod
    def embed_text(cls, text: str, vectorizer: TfidfVectorizer) -> List[float]:
        """Transforms a string into an L2-normalized float vector."""
        cleaned = NLPService.preprocess_text(text)
        if not cleaned:
            return [0.0] * cls.DIMENSION

        arr = vectorizer.transform([cleaned]).toarray()[0]
        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm
        return [round(float(v), 6) for v in arr]

    @classmethod
    def index_all_narratives(cls, db: Session, force_reindex: bool = False) -> Dict[str, Any]:
        """Indexes all complaint narratives into the narrative_embeddings table."""
        start_time = time.time()
        vectorizer = cls.get_or_fit_vectorizer(db, force_refit=force_reindex)

        if force_reindex:
            db.query(NarrativeEmbedding).delete()
            db.flush()

        # Find unindexed narratives
        existing_ids = {r[0] for r in db.query(NarrativeEmbedding.complaint_narrative_id).all()}
        unindexed = [
            n for n in db.query(ComplaintNarrative).all()
            if n.id not in existing_ids
        ]

        if not unindexed:
            total_indexed = db.query(NarrativeEmbedding).count()
            return {
                "status": "up_to_date",
                "newly_indexed": 0,
                "total_indexed": total_indexed,
                "duration_seconds": round(time.time() - start_time, 2),
            }

        embeddings_to_save = []
        for narr in unindexed:
            vec = cls.embed_text(narr.narrative_text, vectorizer)
            embeddings_to_save.append(
                NarrativeEmbedding(
                    complaint_narrative_id=narr.id,
                    complaint_source_id=narr.complaint_source_id,
                    embedding_model="fintracer-semantic-tfidf-384",
                    dimension=cls.DIMENSION,
                    vector_json=vec,
                )
            )

        db.bulk_save_objects(embeddings_to_save)
        db.commit()

        total_indexed = db.query(NarrativeEmbedding).count()
        return {
            "status": "indexed",
            "newly_indexed": len(embeddings_to_save),
            "total_indexed": total_indexed,
            "duration_seconds": round(time.time() - start_time, 2),
        }

    @classmethod
    def search(
        cls,
        db: Session,
        query: str,
        top_k: int = 10,
        min_score: float = 0.05,
        product: Optional[str] = None,
        issue: Optional[str] = None,
        company: Optional[str] = None,
        theme_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Executes semantic search with metadata pre-filtering and cosine similarity ranking.
        """
        start_time = time.time()
        # Ensure embeddings are populated
        if db.query(NarrativeEmbedding).count() == 0:
            cls.index_all_narratives(db)

        vectorizer = cls.get_or_fit_vectorizer(db)
        query_vec = np.array(cls.embed_text(query, vectorizer))

        # Build join query to include Complaint metadata
        q = (
            db.query(
                NarrativeEmbedding.id,
                NarrativeEmbedding.complaint_narrative_id,
                NarrativeEmbedding.complaint_source_id,
                NarrativeEmbedding.vector_json,
                ComplaintNarrative.narrative_text,
                Complaint.product,
                Complaint.issue,
                Complaint.sub_issue,
                Complaint.company,
                Complaint.state,
                Complaint.date_received,
                Complaint.timely_response,
                Complaint.consumer_disputed,
                NarrativeTheme.theme_label,
            )
            .join(ComplaintNarrative, NarrativeEmbedding.complaint_narrative_id == ComplaintNarrative.id)
            .outerjoin(Complaint, NarrativeEmbedding.complaint_source_id == Complaint.complaint_id)
            .outerjoin(NarrativeThemeAssignment, ComplaintNarrative.id == NarrativeThemeAssignment.complaint_narrative_id)
            .outerjoin(NarrativeTheme, NarrativeThemeAssignment.theme_id == NarrativeTheme.id)
        )

        if product and product != "All":
            q = q.filter(Complaint.product == product)
        if issue and issue != "All":
            q = q.filter(Complaint.issue == issue)
        if company and company != "All":
            q = q.filter(Complaint.company == company)
        if theme_id is not None:
            q = q.filter(NarrativeTheme.id == theme_id)

        candidates = q.all()
        if not candidates:
            return {
                "query": query,
                "total_evaluated": 0,
                "results_count": 0,
                "search_duration_ms": round((time.time() - start_time) * 1000, 2),
                "results": [],
            }

        # Vectorized dot-product scoring
        matrix = np.array([c[3] for c in candidates])  # (N, 384)
        scores = np.dot(matrix, query_vec)  # (N,)

        # Extract top_k
        top_indices = np.argsort(scores)[::-1][: top_k * 2]  # take extra to filter by min_score

        results = []
        for idx in top_indices:
            score = float(scores[idx])
            if score < min_score:
                continue

            row = candidates[idx]
            raw_text = row[4] or ""

            # Extract focused snippet (around first occurrence of top query terms)
            snippet = cls._extract_snippet(raw_text, query)

            results.append({
                "embedding_id": row[0],
                "narrative_id": row[1],
                "complaint_narrative_id": row[1],
                "complaint_id": row[2],
                "complaint_source_id": row[2],
                "similarity_score": round(score, 4),
                "relevance_pct": round(score * 100, 1),
                "snippet": snippet,
                "narrative_text": raw_text,
                "full_narrative": raw_text,
                "product": row[5] or "Unspecified Product",
                "issue": row[6] or "Unspecified Issue",
                "sub_issue": row[7],
                "company": row[8] or "Unspecified Company",
                "state": row[9] or "N/A",
                "date_received": row[10].isoformat() if row[10] else None,
                "timely_response": row[11],
                "consumer_disputed": row[12],
                "theme_label": row[13] or "General Investigation",
                "theme_name": row[13] or "General Investigation",
            })

            if len(results) >= top_k:
                break

        duration_s = round(time.time() - start_time, 3)
        return {
            "query": query,
            "total_evaluated": len(candidates),
            "results_count": len(results),
            "count": len(results),
            "top_k": top_k,
            "search_duration_ms": round(duration_s * 1000, 2),
            "duration_seconds": duration_s,
            "filters_applied": {
                "product": product,
                "issue": issue,
                "company": company,
                "min_score": min_score,
            },
            "results": results,
        }

    @staticmethod
    def _extract_snippet(text: str, query: str, max_chars: int = 240) -> str:
        """Extracts a contextual snippet centered on matching keywords."""
        if not text:
            return ""
        words = [w for w in re.findall(r"\w+", query.lower()) if w not in FINANCIAL_STOPWORDS]
        if not words:
            return text[:max_chars] + ("..." if len(text) > max_chars else "")

        pattern = re.compile(r"\b(" + "|".join(re.escape(w) for w in words) + r")\b", re.IGNORECASE)
        match = pattern.search(text)
        if not match:
            return text[:max_chars] + ("..." if len(text) > max_chars else "")

        start = max(0, match.start() - 80)
        end = min(len(text), match.end() + 160)
        prefix = "..." if start > 0 else ""
        suffix = "..." if end < len(text) else ""
        return prefix + text[start:end].strip() + suffix
