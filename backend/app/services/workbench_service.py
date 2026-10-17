import re
import time
from typing import Dict, Any, List
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings

ALLOWED_TABLES = {
    "complaints",
    "complaint_narratives",
    "narrative_themes",
    "narrative_theme_assignments",
    "data_quality_results",
    "source_files",
    "ingestion_runs",
}

DISALLOWED_KEYWORDS = [
    r"\bINSERT\b", r"\bUPDATE\b", r"\bDELETE\b", r"\bDROP\b", r"\bALTER\b", 
    r"\bTRUNCATE\b", r"\bCREATE\b", r"\bREPLACE\b", r"\bGRANT\b", r"\bREVOKE\b", 
    r"\bCOPY\b", r"\bINTO\b", r"\bEXEC\b", r"\bEXECUTE\b", r"\bCALL\b", 
    r"\bVACUUM\b", r"\bDO\b", r"\bPREPARE\b", r"\bPG_\w+", r"\bINFORMATION_SCHEMA\b"
]

PRELOADED_QUERIES = [
    {
        "id": "q1",
        "title": "Top 10 Products by Complaint Volume",
        "sql": """SELECT 
    product, 
    COUNT(*) AS total_complaints,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM complaints), 2) AS share_pct
FROM complaints 
GROUP BY product 
ORDER BY total_complaints DESC 
LIMIT 10;"""
    },
    {
        "id": "q2",
        "title": "Company Response Timeliness Compliance",
        "sql": """SELECT 
    company, 
    COUNT(*) AS total_complaints,
    SUM(CASE WHEN timely_response = TRUE THEN 1 ELSE 0 END) AS timely_count,
    ROUND(SUM(CASE WHEN timely_response = TRUE THEN 100.0 ELSE 0.0 END) / COUNT(*), 2) AS timely_rate_pct
FROM complaints 
WHERE timely_response IS NOT NULL 
GROUP BY company 
HAVING COUNT(*) >= 15
ORDER BY timely_rate_pct ASC 
LIMIT 10;"""
    },
    {
        "id": "q3",
        "title": "Narrative Theme Prevalence by Issue",
        "sql": """SELECT 
    c.issue,
    nt.theme_label,
    COUNT(*) AS narrative_count
FROM complaints c
JOIN complaint_narratives cn ON c.complaint_id = cn.complaint_source_id
JOIN narrative_theme_assignments nta ON cn.id = nta.complaint_narrative_id
JOIN narrative_themes nt ON nta.theme_id = nt.id
GROUP BY c.issue, nt.theme_label
ORDER BY narrative_count DESC
LIMIT 15;"""
    },
    {
        "id": "q4",
        "title": "Monthly Complaint Volume by Submission Channel",
        "sql": """SELECT 
    TO_CHAR(date_received, 'YYYY-MM') AS month,
    submitted_via,
    COUNT(*) AS count
FROM complaints
GROUP BY month, submitted_via
ORDER BY month DESC, count DESC
LIMIT 20;"""
    }
]

