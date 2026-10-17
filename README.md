# RESOLVEX

> **From operational signals to business decisions.**

[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB.svg?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL 18](https://img.shields.io/badge/PostgreSQL-18-336791.svg?logo=postgresql)](https://postgresql.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg?logo=vite)](https://vitejs.dev)
[![Apache ECharts](https://img.shields.io/badge/Apache_ECharts-5.6-AA344D.svg?logo=apacheecharts)](https://echarts.apache.org)

RESOLVEX is a full-stack financial-services investigation and analytics platform built on the **US Consumer Financial Protection Bureau (CFPB) Consumer Complaint Database** and its historical narrative archive.

It demonstrates the practical engineering, statistical rigor, and business communication abilities expected of a Senior Data Analyst / Analytics Engineer: relational data modeling, reproducible ETL pipelines, structured statistical contribution analysis, unsupervised NLP narrative clustering, controlled read-only SQL workspaces, and executive evidence-backed reporting.

---

## 1. Product Capabilities

### 1.1 Descriptive Analytics & Executive Overview (`/overview`)
- Real-time KPI tracking: Total complaints, Timely company response rate %, Narrative availability rate %, and Consumer dispute rates.
- Monthly volume trends with Month-over-Month ($\% \text{MoM}$) change indicators.
- High-level distributions across financial products, top regulatory issues, and financial institutions.

### 1.2 Diagnostic Contribution Analysis (`/investigations`)
- Formulates business hypotheses comparing current and baseline operational periods.
- Decomposes total volume increases across categories:
  $$\Delta_i = C_{i,\text{current}} - C_{i,\text{baseline}}$$
- Verified additive waterfall decomposition chart with automated zero-discrepancy reconciliation check ($\sum \Delta_i = \Delta$).
- **Statistical Hypothesis Testing:** Evaluates categorical homogeneity across time periods via **Pearson's Chi-Square Test of Homogeneity** ($\chi^2$, degrees of freedom, p-value, and Cramér's $V$ effect size).

### 1.3 Unsupervised Narrative Intelligence (`/narratives`)
- Qualitative text preprocessing pipeline preserving financial terms (`$`, `%`, statutory codes) and negation polarities (`not`, `no`, `never`, `without`, `dispute`).
- **TF-IDF Vectorization & MiniBatchKMeans Topic Modeling:** Unsupervised cluster discovery mapping recurring consumer grievances into transparent financial domain themes.
- High-frequency phrase extraction (bi-grams and tri-grams).
- **Structured-to-Text Cross-Tabulation:** Cross-validates unsupervised text themes against structured regulatory issue codes to detect discrepancies and cross-category overlaps.

### 1.4 Evidence Panels & Reproducibility
- Every finding in the platform is backed by an inspectable **Evidence Panel** detailing:
  - Finding title & business question.
  - Sample size ($N$) and data coverage percentages.
  - Metric formulas & calculation methodology.
  - **Exact reproducible SQL query** with one-click copy.
  - Known caveats and suggested next investigations.

### 1.5 Controlled Read-Only SQL Workbench (`/workbench`)
- Controlled interactive SQL workspace connected to PostgreSQL 18.
- Security-hardened execution:
  - Strict AST validation: permits only single `SELECT` (or `WITH ... SELECT`) statements.
  - Keyword blacklist: blocks `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`, `EXEC`.
  - Transaction isolation: `SET TRANSACTION READ ONLY`.
  - Timeout enforcement: 5,000 ms statement timeout.
  - Output constraint: maximum 500 rows returned.
  - Execution runtime duration tracked in milliseconds.
  - Approved schema browser and library of preloaded analytical queries.

### 1.6 Data Quality & Governance Center (`/quality`)
- Full dataset inventory tracking structured complaints, historical narratives, and ETL runs.
- Missingness matrix evaluating null proportions across schema fields.
- Automated integrity checks (duplicate identification, required field completeness, date range checks, narrative join key linkage coverage).
- Exportable Markdown Data Quality audit report.

### 1.7 Executive Reporting (`/reports`)
- Publishes persistent investigation snapshots containing executive summaries, findings, reproducible SQL, actionable recommendations, and governance limitations.
- One-click export to Markdown (`.md`).

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript (strict), Vite 8, Tailwind CSS v4, TanStack Query, Apache ECharts, Lucide Icons |
| **Backend** | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, psycopg2-binary |
| **Analytics & NLP** | Pandas, NumPy, SciPy, Statsmodels, Scikit-Learn (TF-IDF & MiniBatchKMeans) |
| **Database** | PostgreSQL 18 (with indexed schema & version-controlled Alembic migrations) |
| **Testing** | Pytest, HTTPX TestClient |

---

## 3. Getting Started

### 3.1 Prerequisites
- Python 3.11+
- Node.js 20+ and npm
- PostgreSQL 18 (running locally on port 5432 or via Docker)

### 3.2 Database Setup
Ensure PostgreSQL is running and create the `resolvex` database:
```sql
CREATE DATABASE resolvex;
```

### 3.3 Backend Setup & Seeding
1. Activate the Python virtual environment:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
2. Install Python dependencies (if not already installed):
   ```bash
   pip install -r backend/pyproject.toml
   ```
3. Run Alembic migrations:
   ```bash
   alembic upgrade head
   ```
4. Start the FastAPI backend server:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend
   ```
   *Note: On startup, the backend automatically seeds the deterministic CFPB sample dataset (1,200 complaints, 540 narratives, pre-computed NLP clusters) if the database is unpopulated.*

### 3.4 Frontend Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open your browser at [http://localhost:3000](http://localhost:3000).

---

## 4. Running Automated Tests

Run the full suite of unit, analytical, and API integration tests:

```bash
.\.venv\Scripts\pytest.exe
```

Test coverage includes:
- NLP text preprocessing, financial token preservation, and n-gram extraction.
- SQL Workbench AST validator and disallowed keyword detection.
- Analytical period comparison, waterfall contribution calculation, and additive reconciliation.
- Full API lifecycle: `/api/health`, `/api/overview`, `/api/complaints`, `/api/quality`, `/api/narratives`, `/api/investigations/run`, and report generation.

---

## 5. Documentation Directory

Detailed specifications are maintained under [`docs/`](./docs/):
- [`docs/architecture.md`](./docs/architecture.md) - System architecture and component interactions.
- [`docs/data_sources.md`](./docs/data_sources.md) - Official CFPB source references, archive URLs, and coverage metrics.
- [`docs/data_dictionary.md`](./docs/data_dictionary.md) - Comprehensive relational table and attribute definitions.
- [`docs/database_design.md`](./docs/database_design.md) - Entity relationship diagram and index specifications.
- [`docs/metric_definitions.md`](./docs/metric_definitions.md) - Mathematical formulas, denominator rules, and statistical testing definitions.
- [`docs/nlp_methodology.md`](./docs/nlp_methodology.md) - Text normalization, stopword handling, and clustering methodology.
- [`docs/limitations.md`](./docs/limitations.md) - Governance caveats, observational vs causal boundaries, and denominator absence.

---

## 6. Definition of Success Checklist

- [x] Ingest real or documented sample CFPB dataset with duplicate handling and reconciliation.
- [x] Query, filter, and search structured complaint records with server-side pagination.
- [x] Process unstructured complaint narratives via local TF-IDF and clustering.
- [x] Cross-tabulate narrative themes against structured product and issue codes.
- [x] Perform period-over-period contribution analysis ($\Delta_i = C_{i,\text{curr}} - C_{i,\text{base}}$) with waterfall visualization.
- [x] Execute Pearson's Chi-Square Test of Homogeneity with Cramér's V effect size.
- [x] Inspect exact reproducible SQL queries in expandable Evidence Panels.
- [x] Controlled read-only SQL Workbench with statement timeouts and keyword enforcement.
- [x] Generate and export evidence-backed executive reports to Markdown.
- [x] Automated test suite verifying metrics, safety, and API endpoints (12 passing tests).
