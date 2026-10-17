import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health_and_metadata(client):
    r1 = client.get("/api/health")
    assert r1.status_code == 200
    assert r1.json()["status"] == "ok"

    r2 = client.get("/api/ready")
    assert r2.status_code == 200
    assert r2.json()["status"] in ["ready", "degraded"]

    r3 = client.get("/api/metadata")
    assert r3.status_code == 200
    assert "FINTRACER" in r3.json()["app_name"]

def test_overview_endpoints(client):
    res = client.get("/api/overview/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_complaints" in data
    assert data["total_complaints"] > 0
    assert "timely_response_rate" in data

    trends = client.get("/api/overview/trends")
    assert trends.status_code == 200
    assert isinstance(trends.json(), list)

    cats = client.get("/api/overview/categories")
    assert cats.status_code == 200
    assert "products" in cats.json()

def test_complaints_explorer(client):
    res = client.get("/api/complaints?page=1&page_size=10")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] > 0
    assert len(body["items"]) <= 10

    # Get single complaint
    cid = body["items"][0]["complaint_id"]
    detail = client.get(f"/api/complaints/{cid}")
    assert detail.status_code == 200
    assert detail.json()["complaint"]["complaint_id"] == cid
    assert "narrative" in detail.json()

def test_data_quality_endpoint(client):
    res = client.get("/api/data-quality/summary")
    assert res.status_code == 200
    body = res.json()
    assert "dataset_inventory" in body
    assert "missingness_matrix" in body
    assert "dq_status" in body

def test_narrative_intelligence(client):
    res = client.get("/api/narratives/summary")
    assert res.status_code == 200
    body = res.json()
    assert "themes" in body
    assert len(body["themes"]) > 0
    assert "top_bigrams" in body
    assert "product_cross_tab" in body

def test_investigation_studio_run(client):
    res = client.post("/api/investigations/run", json={
        "template_key": "TEMPLATE_COMPLAINT_TREND"
    })
    assert res.status_code == 200
    body = res.json()
    assert "evidence_panel" in body
    assert "waterfall_chart" in body["data"]

def test_workbench_execution_and_security(client):
    # Valid SELECT
    res = client.post("/api/workbench/execute", json={
        "sql": "SELECT product, COUNT(*) AS cnt FROM complaints GROUP BY product ORDER BY cnt DESC LIMIT 3;"
    })
    assert res.status_code == 200
    body = res.json()
    assert body["row_count"] == 3
    assert "product" in body["columns"]

    # Blocked DDL
    res_bad = client.post("/api/workbench/execute", json={
        "sql": "DROP TABLE complaints;"
    })
    assert res_bad.status_code == 400

    # Blocked Multi-statement
    res_multi = client.post("/api/workbench/execute", json={
        "sql": "SELECT 1; SELECT 2;"
    })
    assert res_multi.status_code == 400

def test_investigation_and_report_lifecycle(client):
    # 1. Save investigation
    save_res = client.post("/api/investigations", json={
        "title": "Quarterly Trend Audit",
        "question": "Which products drove the 2026 volume shift?",
        "template_key": "TEMPLATE_COMPLAINT_TREND"
    })
    assert save_res.status_code == 200
    inv_id = save_res.json()["id"]

    # 2. Generate report
    rep_res = client.post(f"/api/investigations/{inv_id}/generate-report", json={
        "title": "Q2 2026 Complaint Volume Investigation Report",
        "executive_summary": "Complaint volume shifted driven primarily by credit reporting tradeline disputes.",
        "recommendations": [
            "Increase customer service staffing for credit reporting disputes.",
            "Audit automated dispute processing workflows."
        ]
    })
    assert rep_res.status_code == 200
    rep_id = rep_res.json()["id"]

    # 3. View report
    view_res = client.get(f"/api/reports/{rep_id}")
    assert view_res.status_code == 200
    assert view_res.json()["title"] == "Q2 2026 Complaint Volume Investigation Report"

    # 4. Export report as markdown
    export_res = client.get(f"/api/reports/{rep_id}/export")
    assert export_res.status_code == 200
    assert "Executive Summary" in export_res.text

def test_frontend_root_and_spa_routes(client):
    root_res = client.get("/")
    assert root_res.status_code == 200

    spa_res = client.get("/overview")
    assert spa_res.status_code == 200

def test_head_requests_for_uptimerobot(client):
    # Verify that UptimeRobot probes using HEAD requests receive 200 OK
    h_health = client.head("/health")
    assert h_health.status_code == 200

    h_narratives = client.head("/narratives")
    assert h_narratives.status_code == 200

    h_root = client.head("/")
    assert h_root.status_code == 200
