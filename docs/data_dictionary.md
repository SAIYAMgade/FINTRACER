# RESOLVEX Data Dictionary

This document defines all relational attributes across the primary analytical schema.

## 1. `complaints` Table

| Column Name | PostgreSQL Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | No (PK) | Internal auto-incrementing surrogate primary key. |
| `complaint_id` | `VARCHAR(64)` | No (Unique) | Official CFPB unique identifier for the complaint record. |
| `date_received` | `DATE` | No | Date the complaint was received by the CFPB. |
| `product` | `VARCHAR(255)` | No | High-level financial product (e.g. Credit reporting, Debt collection, Mortgage). |
| `sub_product` | `VARCHAR(255)` | Yes | Specific sub-product classification. |
| `issue` | `VARCHAR(255)` | No | Primary regulatory issue category described in the complaint. |
| `sub_issue` | `VARCHAR(255)` | Yes | Detailed sub-issue classification. |
| `company` | `VARCHAR(255)` | No | Formal corporate name of the financial institution named. |
| `state` | `VARCHAR(10)` | Yes | Two-letter state postal abbreviation of the consumer. |
| `zip_code` | `VARCHAR(20)` | Yes | Five-digit or three-digit masked zip code of the consumer. |
| `submitted_via` | `VARCHAR(50)` | Yes | Submission intake channel (e.g. Web, Phone, Postal mail, Referral). |
| `date_sent_to_company` | `DATE` | Yes | Date the CFPB routed the complaint to the financial institution. |
| `company_response_to_consumer` | `VARCHAR(255)` | Yes | Final disposition provided by the company (e.g. Closed with explanation). |
| `timely_response` | `BOOLEAN` | Yes | Whether the company responded within the statutory window. |
| `consumer_disputed` | `BOOLEAN` | Yes | Whether the consumer formally disputed the company's resolution. |
| `tags` | `VARCHAR(100)` | Yes | Identifying tags (e.g. Older American, Servicemember). |
| `has_narrative` | `BOOLEAN` | No | Flag indicating if a matched consumer narrative is available. |

## 2. `complaint_narratives` Table

| Column Name | PostgreSQL Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | No (PK) | Internal primary key. |
| `complaint_source_id` | `VARCHAR(64)` | No (Indexed)| Join key corresponding to `complaints.complaint_id`. |
| `narrative_text` | `TEXT` | No | Verbatim narrative written by the consumer. |
| `text_hash` | `VARCHAR(128)` | Yes | SHA-256 hash of normalized text for deduplication. |
| `word_count` | `INTEGER` | No | Count of words in narrative text. |
| `language_code` | `VARCHAR(10)` | No | Detected language code (default `en`). |
| `preprocessing_version`| `VARCHAR(50)` | No | Version of text normalization pipeline. |

## 3. `narrative_themes` Table

| Column Name | PostgreSQL Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | No (PK) | Internal primary key. |
| `theme_key` | `VARCHAR(100)` | No (Unique) | Programmatic unique key (e.g. `THEME_CREDIT_REPORTING`). |
| `theme_label` | `VARCHAR(255)` | No | Human-readable title for the extracted topic. |
| `description` | `TEXT` | Yes | Plain-English summary of topics covered in the theme. |
| `theme_method` | `VARCHAR(100)` | No | Algorithm used (e.g. `TF-IDF_KMEANS`). |
| `keywords_json` | `JSON` | Yes | Top characteristic keywords for the cluster. |
