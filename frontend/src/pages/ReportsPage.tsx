import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, API_BASE } from '../api/client';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Code2,
  BookOpen,
} from 'lucide-react';
import type { ReportItem, FullReportDetail } from '../types';

export const ReportsPage: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  const { data: reports, isLoading } = useQuery<ReportItem[]>({
    queryKey: ['reports-list'],
    queryFn: () => api.getReports(),
  });

  // Select first report if none selected
  React.useEffect(() => {
    if (reports && reports.length > 0 && selectedReportId === null) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  const { data: reportDetail, isLoading: loadingDetail } = useQuery<FullReportDetail>({
    queryKey: ['report-detail', selectedReportId],
    queryFn: () => api.getReportDetail(selectedReportId!),
    enabled: selectedReportId !== null,
  });

  const handleDownloadMarkdown = async () => {
    if (!selectedReportId) return;
    try {
      const res = await fetch(`${API_BASE}/reports/${selectedReportId}/export`);
      const mdText = await res.text();
      const blob = new Blob([mdText], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fintracer_report_${selectedReportId}.md`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#3B82F6]" />
              Executive Investigation Reports & Snapshots
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Defensible, reproducible business findings backed by captured analytical state, SQL queries, and governance caveats.
            </p>
          </div>

          {selectedReportId && (
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center space-x-1.5 bg-[#1A1A1A] hover:bg-[#262626] text-xs text-[#E5E7EB] px-3.5 py-1.5 rounded border border-[#333333] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Download Markdown Report</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Reports Index Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#3B82F6]" />
            Report Library
          </h3>

          <div className="space-y-2">
            {isLoading ? (
              <div className="text-xs text-[#6B7280] p-4 text-center">Loading reports...</div>
            ) : reports?.length === 0 ? (
              <div className="text-xs text-[#6B7280] p-4 text-center bg-[#0D0D0D] rounded border border-[#262626]">
                No reports generated yet. Run an investigation in Investigation Studio and click &quot;Generate Report&quot;.
              </div>
            ) : (
              reports?.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReportId(r.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                    selectedReportId === r.id
                      ? 'bg-[#141414] border-[#3B82F6] text-white shadow-xs'
                      : 'bg-[#0D0D0D] border-[#262626] text-[#9CA3AF] hover:border-[#383838] hover:text-[#E5E7EB]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-[#60A5FA]">v{r.version}</span>
                    <span className="text-[10px] bg-[#064E3B]/40 text-[#10B981] font-semibold px-1.5 py-0.2 rounded">
                      {r.status}
                    </span>
                  </div>
                  <span className="font-semibold block text-white line-clamp-2 leading-tight">
                    {r.title}
                  </span>
                  <span className="text-[10px] text-[#6B7280] block mt-1 font-mono">
                    {r.created_at?.slice(0, 10)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Selected Report Content */}
        <div className="lg:col-span-3">
          {loadingDetail ? (
            <div className="bg-[#0D0D0D] border border-[#262626] p-12 rounded-lg text-center text-xs text-[#9CA3AF]">
              Loading report snapshot...
            </div>
          ) : reportDetail ? (
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-6 space-y-6 shadow-sm">
              {/* Report Header */}
              <div className="border-b border-[#262626] pb-4">
                <div className="flex items-center space-x-2 text-xs text-[#9CA3AF] mb-2 font-mono">
                  <span>Version {reportDetail.version}</span>
                  <span>•</span>
                  <span>Published {reportDetail.created_at?.replace('T', ' ').slice(0, 19)}</span>
                  <span>•</span>
                  <span>Status: <strong className="text-[#10B981]">{reportDetail.status}</strong></span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {reportDetail.title}
                </h2>
              </div>

              {/* 1. Executive Summary */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#60A5FA] uppercase tracking-wider">
                  1. Executive Summary
                </h3>
                <div className="bg-black border border-[#262626] p-4 rounded-lg text-xs leading-relaxed text-[#D1D5DB]">
                  {reportDetail.executive_summary}
                </div>
              </div>

              {/* 2. Key Findings & Evidence Snapshot */}
              {reportDetail.snapshot?.evidence_panel && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#60A5FA] uppercase tracking-wider">
                    2. Analytical Finding & Evidence
                  </h3>
                  <div className="bg-[#141414] border-l-4 border-[#3B82F6] p-4 rounded-r-lg space-y-2 text-xs">
                    <p className="font-semibold text-white">
                      {reportDetail.snapshot.evidence_panel.finding_title}
                    </p>
                    <p className="text-[#9CA3AF]">
                      <strong>Question:</strong> {reportDetail.snapshot.evidence_panel.business_question}
                    </p>
                    <p className="text-[#9CA3AF]">
                      <strong>Sample Size:</strong> {reportDetail.snapshot.evidence_panel.sample_size}
                    </p>
                  </div>

                  {/* SQL Query Snapshot */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#9CA3AF] flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                      Underlying SQL Calculation Reference
                    </span>
                    <pre className="bg-black border border-[#262626] p-3 rounded font-mono text-[11px] text-[#93C5FD] overflow-x-auto whitespace-pre">
                      {reportDetail.snapshot.evidence_panel.sql_reference}
                    </pre>
                  </div>
                </div>
              )}

              {/* 3. Recommendations */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#60A5FA] uppercase tracking-wider">
                  3. Actionable Business Recommendations
                </h3>
                <div className="space-y-2">
                  {reportDetail.recommendations?.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-start space-x-2.5 bg-black border border-[#262626] p-3 rounded-lg text-xs text-[#E5E7EB]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Methodology & Limitations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#262626] pt-4 text-xs">
                <div>
                  <span className="text-[#6B7280] font-semibold block uppercase text-[10px] mb-1">
                    Methodology Notes
                  </span>
                  <p className="text-[#9CA3AF] leading-relaxed">{reportDetail.methodology}</p>
                </div>
                <div>
                  <span className="text-[#6B7280] font-semibold block uppercase text-[10px] mb-1">
                    Data Governance & Limitations
                  </span>
                  <p className="text-[#9CA3AF] leading-relaxed">{reportDetail.limitations}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0D0D0D] border border-[#262626] p-12 rounded-lg text-center text-xs text-[#9CA3AF]">
              Select a report from the library to inspect details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
