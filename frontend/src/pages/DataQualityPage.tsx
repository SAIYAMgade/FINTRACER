import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Database,
  History,
  FileCheck,
  Download,
} from 'lucide-react';
import type { DataQualitySummary, IngestionRunItem } from '../types';

export const DataQualityPage: React.FC = () => {
  const { data: dqData, isLoading: loadingDQ } = useQuery<DataQualitySummary>({
    queryKey: ['data-quality-summary'],
    queryFn: () => api.getDataQualitySummary(),
  });

  const { data: runsData } = useQuery<IngestionRunItem[]>({
    queryKey: ['ingestion-runs'],
    queryFn: () => api.getIngestionRuns(),
  });

  const handleExportDQReport = () => {
    if (!dqData) return;
    const reportText = [
      '# RESOLVEX Data Quality & Ingestion Audit Report',
      `Generated At: ${new Date().toISOString()}`,
      `Overall Health: ${dqData.dq_status.overall_health}`,
      '',
      '## 1. Dataset Inventory',
      `- Total Complaints: ${dqData.dataset_inventory.total_complaints}`,
      `- Total Narratives: ${dqData.dataset_inventory.total_narratives}`,
      `- Total Ingestion Runs: ${dqData.dataset_inventory.total_ingestion_runs}`,
      '',
      '## 2. Missingness Analysis',
      ...dqData.missingness_matrix.map(
        (m) => `- ${m.field}: ${m.missing_count} missing (${m.missing_pct}%) [Required: ${m.is_required}]`
      ),
      '',
      '## 3. Automated Integrity Checks',
      ...dqData.recent_checks.map(
        (c) => `- [${c.status}] ${c.check_name} (Category: ${c.category}, Affected Rows: ${c.affected_rows})`
      ),
    ].join('\n');

    const blob = new Blob([reportText], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resolvex_data_quality_report_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg shadow-sm">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#3B82F6]" />
            Data Quality & Ingestion Governance Center
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Automated schema validation, missingness profiling, duplicate enforcement, and narrative linkage audits.
          </p>
        </div>

        <button
          onClick={handleExportDQReport}
          className="flex items-center space-x-1.5 bg-[#1A1A1A] hover:bg-[#262626] text-xs text-[#E5E7EB] px-3.5 py-1.5 rounded border border-[#333333] transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Export DQ Audit Report</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Structured Complaints"
          value={loadingDQ ? '...' : dqData?.dataset_inventory.total_complaints.toLocaleString() || '0'}
          subtitle="Normalized relational records"
          icon={Database}
        />

        <StatCard
          title="Historical Narratives"
          value={loadingDQ ? '...' : dqData?.dataset_inventory.total_narratives.toLocaleString() || '0'}
          subtitle="Unstructured consumer stories"
          icon={FileCheck}
        />

        <StatCard
          title="Integrity Checks Passed"
          value={loadingDQ ? '...' : `${dqData?.dq_status.pass_count || 0} / ${dqData?.dq_status.total_checks || 0}`}
          subtitle={`${dqData?.dq_status.warn_count || 0} warnings, ${dqData?.dq_status.fail_count || 0} failures`}
          icon={CheckCircle2}
        />

        <StatCard
          title="Overall Pipeline Health"
          value={loadingDQ ? '...' : dqData?.dq_status.overall_health || 'UNKNOWN'}
          subtitle="Continuous automated evaluation"
          icon={AlertTriangle}
          badge={dqData?.dq_status.overall_health === 'HEALTHY' ? 'Passing' : 'Action Required'}
        />
      </div>

      {/* Missingness Matrix & Automated Checks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missingness Matrix */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Missingness & Field Completeness Matrix</h3>
          <p className="text-xs text-[#9CA3AF] mb-4">
            Measures null proportions across optional and required CFPB schema fields.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black text-[#9CA3AF] border-b border-[#262626]">
                <tr>
                  <th className="py-2.5 px-3">Field Name</th>
                  <th className="py-2.5 px-3 text-right">Missing Rows</th>
                  <th className="py-2.5 px-3 text-right">Missing %</th>
                  <th className="py-2.5 px-3 text-center">Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] text-[#D1D5DB]">
                {dqData?.missingness_matrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#141414]">
                    <td className="py-2.5 px-3 font-mono text-white">{row.field}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#93C5FD]">
                      {row.missing_count}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          row.missing_pct > 20 ? 'bg-[#7F1D1D]/30 text-[#EF4444]' : 'text-[#9CA3AF]'
                        }`}
                      >
                        {row.missing_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] text-[#9CA3AF] bg-[#1A1A1A] px-2 py-0.5 rounded border border-[#333333]">
                        {row.is_required ? 'Required' : 'Optional'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Automated Integrity Checks */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Automated Validation Checks</h3>
          <p className="text-xs text-[#9CA3AF] mb-4">
            Pre-load format validation, duplicate detection, and post-load reconciliation rules.
          </p>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-black text-[#9CA3AF] border-b border-[#262626]">
                <tr>
                  <th className="py-2.5 px-3">Check Rule</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Affected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] text-[#D1D5DB]">
                {dqData?.recent_checks.map((check) => (
                  <tr key={check.id} className="hover:bg-[#141414]">
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-white block">{check.check_name}</span>
                      <span className="text-[10px] text-[#9CA3AF]">{check.category}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          check.status === 'PASS'
                            ? 'bg-[#064E3B]/50 text-[#10B981]'
                            : check.status === 'WARN'
                            ? 'bg-[#78350F]/50 text-[#F59E0B]'
                            : 'bg-[#7F1D1D]/50 text-[#EF4444]'
                        }`}
                      >
                        {check.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#93C5FD]">
                      {check.affected_rows}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ingestion Runs History */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <History className="w-4 h-4 text-[#3B82F6]" />
          ETL Ingestion Execution Log
        </h3>
        <p className="text-xs text-[#9CA3AF] mb-4">
          Traceable history of all batch and sample ingestion runs with deterministic row reconciliation.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black text-[#9CA3AF] border-b border-[#262626] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3">Run ID</th>
                <th className="py-3 px-3">Source & File</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Read</th>
                <th className="py-3 px-3 text-right">Inserted</th>
                <th className="py-3 px-3 text-right">Updated</th>
                <th className="py-3 px-3 text-right">Rejected</th>
                <th className="py-3 px-3">Started At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222] text-[#D1D5DB]">
              {runsData?.map((run) => (
                <tr key={run.id} className="hover:bg-[#141414]">
                  <td className="py-2.5 px-3 font-mono font-medium text-[#60A5FA]">#{run.id}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-white block">{run.source_name}</span>
                    <span className="text-[10px] text-[#9CA3AF] font-mono">{run.file_name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        run.status === 'SUCCESS'
                          ? 'bg-[#064E3B]/50 text-[#10B981]'
                          : run.status === 'PARTIAL'
                          ? 'bg-[#78350F]/50 text-[#F59E0B]'
                          : 'bg-[#7F1D1D]/50 text-[#EF4444]'
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">{run.rows_read}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#10B981]">{run.rows_inserted}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#93C5FD]">{run.rows_updated}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#EF4444]">{run.rows_rejected}</td>
                  <td className="py-2.5 px-3 text-[#9CA3AF] font-mono text-[11px]">{run.started_at?.replace('T', ' ').slice(0, 19)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