class WorkbenchService:
    @staticmethod
    def get_schema_metadata() -> Dict[str, Any]:
        """Provides schema documentation and allowed tables for the SQL workbench."""
        tables = [
            {
                "name": "complaints",
                "description": "Normalized structured complaint records from the CFPB database.",
                "columns": [
                    {"name": "id", "type": "INTEGER", "description": "Internal primary key"},
                    {"name": "complaint_id", "type": "VARCHAR(64)", "description": "Official CFPB complaint identifier"},
                    {"name": "date_received", "type": "DATE", "description": "Date consumer submitted complaint"},
                    {"name": "product", "type": "VARCHAR(255)", "description": "High-level financial product"},
                    {"name": "sub_product", "type": "VARCHAR(255)", "description": "Detailed financial sub-product"},
                    {"name": "issue", "type": "VARCHAR(255)", "description": "Primary complaint issue category"},
                    {"name": "sub_issue", "type": "VARCHAR(255)", "description": "Detailed complaint sub-issue"},
                    {"name": "company", "type": "VARCHAR(255)", "description": "Financial institution named"},
                    {"name": "state", "type": "VARCHAR(10)", "description": "Consumer state abbreviation"},
                    {"name": "zip_code", "type": "VARCHAR(20)", "description": "Consumer zip code (masked)"},
                    {"name": "submitted_via", "type": "VARCHAR(50)", "description": "Submission channel (Web, Phone, etc.)"},
                    {"name": "company_response_to_consumer", "type": "VARCHAR(255)", "description": "Response disposition"},
                    {"name": "timely_response", "type": "BOOLEAN", "description": "Whether company responded within statutory window"},
                    {"name": "consumer_disputed", "type": "BOOLEAN", "description": "Whether consumer disputed the response"},
                    {"name": "has_narrative", "type": "BOOLEAN", "description": "Whether consumer published a narrative"},
                ]
            },
            {
                "name": "complaint_narratives",
                "description": "Unstructured historical consumer complaint stories from narrative archives.",
                "columns": [
                    {"name": "id", "type": "INTEGER", "description": "Primary key"},
                    {"name": "complaint_source_id", "type": "VARCHAR(64)", "description": "Join key matching complaints.complaint_id"},
                    {"name": "narrative_text", "type": "TEXT", "description": "Consumer's verbatim complaint narrative"},
                    {"name": "text_hash", "type": "VARCHAR(128)", "description": "SHA-256 hash of normalized text"},
                    {"name": "word_count", "type": "INTEGER", "description": "Number of words in narrative"},
                ]
            },
            {
                "name": "narrative_themes",
                "description": "Thematic clusters extracted by NLP models.",
                "columns": [
                    {"name": "id", "type": "INTEGER", "description": "Primary key"},
                    {"name": "theme_key", "type": "VARCHAR(100)", "description": "Programmatic identifier"},
                    {"name": "theme_label", "type": "VARCHAR(255)", "description": "Human-readable label"},
                    {"name": "description", "type": "TEXT", "description": "Theme definition and scope"},
                    {"name": "keywords_json", "type": "JSON", "description": "Top characteristic keywords"},
                ]
            },
            {
                "name": "narrative_theme_assignments",
                "description": "Mapping linking narratives to thematic clusters.",
                "columns": [
                    {"name": "id", "type": "INTEGER", "description": "Primary key"},
                    {"name": "complaint_narrative_id", "type": "INTEGER", "description": "FK to complaint_narratives.id"},
                    {"name": "theme_id", "type": "INTEGER", "description": "FK to narrative_themes.id"},
                    {"name": "score", "type": "FLOAT", "description": "Assignment similarity score"},
                ]
            },
        ]
        return {
            "allowed_tables": list(ALLOWED_TABLES),
            "tables": tables,
            "preloaded_queries": PRELOADED_QUERIES,
            "rules": [
                "Only read-only SELECT queries are allowed.",
                "Multiple statements separated by semicolon are prohibited.",
                "System tables and schema modification commands are blocked.",
                "Maximum 500 rows returned per query execution.",
                "Statement timeout is set to 5000 milliseconds."
            ]
        }

    @staticmethod
    def validate_sql(raw_sql: str) -> None:
        """Validates that query is strictly a single, read-only SELECT statement."""
        if not raw_sql or not raw_sql.strip():
            raise ValueError("Query string cannot be empty.")

        cleaned = raw_sql.strip()

        # Reject multiple statements (semicolon followed by non-whitespace)
        statements = [s.strip() for s in cleaned.split(";") if s.strip()]
        if len(statements) > 1:
            raise ValueError("Multiple SQL statements are not permitted in the workbench.")

        single_query = statements[0]

        # Strip comments for validation
        no_comments = re.sub(r"--.*$", "", single_query, flags=re.MULTILINE)
        no_comments = re.sub(r"/\*.*?\*/", "", no_comments, flags=re.DOTALL).strip()

        # Must start with SELECT or WITH
        if not re.match(r"^(SELECT|WITH)\b", no_comments, flags=re.IGNORECASE):
            raise ValueError("Only SELECT statements (or WITH ... SELECT) are allowed.")

        # Check for disallowed keywords
        for pattern in DISALLOWED_KEYWORDS:
            if re.search(pattern, no_comments, flags=re.IGNORECASE):
                raise ValueError(f"Prohibited SQL keyword or pattern detected in query: {pattern}")

    @staticmethod
    def execute_query(db: Session, raw_sql: str, row_limit: int = 500) -> Dict[str, Any]:
        """Executes query within a read-only transaction, timeout, and row limit."""
        WorkbenchService.validate_sql(raw_sql)

        # Remove trailing semicolon if present
        clean_sql = raw_sql.strip().rstrip(";")

        # Enforce row limit
        bounded_sql = f"SELECT * FROM ({clean_sql}) AS _user_query LIMIT {min(row_limit, settings.SQL_MAX_ROWS)}"

        start_time = time.perf_counter()
        
        # Set transaction read-only and statement timeout on connection
        conn = db.connection()
        try:
            conn.execute(text("SET TRANSACTION READ ONLY;"))
            conn.execute(text(f"SET statement_timeout = '{settings.SQL_QUERY_TIMEOUT_SECONDS}s';"))
        except Exception:
            # SQLite fallback does not support SET statement_timeout
            pass

        try:
            result_proxy = conn.execute(text(bounded_sql))
            columns = list(result_proxy.keys())
            raw_rows = result_proxy.fetchall()
            
            # Format row values cleanly (dates, decimals, None)
            formatted_rows = []
            for row in raw_rows:
                formatted_rows.append([
                    val.isoformat() if hasattr(val, "isoformat") else val
                    for val in row
                ])

            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            return {
                "columns": columns,
                "rows": formatted_rows,
                "row_count": len(formatted_rows),
                "duration_ms": duration_ms,
                "sql_executed": bounded_sql,
            }
        except Exception as e:
            db.rollback()
            raise ValueError(f"SQL execution error: {str(e)}")
