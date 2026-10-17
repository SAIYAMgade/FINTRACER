# RESOLVEX Database Design & Relational Schema

## 1. Relational Entity Overview

The RESOLVEX relational schema is hosted on **PostgreSQL 18** and managed through **Alembic** migrations.

```
┌─────────────────────┐          ┌──────────────────────────┐
│    source_files     │          │      ingestion_runs      │
├─────────────────────┤          ├──────────────────────────┤
│ id (PK)             │◄────┐    │ id (PK)                  │
│ source_name         │     │    │ source_file_id (FK)      ├─┐
│ file_checksum       │     └────┼─ status                  │ │
│ row_count           │          │ rows_read / inserted     │ │
└──────────┬──────────┘          └────────────┬─────────────┘ │
           │                                  │               │
           │                                  │               │
┌──────────▼──────────┐          ┌────────────▼─────────────┐ │
│     complaints      │          │   complaint_narratives   │ │
├─────────────────────┤          ├──────────────────────────┤ │
│ id (PK)             │          │ id (PK)                  │ │
│ complaint_id (UQ)   │◄─────────┼─ complaint_source_id (FK)│ │
│ date_received       │          │ narrative_text           │ │
│ product / sub_prod  │          │ text_hash                │ │
│ issue / sub_issue   │          │ word_count               │ │
│ company             │          └────────────┬─────────────┘ │
│ state / zip_code    │                       │               │
│ timely_response     │                       │               │
└─────────────────────┘          ┌────────────▼─────────────┐ │
                                 │narrative_theme_assignment│ │
                                 ├──────────────────────────┤ │
                                 │ id (PK)                  │ │
                                 │ complaint_narrative_id(FK│ │
                                 │ theme_id (FK)            │ │
                                 │ score                    │ │
                                 └────────────▲─────────────┘ │
                                              │               │
                                 ┌────────────┴─────────────┐ │
                                 │     narrative_themes     │ │
                                 ├──────────────────────────┤ │
                                 │ id (PK)                  │ │
                                 │ theme_key (UQ)           │ │
                                 │ theme_label              │ │
                                 │ keywords_json            │ │
                                 └──────────────────────────┘ │
                                                              │
                                 ┌──────────────────────────┐ │
                                 │   data_quality_results   │ │
                                 ├──────────────────────────┤ │
                                 │ id (PK)                  │ │
                                 │ ingestion_run_id (FK)    │◄┘
                                 │ check_name / category    │
                                 │ severity / status        │
                                 │ affected_rows            │
                                 └──────────────────────────┘
```

## 2. Table Specifications

### `complaints`
Stores normalized structured complaint records from official CFPB exports.
- **Indexes:**
  - `ix_complaints_complaint_id` (Unique B-tree index on source identifier)
  - `idx_comp_prod_date` (`(product, date_received)`)
  - `idx_comp_issue_date` (`(issue, date_received)`)
  - `idx_comp_company_date` (`(company, date_received)`)

### `complaint_narratives`
Stores historical consumer complaint text separate from structured complaint fields.
- **Indexes:**
  - `ix_complaint_narratives_complaint_source_id` (Foreign match key)
  - `ix_complaint_narratives_text_hash` (Deduplication lookup)

### `narrative_themes` & `narrative_theme_assignments`
Maintains unsupervised topic clusters and document-to-cluster affinity scores.

### `data_quality_results`
Records automated rule executions for each ingestion run (integrity, completeness, timeliness, linkage).

### `saved_investigations` & `investigation_reports`
Maintains analyst hypothesis configurations and published executive snapshots.
