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
};
