import csv
import hashlib
import os
import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.entities import (
    SourceFile,
    IngestionRun,
    Complaint,
    ComplaintNarrative,
    DataQualityResult,
)

class IngestionService:
    @staticmethod
    def calculate_file_checksum(file_path: str) -> str:
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        return sha256.hexdigest()

    @staticmethod
    def ingest_complaints(
        db: Session,
        file_path: str,
        source_name: str = "CFPB Consumer Complaint Database",
        source_url: Optional[str] = "https://www.consumerfinance.gov/data-research/consumer-complaints/",
    ) -> IngestionRun:
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        checksum = IngestionService.calculate_file_checksum(file_path) if os.path.exists(file_path) else None

        source_file = SourceFile(
            source_name=source_name,
            source_url=source_url,
            file_name=file_name,
            file_checksum=checksum,
            file_size_bytes=file_size,
        )
        db.add(source_file)
        db.flush()

        run = IngestionRun(
            source_file_id=source_file.id,
            status="RUNNING",
            started_at=datetime.datetime.utcnow(),
        )
        db.add(run)
        db.flush()

        rows_read = 0
        rows_inserted = 0
        rows_updated = 0
        rows_rejected = 0
        rejection_reasons = []

        seen_ids = set()
        duplicate_count = 0
        missing_issue_count = 0
        invalid_date_count = 0

        min_date = None
        max_date = None

        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            batch = []
            for row in reader:
                rows_read += 1
                cid = row.get("complaint_id", "").strip()
                if not cid:
                    rows_rejected += 1
                    rejection_reasons.append(f"Row {rows_read}: Missing complaint_id")
                    continue

                if cid in seen_ids:
                    duplicate_count += 1
                    rows_rejected += 1
                    rejection_reasons.append(f"Row {rows_read}: Duplicate complaint_id {cid} in batch")
                    continue
                seen_ids.add(cid)

                # Date parsing
                raw_rec_date = row.get("date_received", "").strip()
                try:
                    rec_date = datetime.datetime.strptime(raw_rec_date, "%Y-%m-%d").date()
                except ValueError:
                    invalid_date_count += 1
                    rows_rejected += 1
                    rejection_reasons.append(f"Row {rows_read}: Invalid date_received '{raw_rec_date}'")
                    continue

                if not min_date or rec_date < min_date:
                    min_date = rec_date
                if not max_date or rec_date > max_date:
                    max_date = rec_date

                # Issue validation
                issue = row.get("issue", "").strip()
                if not issue:
                    missing_issue_count += 1
                    rows_rejected += 1
                    rejection_reasons.append(f"Row {rows_read}: Missing required field 'issue'")
                    continue

                # Check if record already exists in database (idempotency)
                existing = db.query(Complaint).filter(Complaint.complaint_id == cid).first()
                if existing:
                    rows_updated += 1
                    continue

                raw_sent_date = row.get("date_sent_to_company", "").strip()
                sent_date = None
                if raw_sent_date:
                    try:
                        sent_date = datetime.datetime.strptime(raw_sent_date, "%Y-%m-%d").date()
                    except ValueError:
                        pass

                timely_val = row.get("timely_response", "").strip().lower()
                timely = True if timely_val in ["yes", "true", "1"] else (False if timely_val in ["no", "false", "0"] else None)

                disputed_val = row.get("consumer_disputed", "").strip().lower()
                disputed = True if disputed_val in ["yes", "true", "1"] else (False if disputed_val in ["no", "false", "0"] else None)

                has_narrative_val = row.get("has_narrative", "").strip().lower()
                has_narrative = has_narrative_val in ["yes", "true", "1"]

                complaint = Complaint(
                    complaint_id=cid,
                    date_received=rec_date,
                    product=row.get("product", "").strip() or "Unknown Product",
                    sub_product=row.get("sub_product", "").strip() or None,
                    issue=issue,
                    sub_issue=row.get("sub_issue", "").strip() or None,
                    company=row.get("company", "").strip() or "Unknown Company",
                    state=row.get("state", "").strip() or None,
                    zip_code=row.get("zip_code", "").strip() or None,
                    submitted_via=row.get("submitted_via", "").strip() or "Web",
                    date_sent_to_company=sent_date,
                    company_response_to_consumer=row.get("company_response_to_consumer", "").strip() or "In progress",
                    timely_response=timely,
                    consumer_disputed=disputed,
                    tags=row.get("tags", "").strip() or None,
                    has_narrative=has_narrative,
                    source_file_id=source_file.id,
                    ingestion_run_id=run.id,
                )
                batch.append(complaint)

                if len(batch) >= 500:
                    db.bulk_save_objects(batch)
                    rows_inserted += len(batch)
                    batch = []

            if batch:
                db.bulk_save_objects(batch)
                rows_inserted += len(batch)

        # Update source file metadata
        source_file.row_count = rows_read
        source_file.source_period_start = min_date
        source_file.source_period_end = max_date

        # Update run stats
        run.rows_read = rows_read
        run.rows_inserted = rows_inserted
        run.rows_updated = rows_updated
        run.rows_rejected = rows_rejected
        run.completed_at = datetime.datetime.utcnow()
        run.status = "SUCCESS" if rows_rejected == 0 else "PARTIAL"
        run.error_summary = "; ".join(rejection_reasons[:10]) if rejection_reasons else None
        run.metadata_json = {
            "duplicate_count": duplicate_count,
            "missing_issue_count": missing_issue_count,
            "invalid_date_count": invalid_date_count,
            "sample_rejections": rejection_reasons[:5],
        }

        # Data Quality Checks Registration
        dq_results = [
            DataQualityResult(
                ingestion_run_id=run.id,
                check_name="Identifier Uniqueness (Duplicate Check)",
                check_category="INTEGRITY",
                severity="WARNING" if duplicate_count > 0 else "INFO",
                status="PASS" if duplicate_count == 0 else "WARN",
                affected_rows=duplicate_count,
                details_json={"message": f"Found {duplicate_count} duplicate complaint identifiers in batch.", "action": "Duplicates rejected during parsing."},
            ),
            DataQualityResult(
                ingestion_run_id=run.id,
                check_name="Required Field Completeness (Issue)",
                check_category="COMPLETENESS",
                severity="ERROR" if missing_issue_count > 0 else "INFO",
                status="PASS" if missing_issue_count == 0 else "FAIL",
                affected_rows=missing_issue_count,
                details_json={"message": f"Found {missing_issue_count} rows with missing 'issue' field.", "action": "Rows rejected."},
            ),
            DataQualityResult(
                ingestion_run_id=run.id,
                check_name="Date Format & Range Validity",
                check_category="TIMELINESS",
                severity="WARNING" if invalid_date_count > 0 else "INFO",
                status="PASS" if invalid_date_count == 0 else "WARN",
                affected_rows=invalid_date_count,
                details_json={"message": f"Found {invalid_date_count} rows with invalid date formats.", "action": "Rows rejected."},
            ),
        ]
        db.add_all(dq_results)
        db.commit()
        return run

    @staticmethod
    def ingest_narratives(
        db: Session,
        file_path: str,
        source_name: str = "CFPB Historical Complaint Narrative Archive",
    ) -> IngestionRun:
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        checksum = IngestionService.calculate_file_checksum(file_path) if os.path.exists(file_path) else None

        source_file = SourceFile(
            source_name=source_name,
            file_name=file_name,
            file_checksum=checksum,
            file_size_bytes=file_size,
        )
        db.add(source_file)
        db.flush()

        run = IngestionRun(
            source_file_id=source_file.id,
            status="RUNNING",
            started_at=datetime.datetime.utcnow(),
        )
        db.add(run)
        db.flush()

        rows_read = 0
        rows_inserted = 0
        rows_updated = 0
        rows_rejected = 0
        unmatched_count = 0

        # Query existing complaint IDs for fast lookup
        existing_complaint_ids = set(
            row[0] for row in db.query(Complaint.complaint_id).all()
        )

        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            batch = []
            for row in reader:
                rows_read += 1
                source_id = row.get("complaint_source_id", "").strip()
                text = row.get("narrative_text", "").strip()

                if not source_id or not text:
                    rows_rejected += 1
                    continue

                # Check if matched to structured complaint
                if source_id not in existing_complaint_ids:
                    unmatched_count += 1

                # Check existing narrative (idempotency)
                existing = db.query(ComplaintNarrative).filter(
                    ComplaintNarrative.complaint_source_id == source_id
                ).first()

                if existing:
                    rows_updated += 1
                    continue

                text_hash = row.get("text_hash") or hashlib.sha256(text.encode("utf-8")).hexdigest()
                word_count = int(row.get("word_count") or len(text.split()))

                narrative = ComplaintNarrative(
                    complaint_source_id=source_id,
                    narrative_text=text,
                    source_file_id=source_file.id,
                    ingestion_run_id=run.id,
                    text_hash=text_hash,
                    word_count=word_count,
                    language_code=row.get("language_code", "en"),
                    preprocessing_version=row.get("preprocessing_version", "v1.0"),
                )
                batch.append(narrative)

                if len(batch) >= 500:
                    db.bulk_save_objects(batch)
                    rows_inserted += len(batch)
                    batch = []

            if batch:
                db.bulk_save_objects(batch)
                rows_inserted += len(batch)

        source_file.row_count = rows_read
        run.rows_read = rows_read
        run.rows_inserted = rows_inserted
        run.rows_updated = rows_updated
        run.rows_rejected = rows_rejected
        run.completed_at = datetime.datetime.utcnow()
        run.status = "SUCCESS"
        run.metadata_json = {
            "unmatched_count": unmatched_count,
            "matched_count": rows_read - unmatched_count,
            "matching_rate_pct": round(((rows_read - unmatched_count) / max(rows_read, 1)) * 100, 2),
        }

        # Data Quality Check: Narrative Linkage Coverage
        linkage_dq = DataQualityResult(
            ingestion_run_id=run.id,
            check_name="Narrative to Structured Linkage Coverage",
            check_category="LINKAGE",
            severity="WARNING" if unmatched_count > 0 else "INFO",
            status="PASS" if unmatched_count == 0 else "WARN",
            affected_rows=unmatched_count,
            details_json={
                "total_narratives": rows_read,
                "unmatched_count": unmatched_count,
                "matched_count": rows_read - unmatched_count,
                "coverage_pct": round(((rows_read - unmatched_count) / max(rows_read, 1)) * 100, 2),
                "message": f"Verified {rows_read - unmatched_count} narratives successfully linked to structured complaints."
            },
        )
        db.add(linkage_dq)
        db.commit()
        return run
