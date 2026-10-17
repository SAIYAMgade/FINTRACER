# RESOLVEX Data Source Documentation & Governance

## 1. Official Data Sources

### 1.1 CFPB Consumer Complaint Database
- **Official Source URL:** [https://www.consumerfinance.gov/data-research/consumer-complaints/](https://www.consumerfinance.gov/data-research/consumer-complaints/)
- **API Field Documentation:** [https://cfpb.github.io/api/ccdb/fields.html](https://cfpb.github.io/api/ccdb/fields.html)
- **API Release Notes:** [https://cfpb.github.io/api/ccdb/release-notes.html](https://cfpb.github.io/api/ccdb/release-notes.html)
- **Intended Meaning:** Publicly disclosed complaints submitted by consumers against financial services companies under the jurisdiction of the CFPB.
- **Join Key:** `complaint_id` (unique alphanumeric string assigned by the CFPB portal).

### 1.2 CFPB Historical Complaint Narrative Archive
- **Official Archive URL:** [https://www.consumerfinance.gov/foia-requests/foia-electronic-reading-room/cfpb-consumer-complaint-database-narratives-archive/](https://www.consumerfinance.gov/foia-requests/foia-electronic-reading-room/cfpb-consumer-complaint-database-narratives-archive/)
- **Intended Meaning:** Unstructured consumer complaint stories where consumers affirmatively opted to share their narrative publicly after scrubbing of direct PII.
- **Join Key:** `complaint_source_id` matching `complaint_id`.

## 2. Ingested Dataset Summary (Sample & Benchmark)

| Metric | Recorded Value | Notes |
| :--- | :--- | :--- |
| **Source Period** | 2025-01-01 to 2026-06-30 | Multi-quarter observation window |
| **Total Rows Read** | 1,202 | Ingested via pipeline |
| **Valid Records Loaded** | 1,200 | Normalized into PostgreSQL |
| **Duplicate Records Detected** | 1 | Rejected during batch integrity audit |
| **Missing Required Field (Issue)** | 1 | Rejected during schema validation |
| **Narrative Rows Ingested** | 544 | Linked via `complaint_source_id` |
| **Narrative Availability Rate** | 44.92% (539 / 1200) | Reflects voluntary consumer opt-in rate |
| **Unmatched Narratives** | 5 | Retained and reported under DQ metrics |
| **Timely Response Rate** | 96.92% (1163 / 1200) | Within statutory response window |

## 3. Governance & Text Handling
- **PII Scrubbing:** Verbatim narratives are treated as public-source text but are rendered safely with HTML escaping and text truncation in previews.
- **No External LLM Leakage:** Narrative text is processed exclusively via local Scikit-Learn TF-IDF vectorization. No narratives are sent to external third-party LLMs.
- **Non-destructive Ingestion:** Raw texts remain unaltered while normalized lowercase representations are used for n-gram frequency extraction.
