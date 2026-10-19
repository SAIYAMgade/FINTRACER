export interface OverviewSummary {
  total_complaints: number;
  timely_response_rate: number;
  timely_numerator: number;
  timely_denominator: number;
  narrative_availability_rate: number;
  narratives_count: number;
  disputed_rate: number;
  period_start: string | null;
  period_end: string | null;
}

export interface MonthlyTrend {
  period: string;
  count: number;
  mom_pct_change: number | null;
}

export interface CategoryItem {
  name: string;
  count: number;
  share_pct: number;
}

export interface CategoryBreakdowns {
  products: CategoryItem[];
  issues: CategoryItem[];
  companies: CategoryItem[];
  states: CategoryItem[];
}

export interface ComplaintItem {
  id: number;
  complaint_id: string;
  date_received: string;
  product: string;
  sub_product: string | null;
  issue: string;
  sub_issue: string | null;
  company: string;
  state: string | null;
  zip_code: string | null;
  submitted_via: string | null;
  company_response_to_consumer: string | null;
  timely_response: boolean | null;
  consumer_disputed: boolean | null;
  has_narrative: boolean;
}

export interface ComplaintDetailResponse {
  complaint: ComplaintItem & {
    date_sent_to_company?: string | null;
    tags?: string | null;
  };
  narrative: {
    available: boolean;
    text: string | null;
    word_count: number | null;
    text_hash: string | null;
    message: string;
  };
}

export interface DataQualitySummary {
  dataset_inventory: {
    total_complaints: number;
    total_narratives: number;
    total_ingestion_runs: number;
  };
  dq_status: {
    total_checks: number;
    pass_count: number;
    warn_count: number;
    fail_count: number;
    overall_health: "HEALTHY" | "WARNING" | "DEGRADED";
  };
  missingness_matrix: Array<{
    field: string;
    missing_count: number;
    missing_pct: number;
    is_required: boolean;
  }>;
  recent_checks: Array<{
    id: number;
    check_name: string;
    category: string;
    severity: string;
    status: "PASS" | "WARN" | "FAIL";
    affected_rows: number;
    details: any;
    created_at: string;
  }>;
}

export interface IngestionRunItem {
  id: number;
  source_name: string;
  file_name: string;
  file_checksum: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  rows_read: number;
  rows_inserted: number;
  rows_updated: number;
  rows_rejected: number;
  error_summary: string | null;
  metadata: any;
}

export interface NarrativeExcerpt {
  complaint_id: string;
  score: number;
  snippet: string;
}

export interface NarrativeThemeItem {
  id: number;
  theme_key: string;
  theme_label: string;
  description: string;
  keywords: string[];
  assigned_count: number;
  prevalence_pct: number;
  excerpts: NarrativeExcerpt[];
}

export interface NarrativeIntelligenceSummary {
  total_complaints: number;
  total_narratives: number;
  availability_rate_pct: number;
  themes: NarrativeThemeItem[];
  top_bigrams: Array<{ phrase: string; count: number }>;
  top_trigrams: Array<{ phrase: string; count: number }>;
  product_cross_tab: Array<{ product: string; theme_label: string; count: number }>;
  timeliness_breakdown: Array<{ theme_label: string; timely: number; untimely: number; total: number }>;
  methodology: {
    algorithm: string;
    stop_words: string;
    version: string;
    note: string;
  };
}

export interface EvidencePanelData {
  finding_title: string;
  business_question: string;
  sample_size: string;
  metric_definitions: string;
  calculation_method: string;
  source_dataset_coverage: string;
  sql_reference: string;
  caveats: string;
  suggested_next_investigation: string;
}

export interface InvestigationTemplate {
  key: string;
  title: string;
  description: string;
  default_question: string;
  category: string;
}

export interface InvestigationResult {
  template_key: string;
  title: string;
  data: any;
  evidence_panel: EvidencePanelData;
}

export interface WorkbenchSchema {
  allowed_tables: string[];
  tables: Array<{
    name: string;
    description: string;
    columns: Array<{ name: string; type: string; description: string }>;
  }>;
  preloaded_queries: Array<{ id: string; title: string; sql: string }>;
  rules: string[];
}

export interface WorkbenchExecutionResult {
  columns: string[];
  rows: any[][];
  row_count: number;
  duration_ms: number;
  sql_executed: string;
}

export interface ReportItem {
  id: number;
  title: string;
  status: string;
  data_as_of: string;
  version: string;
  created_at: string;
}

export interface FullReportDetail extends ReportItem {
  investigation_id: number | null;
  executive_summary: string;
  snapshot: any;
  recommendations: string[];
  methodology: string;
  limitations: string;
}

export interface SemanticSearchResultItem {
  complaint_narrative_id: number;
  complaint_source_id: string;
  similarity_score: number;
  product: string;
  issue: string;
  company: string;
  theme_name?: string;
  snippet: string;
  full_narrative: string;
}

export interface AssistantCitationItem {
  reference_tag: string;
  complaint_source_id: string;
  product: string;
  issue: string;
  company: string;
  similarity_score: number;
  snippet: string;
}

