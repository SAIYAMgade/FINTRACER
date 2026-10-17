import pytest
from app.services.analytics_service import AnalyticsService
from app.services.nlp_service import NLPService
from app.services.workbench_service import WorkbenchService
from app.db.session import SessionLocal

def test_nlp_preprocessing():
    raw = "I sent a dispute letter to http://fraud.com with info! I am NOT satisfied with $150 fee."
    clean = NLPService.preprocess_text(raw)
    assert "http" not in clean
    assert "not" in clean
    assert "$150" in clean
    assert "dispute" in clean

def test_nlp_ngram_extraction():
    texts = [
        "unauthorized charge on my credit card statement",
        "unauthorized charge occurred twice on card",
        "dispute unauthorized charge with company"
    ]
    bigrams = NLPService.extract_ngrams(texts, n=2, top_k=5)
    phrases = [b["phrase"] for b in bigrams]
    assert any("unauthorized charge" in p for p in phrases)

def test_workbench_validation():
    # Valid queries
    WorkbenchService.validate_sql("SELECT * FROM complaints LIMIT 10")
    WorkbenchService.validate_sql("WITH top_p AS (SELECT product FROM complaints) SELECT * FROM top_p")

    # Invalid empty query
    with pytest.raises(ValueError):
        WorkbenchService.validate_sql("")

    # Invalid multi-statement
    with pytest.raises(ValueError, match="Multiple SQL statements"):
        WorkbenchService.validate_sql("SELECT 1; DROP TABLE complaints;")

    # Invalid non-SELECT statements
    with pytest.raises(ValueError, match="Only SELECT statements"):
        WorkbenchService.validate_sql("DROP TABLE complaints")

    # Invalid embedded DDL/DML keyword
    with pytest.raises(ValueError, match="Prohibited SQL keyword"):
        WorkbenchService.validate_sql("SELECT * FROM complaints WHERE id IN (SELECT id FROM complaints INTO outfile)")

    with pytest.raises(ValueError, match="Prohibited SQL keyword"):
        WorkbenchService.validate_sql("SELECT * FROM complaints WHERE pg_sleep(5) = 1")

def test_analytics_period_comparison():
    db = SessionLocal()
    try:
        import datetime
        res = AnalyticsService.run_period_comparison(
            db,
            current_start=datetime.date(2025, 7, 1),
            current_end=datetime.date(2026, 6, 30),
            baseline_start=datetime.date(2025, 1, 1),
            baseline_end=datetime.date(2025, 6, 30),
            breakdown_by="product"
        )
        assert "contributions" in res
        assert "waterfall_chart" in res
        assert res["reconciliation"]["is_reconciled"] is True
        assert res["reconciliation"]["discrepancy"] == 0
        assert res["statistical_test"] is not None
    finally:
        db.close()
