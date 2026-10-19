import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime, 
    ForeignKey, Float, JSON, Index, func
)
from sqlalchemy.orm import relationship
from app.db.session import Base

class SourceFile(Base):
    __tablename__ = "source_files"

    id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String(255), nullable=False)
    source_url = Column(String(1024), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_checksum = Column(String(128), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    row_count = Column(Integer, default=0)
    source_period_start = Column(Date, nullable=True)
    source_period_end = Column(Date, nullable=True)
    downloaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    ingestion_runs = relationship("IngestionRun", back_populates="source_file", cascade="all, delete-orphan")


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(Integer, primary_key=True, index=True)
    source_file_id = Column(Integer, ForeignKey("source_files.id"), nullable=True)
    status = Column(String(50), nullable=False, default="PENDING")  # SUCCESS, FAILED, RUNNING, PARTIAL
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    rows_read = Column(Integer, default=0)
    rows_inserted = Column(Integer, default=0)
    rows_updated = Column(Integer, default=0)
    rows_rejected = Column(Integer, default=0)
    error_summary = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    source_file = relationship("SourceFile", back_populates="ingestion_runs")
    quality_results = relationship("DataQualityResult", back_populates="ingestion_run", cascade="all, delete-orphan")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String(64), unique=True, index=True, nullable=False)
    date_received = Column(Date, index=True, nullable=False)
    product = Column(String(255), index=True, nullable=False)
    sub_product = Column(String(255), nullable=True)
    issue = Column(String(255), index=True, nullable=False)
    sub_issue = Column(String(255), nullable=True)
    company = Column(String(255), index=True, nullable=False)
    state = Column(String(10), index=True, nullable=True)
    zip_code = Column(String(20), nullable=True)
    submitted_via = Column(String(50), nullable=True)
    date_sent_to_company = Column(Date, nullable=True)
    company_response_to_consumer = Column(String(255), nullable=True)
    timely_response = Column(Boolean, nullable=True)
    consumer_disputed = Column(Boolean, nullable=True)
    tags = Column(String(100), nullable=True)
    has_narrative = Column(Boolean, default=False)
    source_file_id = Column(Integer, ForeignKey("source_files.id"), nullable=True)
    ingestion_run_id = Column(Integer, ForeignKey("ingestion_runs.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        Index("idx_comp_prod_date", "product", "date_received"),
        Index("idx_comp_issue_date", "issue", "date_received"),
        Index("idx_comp_company_date", "company", "date_received"),
    )


class ComplaintNarrative(Base):
    __tablename__ = "complaint_narratives"

    id = Column(Integer, primary_key=True, index=True)
    complaint_source_id = Column(String(64), index=True, nullable=False)
    narrative_text = Column(Text, nullable=False)
    source_file_id = Column(Integer, ForeignKey("source_files.id"), nullable=True)
    ingestion_run_id = Column(Integer, ForeignKey("ingestion_runs.id"), nullable=True)
    text_hash = Column(String(128), index=True, nullable=True)
    word_count = Column(Integer, default=0)
    language_code = Column(String(10), default="en")
    preprocessing_version = Column(String(50), default="v1.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    theme_assignments = relationship("NarrativeThemeAssignment", back_populates="narrative", cascade="all, delete-orphan")
    embedding = relationship("NarrativeEmbedding", back_populates="narrative", uselist=False, cascade="all, delete-orphan")


class NarrativeEmbedding(Base):
    __tablename__ = "narrative_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    complaint_narrative_id = Column(Integer, ForeignKey("complaint_narratives.id"), unique=True, index=True, nullable=False)
    complaint_source_id = Column(String(64), index=True, nullable=False)
    embedding_model = Column(String(100), default="fintracer-semantic-tfidf-384")
    dimension = Column(Integer, default=384)
    vector_json = Column(JSON, nullable=False)  # L2-normalized float array for cosine search
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    narrative = relationship("ComplaintNarrative", back_populates="embedding")


class NarrativeTheme(Base):
    __tablename__ = "narrative_themes"

    id = Column(Integer, primary_key=True, index=True)
    theme_key = Column(String(100), unique=True, index=True, nullable=False)
    theme_label = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    theme_method = Column(String(100), default="TF-IDF_CLUSTERING")
    keywords_json = Column(JSON, nullable=True)
    model_or_rules_version = Column(String(50), default="v1.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    metadata_json = Column(JSON, nullable=True)

    theme_assignments = relationship("NarrativeThemeAssignment", back_populates="theme", cascade="all, delete-orphan")


class NarrativeThemeAssignment(Base):
    __tablename__ = "narrative_theme_assignments"

    id = Column(Integer, primary_key=True, index=True)
    complaint_narrative_id = Column(Integer, ForeignKey("complaint_narratives.id"), index=True, nullable=False)
    theme_id = Column(Integer, ForeignKey("narrative_themes.id"), index=True, nullable=False)
    score = Column(Float, nullable=True)
    assignment_method = Column(String(100), default="TF-IDF_COSINE")
    processing_version = Column(String(50), default="v1.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    narrative = relationship("ComplaintNarrative", back_populates="theme_assignments")
    theme = relationship("NarrativeTheme", back_populates="theme_assignments")


class DataQualityResult(Base):
    __tablename__ = "data_quality_results"

    id = Column(Integer, primary_key=True, index=True)
    ingestion_run_id = Column(Integer, ForeignKey("ingestion_runs.id"), nullable=True)
    check_name = Column(String(255), nullable=False)
    check_category = Column(String(100), default="INTEGRITY")  # INTEGRITY, COMPLETENESS, TIMELINESS, LINKAGE
    severity = Column(String(50), default="INFO")  # INFO, WARNING, ERROR
    status = Column(String(50), default="PASS")  # PASS, WARN, FAIL
    affected_rows = Column(Integer, default=0)
    details_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    ingestion_run = relationship("IngestionRun", back_populates="quality_results")


class SavedInvestigation(Base):
    __tablename__ = "saved_investigations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    question = Column(Text, nullable=False)
    template_key = Column(String(100), nullable=True)
    filters_json = Column(JSON, nullable=True)
    date_range_json = Column(JSON, nullable=True)
    metric_definitions_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    reports = relationship("InvestigationReport", back_populates="investigation", cascade="all, delete-orphan")


class InvestigationReport(Base):
    __tablename__ = "investigation_reports"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(Integer, ForeignKey("saved_investigations.id"), nullable=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="DRAFT")  # DRAFT, PUBLISHED, ARCHIVED
    data_as_of = Column(DateTime, default=datetime.datetime.utcnow)
    report_version = Column(String(50), default="v1.0")
    executive_summary = Column(Text, nullable=True)
    result_snapshot_json = Column(JSON, nullable=True)
    recommendations_json = Column(JSON, nullable=True)
    methodology_notes = Column(Text, nullable=True)
    limitations_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    investigation = relationship("SavedInvestigation", back_populates="reports")
