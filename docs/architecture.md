# RESOLVEX System Architecture & Engineering Specification

## 1. Executive Architecture Overview

RESOLVEX is an end-to-end investigation and analytics platform designed to turn raw financial protection complaint records and unstructured consumer narratives into defensible business findings.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RESOLVEX Web Application                        │
│ (React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, ECharts)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON REST API
┌───────────────────────────────────▼────────────────────────────────────┐
│                       FastAPI Backend Service                          │
│                                                                        │
│  ┌───────────────────────┐  ┌──────────────────────────────────────┐  │
│  │   Analytics Engine    │  │       Narrative NLP Service          │  │
│  │ • Waterfall Contrib   │  │ • TF-IDF Vectorization               │  │
│  │ • Chi-Square Tests    │  │ • MiniBatchKMeans Clustering         │  │
│  │ • Wilson 95% CI       │  │ • Financial Stopword Filter          │  │
│  │ • MoM Volume Trends   │  │ • Cross-Tabulation Matrix            │  │
│  └───────────────────────┘  └──────────────────────────────────────┘  │
│  ┌───────────────────────┐  ┌──────────────────────────────────────┐  │
│  │  Investigation Studio │  │       Safe SQL Workbench             │  │
│  │ • 5 Domain Templates  │  │ • Read-Only AST Validation           │  │
│  │ • Evidence Panels     │  │ • 5,000ms Statement Timeout          │  │
│  │ • Snapshot Reports    │  │ • Approved Schema Enclosure          │  │
│  └───────────────────────┘  └──────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                ETL & Ingestion Engine (Modes A, B, C)           │  │
│  │ • Checksum Verification  • Schema Validation  • Duplicate Audit │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQLAlchemy 2.0 (psycopg2)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    PostgreSQL 18 Relational Database                   │
│                                                                        │
│  • complaints                 • complaint_narratives                   │
│  • narrative_themes           • narrative_theme_assignments            │
│  • source_files               • ingestion_runs                         │
│  • data_quality_results       • saved_investigations                   │
│  • investigation_reports                                               │
└────────────────────────────────────────────────────────────────────────┘
```

## 2. Core Subsystems

### 2.1 Ingestion & ETL Subsystem
- **Mode A (Official Source Ingestion):** Ingests official CFPB Consumer Complaint Database CSVs and FOIA narrative archives.
- **Mode B (Local Batch Upload):** Authenticated operator CSV upload interface (`/api/ingestion/upload`).
- **Mode C (Deterministic Sample Dataset):** Pre-seeded multi-quarter sample dataset with 1,200 complaints, 540 narratives, duplicate IDs, missing fields, and unmatched join keys to exercise data quality checks.
- **Validation Pipeline:** Checksum calculation (SHA-256), date validation, identifier uniqueness enforcement, chunked batch loading (500 rows/batch), and automated recording of `DataQualityResult` entities.

### 2.2 Analytical & Statistical Engine
- **Volume Shift & Contribution Decomposition:** Calculates $\Delta_i = C_{i,\text{curr}} - C_{i,\text{base}}$ across categories and constructs additive waterfall chart data.
- **Hypothesis Testing:** Evaluates categorical homogeneity between baseline and current periods via Pearson's Chi-Square Test of Homogeneity ($\chi^2$, df, p-value, Cramér's V effect size).
- **Rate Metrics:** Timely response rates, dispute rates, and narrative availability with explicit numerator and denominator reporting.

### 2.3 Narrative Intelligence & Qualitative NLP
- **Preprocessing:** Preserves financial terms (`$`, `%`, section codes `611`, `809b`) and critical negations (`not`, `no`, `without`, `dispute`) while removing web boilerplate.
- **Unsupervised Topic Modeling:** Sublinear TF-IDF vectorization ($n$-gram range 1–2) paired with MiniBatchKMeans clustering to partition narratives into domain clusters.
- **Cross-Tabulation Matrix:** Measures joint occurrences between structured regulatory issue categories and unsupervised narrative themes.

### 2.4 Investigation Studio & Evidence Panels
- **5 Working Investigation Templates:**
  1. *Complaint Trend Investigation* (Waterfall contribution & Chi-Square test)
  2. *Response Timeliness Investigation* (Institutional compliance ranking)
  3. *Narrative Theme Investigation* (NLP thematic extraction)
  4. *Structured vs. Narrative Cross-Validation* (Thematic concordance)
  5. *Data Quality Audit* (Missingness and integrity checks)
- **Evidence Panel:** Displays finding title, business question, sample size, metric definitions, calculation method, caveats, suggested next investigation, and exact reproducible SQL query with one-click copy.

### 2.5 Controlled Read-Only SQL Workbench
- **Single Statement Enforcement:** Rejects queries containing semicolons or multiple statements.
- **Keyword Blacklist:** Prohibits DDL/DML operations (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `EXEC`, `CREATE`).
- **Resource Constraints:** Sets connection `TRANSACTION READ ONLY`, enforces `statement_timeout = '5s'`, and limits query output to 500 rows.
