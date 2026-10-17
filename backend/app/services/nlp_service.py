import re
import collections
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import MiniBatchKMeans

from app.models.entities import (
    ComplaintNarrative,
    NarrativeTheme,
    NarrativeThemeAssignment,
    Complaint,
)

# Custom stop words keeping financial terms and negations
FINANCIAL_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", 
    "by", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", 
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", 
    "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "me", "more", 
    "most", "my", "myself", "of", "off", "on", "once", "only", "or", "other", "ought", "our", 
    "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such", 
    "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", 
    "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", 
    "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "with", 
    "would", "you", "your", "yours", "yourself", "yourselves"
}

class NLPService:
    @staticmethod
    def preprocess_text(text: str) -> str:
        """Normalizes whitespace and cleans text while preserving financial and negation terms."""
        if not text:
            return ""
        # Lowercase
        cleaned = text.lower()
        # Remove URLs and email addresses
        cleaned = re.sub(r"https?://\S+|www\.\S+", " ", cleaned)
        cleaned = re.sub(r"\S+@\S+", " ", cleaned)
        # Normalize punctuation except hyphens and dollar signs
        cleaned = re.sub(r"[^\w\s\$-]", " ", cleaned)
        # Collapse whitespace
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    @staticmethod
    def extract_ngrams(texts: List[str], n: int = 2, top_k: int = 20) -> List[Dict[str, Any]]:
        """Extracts top n-grams from a list of narrative texts."""
        ngram_counter = collections.Counter()
        for text in texts:
            clean = NLPService.preprocess_text(text)
            tokens = [t for t in clean.split() if t not in FINANCIAL_STOPWORDS and len(t) > 2]
            for i in range(len(tokens) - n + 1):
                phrase = " ".join(tokens[i:i+n])
                ngram_counter[phrase] += 1
        
        return [{"phrase": phrase, "count": count} for phrase, count in ngram_counter.most_common(top_k)]

    @staticmethod
    def run_theme_extraction(db: Session, n_clusters: int = 5) -> List[NarrativeTheme]:
        """Performs TF-IDF clustering on all available narratives and saves themes & assignments."""
        narratives = db.query(ComplaintNarrative).all()
        if not narratives:
            return []

        cleaned_texts = [NLPService.preprocess_text(n.narrative_text) for n in narratives]

        vectorizer = TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 2),
            stop_words=list(FINANCIAL_STOPWORDS),
            sublinear_tf=True,
            min_df=2
        )
        X = vectorizer.fit_transform(cleaned_texts)
        feature_names = vectorizer.get_feature_names_out()

        kmeans = MiniBatchKMeans(n_clusters=n_clusters, random_state=42, batch_size=200, n_init="auto")
        labels = kmeans.fit_predict(X)

        # Predefined theme dictionary mapping top keywords to defensible financial domain labels
        # If cluster centers match specific keywords, we map them to accurate labels
        theme_metadata_map = {
            "credit": {
                "key": "THEME_CREDIT_REPORTING",
                "label": "Credit Reporting & Tradeline Accuracy Disputes",
                "description": "Disputes involving inaccurate derogatory marks, failure of FCRA 30-day investigation, and identity theft.",
            },
            "debt": {
                "key": "THEME_DEBT_COLLECTION",
                "label": "Unverified & Zombie Debt Collection Practices",
                "description": "Allegations of unverified debt collection, lack of debt validation under FDCPA, and workplace contact.",
            },
            "card": {
                "key": "THEME_CARD_BILLING",
                "label": "Credit Card Billing Discrepancies & Fee Disputes",
                "description": "Unauthorized card transactions, dispute processing failures, late fee assessments, and credit limit reductions.",
            },
            "checking": {
                "key": "THEME_CHECKING_ACCOUNTS",
                "label": "Deposit Account Overdrafts & Funds Availability",
                "description": "Unexpected maintenance and overdraft charges, transaction holds, and wire transfer delays.",
            },
            "mortgage": {
                "key": "THEME_MORTGAGE_SERVICING",
                "label": "Mortgage Servicing & Escrow Accounting Issues",
                "description": "Escrow calculation discrepancies, loan transfer servicing glitches, and loan modification delays.",
            },
        }

        # Clear existing assignments & themes if re-running
        db.query(NarrativeThemeAssignment).delete()
        db.query(NarrativeTheme).delete()
        db.flush()

        saved_themes = []
        cluster_theme_ids = {}

        for cluster_idx in range(n_clusters):
            # Top keywords for this cluster
            order_centroids = kmeans.cluster_centers_.argsort()[:, ::-1]
            top_keyword_indices = order_centroids[cluster_idx, :10]
            top_keywords = [feature_names[i] for i in top_keyword_indices]

            # Determine theme label
            keywords_text = " ".join(top_keywords)
            matched_theme = None
            for key, val in theme_metadata_map.items():
                if key in keywords_text or any(k in keywords_text for k in key.split()):
                    matched_theme = val
                    break

            used_keys = {t.theme_key for t in saved_themes}
            if not matched_theme:
                label = " / ".join([k.capitalize() for k in top_keywords[:2]]) + " Issues"
                theme_key = f"THEME_CLUSTER_{cluster_idx + 1}"
                description = f"Cluster characterized by terms: {', '.join(top_keywords[:5])}"
            else:
                label = matched_theme["label"]
                base_key = matched_theme["key"]
                theme_key = base_key if base_key not in used_keys else f"{base_key}_{cluster_idx + 1}"
                if theme_key in used_keys:
                    theme_key = f"{base_key}_{cluster_idx + 1}"
                description = matched_theme["description"]

            theme = NarrativeTheme(
                theme_key=theme_key,
                theme_label=label,
                description=description,
                theme_method="TF-IDF_KMEANS",
                keywords_json=top_keywords,
                model_or_rules_version="v1.0",
                metadata_json={"cluster_index": cluster_idx, "n_features": len(feature_names)},
            )
            db.add(theme)
            db.flush()
            saved_themes.append(theme)
            cluster_theme_ids[cluster_idx] = theme.id

        # Assign narratives to clusters
        assignments = []
        for i, narrative in enumerate(narratives):
            cluster_id = labels[i]
            theme_db_id = cluster_theme_ids[cluster_id]
            # Calculate distance or approximate score
            center = kmeans.cluster_centers_[cluster_id]
            doc_vec = X[i].toarray()[0]
            # Dot product as cosine similarity approximation
            score = float(doc_vec.dot(center))

            assignment = NarrativeThemeAssignment(
                complaint_narrative_id=narrative.id,
                theme_id=theme_db_id,
                score=round(score, 4),
                assignment_method="TF-IDF_KMEANS",
                processing_version="v1.0",
            )
            assignments.append(assignment)

        db.bulk_save_objects(assignments)
        db.commit()
        return saved_themes

    @staticmethod
    def get_narrative_intelligence_summary(db: Session) -> Dict[str, Any]:
        """Provides full narrative intelligence metrics, themes, coverage, and structured cross-tabulation."""
        total_complaints = db.query(Complaint).count()
        total_narratives = db.query(ComplaintNarrative).count()
        availability_rate = round((total_narratives / max(total_complaints, 1)) * 100, 2)

        # Get themes and assignment counts
        themes = db.query(NarrativeTheme).all()
        theme_list = []
        for t in themes:
            count = db.query(NarrativeThemeAssignment).filter(
                NarrativeThemeAssignment.theme_id == t.id
            ).count()
            pct = round((count / max(total_narratives, 1)) * 100, 2)
            
            # Get 3 representative excerpts
            top_assignments = db.query(NarrativeThemeAssignment).filter(
                NarrativeThemeAssignment.theme_id == t.id
            ).order_by(NarrativeThemeAssignment.score.desc()).limit(3).all()
            
            excerpts = []
            for a in top_assignments:
                narr = db.query(ComplaintNarrative).filter(ComplaintNarrative.id == a.complaint_narrative_id).first()
                if narr:
                    excerpts.append({
                        "complaint_id": narr.complaint_source_id,
                        "score": a.score,
                        "snippet": narr.narrative_text[:280] + ("..." if len(narr.narrative_text) > 280 else "")
                    })

            theme_list.append({
                "id": t.id,
                "theme_key": t.theme_key,
                "theme_label": t.theme_label,
                "description": t.description,
                "keywords": t.keywords_json or [],
                "assigned_count": count,
                "prevalence_pct": pct,
                "excerpts": excerpts,
            })

        # Sort themes by assigned count descending
        theme_list.sort(key=lambda x: x["assigned_count"], reverse=True)

        # N-grams across sample narratives
        sample_narratives = [n.narrative_text for n in db.query(ComplaintNarrative.narrative_text).limit(300).all()]
        bigrams = NLPService.extract_ngrams(sample_narratives, n=2, top_k=10)
        trigrams = NLPService.extract_ngrams(sample_narratives, n=3, top_k=10)

        # Cross-tabulation: Themes across top structured products
        cross_tab_query = db.query(
            Complaint.product,
            NarrativeTheme.theme_label,
            func.count(Complaint.id)
        ).join(
            ComplaintNarrative, Complaint.complaint_id == ComplaintNarrative.complaint_source_id
        ).join(
            NarrativeThemeAssignment, ComplaintNarrative.id == NarrativeThemeAssignment.complaint_narrative_id
        ).join(
            NarrativeTheme, NarrativeThemeAssignment.theme_id == NarrativeTheme.id
        ).group_by(Complaint.product, NarrativeTheme.theme_label).all()

        cross_tab = []
        for prod, theme_label, count in cross_tab_query:
            cross_tab.append({
                "product": prod,
                "theme_label": theme_label,
                "count": count
            })

        # Cross-tabulation: Themes by response timeliness
        timeliness_query = db.query(
            NarrativeTheme.theme_label,
            Complaint.timely_response,
            func.count(Complaint.id)
        ).join(
            ComplaintNarrative, Complaint.complaint_id == ComplaintNarrative.complaint_source_id
        ).join(
            NarrativeThemeAssignment, ComplaintNarrative.id == NarrativeThemeAssignment.complaint_narrative_id
        ).join(
            NarrativeTheme, NarrativeThemeAssignment.theme_id == NarrativeTheme.id
        ).group_by(NarrativeTheme.theme_label, Complaint.timely_response).all()

        timeliness_breakdown = collections.defaultdict(lambda: {"timely": 0, "untimely": 0})
        for theme_label, is_timely, count in timeliness_query:
            if is_timely is True:
                timeliness_breakdown[theme_label]["timely"] += count
            elif is_timely is False:
                timeliness_breakdown[theme_label]["untimely"] += count

        timeliness_list = [
            {"theme_label": k, "timely": v["timely"], "untimely": v["untimely"], "total": v["timely"] + v["untimely"]}
            for k, v in timeliness_breakdown.items()
        ]

        return {
            "total_complaints": total_complaints,
            "total_narratives": total_narratives,
            "availability_rate_pct": availability_rate,
            "themes": theme_list,
            "top_bigrams": bigrams,
            "top_trigrams": trigrams,
            "product_cross_tab": cross_tab,
            "timeliness_breakdown": timeliness_list,
            "methodology": {
                "algorithm": "TF-IDF Vectorization with MiniBatchKMeans Clustering",
                "stop_words": "Financial Domain Preserving",
                "version": "v1.0",
                "note": "Text-derived themes are observational associations and do not assert customer-level causation."
            }
        }
