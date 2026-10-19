export const API_BASE = import.meta.env.VITE_API_URL
  ? `${String(import.meta.env.VITE_API_URL).replace(/\/$/, '')}/api`
  : '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `API Error ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; app: string; version: string }>('/health'),
  getReady: () => request<{ status: string; database: string }>('/ready'),
  getMetadata: () => request<any>('/metadata'),

  // Overview
  getOverviewSummary: (params?: { startDate?: string; endDate?: string; product?: string }) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.append('start_date', params.startDate);
    if (params?.endDate) q.append('end_date', params.endDate);
    if (params?.product) q.append('product', params.product);
    return request<any>(`/overview/summary?${q.toString()}`);
  },
  getTrends: (params?: { startDate?: string; endDate?: string; product?: string }) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.append('start_date', params.startDate);
    if (params?.endDate) q.append('end_date', params.endDate);
    if (params?.product) q.append('product', params.product);
    return request<any[]>(`/overview/trends?${q.toString()}`);
  },
  getCategories: () => request<any>('/overview/categories'),

  // Complaints
  getComplaints: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    product?: string;
    issue?: string;
    company?: string;
    state?: string;
    hasNarrative?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.page) q.append('page', params.page.toString());
    if (params.pageSize) q.append('page_size', params.pageSize.toString());
    if (params.search) q.append('search', params.search);
    if (params.product) q.append('product', params.product);
    if (params.issue) q.append('issue', params.issue);
    if (params.company) q.append('company', params.company);
    if (params.state) q.append('state', params.state);
    if (params.hasNarrative !== undefined) q.append('has_narrative', String(params.hasNarrative));
    if (params.sortBy) q.append('sort_by', params.sortBy);
    if (params.sortOrder) q.append('sort_order', params.sortOrder);
    return request<any>(`/complaints?${q.toString()}`);
  },
  getComplaintDetail: (id: string) => request<any>(`/complaints/${id}`),
  getComplaintFilters: () => request<any>('/complaints/filters'),

  // Data Quality
  getDataQualitySummary: () => request<any>('/data-quality/summary'),
  getIngestionRuns: () => request<any[]>('/data-quality/runs'),

  // Ingestion
  seedSampleDataset: () => request<any>('/ingestion/seed-sample', { method: 'POST' }),

  // Narratives
  getNarrativeSummary: () => request<any>('/narratives/summary'),
  reclusterNarratives: (nClusters: number = 5) =>
    request<any>(`/narratives/re-cluster?n_clusters=${nClusters}`, { method: 'POST' }),

  // Investigations
  getInvestigationTemplates: () => request<any[]>('/investigations/templates'),
  runInvestigation: (templateKey: string, params?: any) =>
    request<any>('/investigations/run', {
      method: 'POST',
      body: JSON.stringify({ template_key: templateKey, params }),
    }),
  getSavedInvestigations: () => request<any[]>('/investigations'),
  saveInvestigation: (payload: { title: string; question: string; template_key: string; description?: string; filters_json?: any }) =>
    request<any>('/investigations', { method: 'POST', body: JSON.stringify(payload) }),
  generateReport: (investigationId: number, payload: { title: string; executive_summary: string; recommendations: string[] }) =>
    request<any>(`/investigations/${investigationId}/generate-report`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Reports
  getReports: () => request<any[]>('/reports'),
  getReportDetail: (id: number) => request<any>(`/reports/${id}`),

  // Workbench
  getWorkbenchSchema: () => request<any>('/workbench/schema'),
  executeSql: (sql: string, rowLimit: number = 500) =>
    request<any>('/workbench/execute', {
      method: 'POST',
      body: JSON.stringify({ sql, row_limit: rowLimit }),
    }),

  // Semantic Search
  searchSemantic: (payload: {
    query: string;
    top_k?: number;
    product?: string;
    issue?: string;
    company?: string;
    min_similarity?: number;
  }) =>
    request<{
      query: string;
      count: number;
      top_k: number;
      filters_applied: Record<string, any>;
      duration_seconds: number;
      results: Array<{
        complaint_narrative_id: number;
        complaint_source_id: string;
        similarity_score: number;
        product: string;
        issue: string;
        company: string;
        theme_name?: string;
        snippet: string;
        full_narrative: string;
      }>;
    }>('/semantic-search/query', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getSemanticStatus: () =>
    request<{
      total_indexed: number;
      total_narratives: number;
      dimension: number;
      model: string;
    }>('/semantic-search/status'),
  reindexSemantic: () => request<any>('/semantic-search/index', { method: 'POST' }),

  // Investigation Assistant (RAG)
  askAssistant: (payload: {
    question: string;
    top_k?: number;
    product_filter?: string;
    company_filter?: string;
  }) =>
    request<{
      question: string;
      status: 'GROUNDED_ANSWER' | 'INSUFFICIENT_EVIDENCE' | 'REFUSED_SECURITY' | 'EMPTY_QUERY';
      answer_markdown: string;
      duration_ms?: number;
      authoritative_sql_metrics?: {
        product?: string;
        total_complaints?: number;
        timely_response_rate?: number;
        timely_response_rate_pct?: number;
        narrative_coverage_pct?: number;
        top_issues?: any[];
        top_companies?: any[];
      };
      executed_sql_query?: string;
      citations: Array<{
        reference_tag?: string;
        complaint_id?: string;
        complaint_source_id?: string;
        product?: string;
        issue?: string;
        company?: string;
        similarity_score?: number;
        snippet?: string;
      }>;
      grounding_metadata?: {
        total_citations?: number;
        hallucination_prevention_mode?: string;
        retrieval_model?: string;
        metrics_source?: string;
        latency_seconds?: number;
      };
    }>('/assistant/ask', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAssistantSampleQuestions: () => request<string[]>('/assistant/sample-questions'),
  runAssistantEvaluation: () =>
    request<{
      evaluation_title: string;
      total_test_cases: number;
      passed_test_cases: number;
      pass_rate_pct: number;
      recall_at_k_pct: number;
      mean_reciprocal_rank: number;
      grounding_faithfulness_score: string;
      benchmark_duration_seconds: number;
      test_results: Array<{
        case_id: string;
        name: string;
        question: string;
        status: 'PASS' | 'FAIL';
        actual_response_type: string;
        citations_count: number;
        first_citation?: string;
        latency_ms: number;
      }>;
    }>('/assistant/evaluate'),
};

