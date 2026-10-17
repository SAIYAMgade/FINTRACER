import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { EChart } from '../components/EChart';
import { EvidencePanel } from '../components/EvidencePanel';
import {
  SearchCode,
  Play,
  BookmarkPlus,
  FileCheck2,
  TrendingUp,
  Scale,
  Clock,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import type { InvestigationTemplate, InvestigationResult } from '../types';

export const InvestigationStudioPage: React.FC = () => {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('TEMPLATE_COMPLAINT_TREND');
  const [breakdownBy, setBreakdownBy] = useState<string>('product');
  const [baselineStart, setBaselineStart] = useState<string>('2025-01-01');
  const [baselineEnd, setBaselineEnd] = useState<string>('2025-06-30');
  const [currentStart, setCurrentStart] = useState<string>('2025-07-01');
  const [currentEnd, setCurrentEnd] = useState<string>('2026-06-30');

  // Modal states
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveTitle, setSaveTitle] = useState<string>('');
  const [saveDescription, setSaveDescription] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportTitle, setReportTitle] = useState<string>('');
  const [reportSummary, setReportSummary] = useState<string>('');
  const [reportRecs, setReportRecs] = useState<string>('1. Prioritize customer service staffing for credit reporting disputes.\n2. Review third-party debt collection validation notices.');
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);

  // Fetch templates
  const { data: templates } = useQuery<InvestigationTemplate[]>({
    queryKey: ['investigation-templates'],
    queryFn: () => api.getInvestigationTemplates(),
  });

  // Run mutation
  const runMutation = useMutation<InvestigationResult, Error, any>({
    mutationFn: (params) => api.runInvestigation(selectedTemplateKey, params),
  });

  const handleRun = () => {
    runMutation.mutate({
      baseline_start: baselineStart,
      baseline_end: baselineEnd,
      current_start: currentStart,
      current_end: currentEnd,
      breakdown_by: breakdownBy,
    });
  };

  // Re-run immediately whenever template changes
  useEffect(() => {
    handleRun();
  }, [selectedTemplateKey]);

  const currentTemplate = templates?.find((t) => t.key === selectedTemplateKey);
  const investigationResult = runMutation.data;
  const isCurrentResult = investigationResult?.template_key === selectedTemplateKey;

  // Build Waterfall Chart for Template A
  let waterfallChartOption: any = null;
  if (selectedTemplateKey === 'TEMPLATE_COMPLAINT_TREND' && isCurrentResult && investigationResult?.data?.waterfall_chart) {
    const wfData = investigationResult.data.waterfall_chart;
    const categories = wfData.map((d: any) => d.name);

    let currentAccum = 0;
    const placeholderData: number[] = [];
    const stepData: number[] = [];

    for (let i = 0; i < wfData.length; i++) {
      const item = wfData[i];
      if (item.is_total) {
        placeholderData.push(0);
        stepData.push(item.value);
        currentAccum = item.value;
      } else {
        if (item.value >= 0) {
          placeholderData.push(currentAccum);
          stepData.push(item.value);
          currentAccum += item.value;
        } else {
          currentAccum += item.value;
          placeholderData.push(currentAccum);
          stepData.push(Math.abs(item.value));
        }
      }
    }

    waterfallChartOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const tar = params[1];
          const raw = wfData.find((w: any) => w.name === tar.name);
          const sign = raw && !raw.is_total && raw.value > 0 ? '+' : '';
          return `${tar.name}<br/>${raw?.is_total ? 'Total' : 'Delta'}: <strong>${sign}${raw?.value}</strong>`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#333333' } },
        axisLabel: { color: '#9CA3AF', fontSize: 10, rotate: 20 },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#333333' } },
        splitLine: { lineStyle: { color: '#222222' } },
        axisLabel: { color: '#9CA3AF', fontSize: 11 },
      },
      series: [
        {
          name: 'Placeholder',
          type: 'bar',
          stack: 'Total',
          itemStyle: { borderColor: 'transparent', color: 'transparent' },
          data: placeholderData,
        },
        {
          name: 'Change',
          type: 'bar',
          stack: 'Total',
          label: { show: true, position: 'top', color: '#F9FAFB', fontSize: 10 },
          itemStyle: {
            color: (params: any) => {
              const raw = wfData[params.dataIndex];
              if (raw.is_total) return '#3B82F6';
              return raw.value >= 0 ? '#10B981' : '#EF4444';
            },
          },
          data: stepData,
        },
      ],
    };
  }

  const handleSaveInvestigation = async () => {
    if (!saveTitle) return;
    try {
      await api.saveInvestigation({
        title: saveTitle,
        question: currentTemplate?.default_question || saveTitle,
        template_key: selectedTemplateKey,
        description: saveDescription,
        filters_json: {
          baseline_start: baselineStart,
          baseline_end: baselineEnd,
          current_start: currentStart,
          current_end: currentEnd,
          breakdown_by: breakdownBy,
        },
      });
      setSaveSuccessMsg('Investigation saved to repository successfully!');
      setTimeout(() => {
        setShowSaveModal(false);
        setSaveSuccessMsg(null);
      }, 1500);
    } catch (e: any) {
      alert(`Error saving: ${e.message}`);
    }
  };

  const handleGenerateReport = async () => {
    if (!reportTitle) return;
    try {
      const saved = await api.saveInvestigation({
        title: reportTitle,
        question: currentTemplate?.default_question || reportTitle,
        template_key: selectedTemplateKey,
        filters_json: {
          baseline_start: baselineStart,
          baseline_end: baselineEnd,
          current_start: currentStart,
          current_end: currentEnd,
          breakdown_by: breakdownBy,
        },
      });

      const recList = reportRecs.split('\n').filter((r) => r.trim().length > 0);
      await api.generateReport(saved.id, {
        title: reportTitle,
        executive_summary: reportSummary || investigationResult?.evidence_panel.finding_title || 'Report summary',
        recommendations: recList,
      });

      setReportSuccessMsg('Report generated and published successfully! View in Reports page.');
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccessMsg(null);
      }, 1500);
    } catch (e: any) {
      alert(`Error generating report: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6 bg-black min-h-screen">
      {/* Template Selector Card */}
      <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <SearchCode className="w-5 h-5 text-[#3B82F6]" />
              Investigation Studio
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Select an analytical template, configure parameters, and inspect reproducible evidence.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSaveTitle(`${currentTemplate?.title} - ${new Date().toLocaleDateString()}`);
                setShowSaveModal(true);
              }}
              className="flex items-center space-x-1.5 bg-[#171717] hover:bg-[#262626] text-xs text-[#E5E7EB] px-3 py-1.5 rounded border border-[#333333] transition-colors"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Save Config</span>
            </button>

            <button
              onClick={() => {
                setReportTitle(`Executive Investigation Report: ${currentTemplate?.title}`);
                setReportSummary(investigationResult?.evidence_panel?.finding_title || '');
                setShowReportModal(true);
              }}
              className="flex items-center space-x-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-xs text-white px-3.5 py-1.5 rounded font-medium transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>

        {/* Template Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          {templates?.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedTemplateKey(t.key)}
              className={`p-3 rounded-lg text-left transition-all border ${
                selectedTemplateKey === t.key
                  ? 'bg-[#171717] border-[#3B82F6] text-white shadow-xs'
                  : 'bg-black border-[#262626] text-[#9CA3AF] hover:border-[#374151] hover:text-[#E5E7EB]'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider block text-[#60A5FA] mb-1">
                {t.category}
              </span>
              <span className="text-xs font-semibold block line-clamp-2 leading-tight">
                {t.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Parameter Controls for Trend Template */}
      {selectedTemplateKey === 'TEMPLATE_COMPLAINT_TREND' && (
        <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-[#9CA3AF] font-medium">Baseline Period:</span>
              <input
                type="date"
                value={baselineStart}
                onChange={(e) => setBaselineStart(e.target.value)}
                className="bg-black border border-[#333333] rounded px-2.5 py-1 text-white text-xs"
              />
              <span className="text-[#6B7280]">to</span>
              <input
                type="date"
                value={baselineEnd}
                onChange={(e) => setBaselineEnd(e.target.value)}
                className="bg-black border border-[#333333] rounded px-2.5 py-1 text-white text-xs"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[#9CA3AF] font-medium">Current Period:</span>
              <input
                type="date"
                value={currentStart}
                onChange={(e) => setCurrentStart(e.target.value)}
                className="bg-black border border-[#333333] rounded px-2.5 py-1 text-white text-xs"
              />
              <span className="text-[#6B7280]">to</span>
              <input
                type="date"
                value={currentEnd}
                onChange={(e) => setCurrentEnd(e.target.value)}
                className="bg-black border border-[#333333] rounded px-2.5 py-1 text-white text-xs"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[#9CA3AF] font-medium">Decompose By:</span>
              <select
                value={breakdownBy}
                onChange={(e) => setBreakdownBy(e.target.value)}
                className="bg-black border border-[#333333] rounded px-3 py-1 text-white text-xs"
              >
                <option value="product">Product Category</option>
                <option value="issue">Issue Category</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={runMutation.isPending}
            className="flex items-center space-x-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-1.5 rounded font-medium disabled:opacity-50 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{runMutation.isPending ? 'Running...' : 'Run Analysis'}</span>
          </button>
        </div>
      )}

      {/* Re-run button for other templates */}
      {selectedTemplateKey !== 'TEMPLATE_COMPLAINT_TREND' && (
        <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-white block">{currentTemplate?.title}</span>
            <span className="text-[#9CA3AF] text-[11px]">{currentTemplate?.description}</span>
          </div>
          <button
            onClick={handleRun}
            disabled={runMutation.isPending}
            className="flex items-center space-x-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-1.5 rounded font-medium disabled:opacity-50 transition-colors shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{runMutation.isPending ? 'Running...' : 'Re-Run Analysis'}</span>
          </button>
        </div>
      )}

      {/* Investigation Results Content */}
      {runMutation.isPending || !isCurrentResult ? (
        <div className="bg-[#0D0D0D] border border-[#262626] p-12 rounded-lg text-center text-xs text-[#9CA3AF] flex flex-col items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
          <span>Executing analytical query and computing metrics for {currentTemplate?.title || 'template'}...</span>
        </div>
      ) : runMutation.isError ? (
        <div className="bg-[#1C1917] border-l-4 border-[#EF4444] p-4 rounded-r-lg text-xs space-y-1">
          <span className="font-bold text-[#EF4444] block">Analysis Execution Error</span>
          <p className="text-[#FCA5A5]">{runMutation.error?.message}</p>
        </div>
      ) : isCurrentResult && investigationResult ? (
        <div className="space-y-6">
          {/* Finding Banner */}
          <div className="bg-[#141414] border-l-4 border-[#3B82F6] p-4 rounded-r-lg">
            <span className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider block mb-1">
              Core Analytical Finding
            </span>
            <p className="text-sm font-semibold text-white">
              {investigationResult.evidence_panel.finding_title}
            </p>
          </div>

          {/* TEMPLATE A: Trend Decomposition */}
          {selectedTemplateKey === 'TEMPLATE_COMPLAINT_TREND' && investigationResult.data?.contributions && (
            <>
              {waterfallChartOption && (
                <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg shadow-sm">
                  <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#10B981]" />
                    Volume Shift Waterfall Decomposition
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mb-4">
                    Additive step decomposition: Baseline Total + Category Deltas = Current Total.
                  </p>
                  <EChart option={waterfallChartOption} style={{ height: '320px' }} />
                </div>
              )}

              <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">
                    Category Contribution Decomposition Table
                  </h3>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-[#9CA3AF]">Reconciliation Check:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-medium ${
                        investigationResult.data?.reconciliation?.is_reconciled
                          ? 'bg-[#064E3B]/40 text-[#10B981]'
                          : 'bg-[#7F1D1D]/40 text-[#EF4444]'
                      }`}
                    >
                      {investigationResult.data?.reconciliation?.is_reconciled
                        ? 'Reconciled (Discrepancy = 0)'
                        : `Discrepancy: ${investigationResult.data?.reconciliation?.discrepancy ?? 0}`}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black text-[#9CA3AF] border-b border-[#262626] text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Baseline Volume</th>
                        <th className="py-2.5 px-3 text-right">Current Volume</th>
                        <th className="py-2.5 px-3 text-right">Absolute Delta (Δ)</th>
                        <th className="py-2.5 px-3 text-right">Contribution %</th>
                        <th className="py-2.5 px-3 text-right">Current Share %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222222] text-[#D1D5DB]">
                      {investigationResult.data?.contributions?.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#141414]">
                          <td className="py-2.5 px-3 font-medium text-white">{row.category}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#9CA3AF]">
                            {row.baseline_count}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-white">
                            {row.current_count}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-semibold ${
                              row.absolute_change >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                            }`}
                          >
                            {row.absolute_change >= 0 ? `+${row.absolute_change}` : row.absolute_change}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#60A5FA]">
                            {row.contribution_pct}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#9CA3AF]">
                            {row.current_share_pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {investigationResult.data.statistical_test && (
                <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2.5 mb-3">
                    <Scale className="w-4 h-4 text-[#A78BFA]" />
                    <h3 className="text-sm font-bold text-white">
                      Statistical Hypothesis Testing: Pearson's Chi-Square Test of Homogeneity
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-black p-4 rounded-lg border border-[#262626] mb-3 text-xs">
                    <div>
                      <span className="text-[#6B7280] block uppercase text-[10px]">Chi-Square (χ²)</span>
                      <span className="text-white font-mono font-bold text-sm">
                        {investigationResult.data.statistical_test.chi2_statistic}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#6B7280] block uppercase text-[10px]">Degrees of Freedom (df)</span>
                      <span className="text-white font-mono font-bold text-sm">
                        {investigationResult.data.statistical_test.degrees_of_freedom}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#6B7280] block uppercase text-[10px]">P-Value</span>
                      <span className="text-[#60A5FA] font-mono font-bold text-sm">
                        {investigationResult.data.statistical_test.p_value}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#6B7280] block uppercase text-[10px]">Cramér's V Effect Size</span>
                      <span className="text-white font-mono font-bold text-sm">
                        {investigationResult.data.statistical_test.cramers_v_effect_size}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#D1D5DB] leading-relaxed">
                    <strong>Interpretation:</strong> {investigationResult.data.statistical_test.interpretation}
                  </p>
                </div>
              )}
            </>
          )}

          {/* TEMPLATE B: Operational Benchmarking (Response Timeliness) */}
          {selectedTemplateKey === 'TEMPLATE_RESPONSE_TIMELINESS' && investigationResult.data?.companies && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                  <span className="text-[#6B7280] text-[10px] uppercase font-semibold block mb-1">
                    Overall Timely Response Rate
                  </span>
                  <span className="text-2xl font-bold text-[#10B981] font-mono">
                    {investigationResult.data.overall_timely_rate}%
                  </span>
                  <span className="text-xs text-[#9CA3AF] block mt-1">
                    Across {investigationResult.data.eligible_count} eligible recorded complaints
                  </span>
                </div>

                <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                  <span className="text-[#6B7280] text-[10px] uppercase font-semibold block mb-1">
                    Compliance Monitoring Standard
                  </span>
                  <span className="text-xs text-white block mt-1 leading-relaxed">
                    Statutory CFPB 15-day / 60-day response window. Companies below 95% threshold are flagged for compliance audit.
                  </span>
                </div>
              </div>

              <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#3B82F6]" />
                  Financial Institution Response Timeliness Ranking
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black text-[#9CA3AF] border-b border-[#262626]">
                      <tr>
                        <th className="py-2.5 px-3">Company</th>
                        <th className="py-2.5 px-3 text-right">Total Eligible</th>
                        <th className="py-2.5 px-3 text-right">Timely Count</th>
                        <th className="py-2.5 px-3 text-right">Untimely Count</th>
                        <th className="py-2.5 px-3 text-right">Timely Rate %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222222] text-[#D1D5DB]">
                      {investigationResult.data?.companies?.map((c: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#141414]">
                          <td className="py-2.5 px-3 font-medium text-white">{c.company}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{c.total}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#10B981]">{c.timely}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#EF4444]">{c.untimely}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#60A5FA]">
                            {c.timely_rate_pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE C: Unstructured NLP (Narrative Themes) */}
          {selectedTemplateKey === 'TEMPLATE_NARRATIVE_THEMES' && investigationResult.data?.themes && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                  <span className="text-[#6B7280] text-[10px] uppercase font-semibold block mb-1">
                    Total Usable Narratives
                  </span>
                  <span className="text-2xl font-bold text-white font-mono">
                    {investigationResult.data?.total_narratives}
                  </span>
                </div>

                <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                  <span className="text-[#6B7280] text-[10px] uppercase font-semibold block mb-1">
                    Narrative Availability
                  </span>
                  <span className="text-2xl font-bold text-[#60A5FA] font-mono">
                    {investigationResult.data?.availability_rate_pct}%
                  </span>
                </div>

                <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                  <span className="text-[#6B7280] text-[10px] uppercase font-semibold block mb-1">
                    Extracted Topics
                  </span>
                  <span className="text-2xl font-bold text-[#2DD4BF] font-mono">
                    {investigationResult.data?.themes?.length || 0} Clusters
                  </span>
                </div>
              </div>

              {/* Theme Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {investigationResult.data?.themes?.map((t: any) => (
                  <div key={t.id} className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-4 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-white text-xs block">{t.theme_label}</span>
                        <span className="text-[11px] text-[#9CA3AF] block mt-0.5">{t.description}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#60A5FA] shrink-0 ml-2">
                        {t.prevalence_pct}%
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {t.keywords?.slice(0, 5).map((kw: string, kidx: number) => (
                        <span key={kidx} className="text-[10px] bg-[#171717] text-[#93C5FD] border border-[#333333] px-2 py-0.5 rounded-full font-mono">
                          #{kw}
                        </span>
                      ))}
                    </div>

                    {t.excerpts && t.excerpts[0] && (
                      <div className="bg-black p-2.5 rounded border border-[#222222] text-[11px] text-[#9CA3AF] italic">
                        &ldquo;{t.excerpts[0].snippet}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TEMPLATE D: Integrated Analytics (Structured vs Narrative Cross-Tabulation) */}
          {selectedTemplateKey === 'TEMPLATE_STRUCTURED_VS_TEXT' && investigationResult.data?.product_cross_tab && (
            <div className="space-y-4">
              <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#14B8A6]" />
                  Structured Product vs. NLP Narrative Theme Cross-Tabulation
                </h3>
                <p className="text-xs text-[#9CA3AF] mb-4">
                  Joint occurrence counts between regulatory structured product dimensions and unsupervised narrative themes.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black text-[#9CA3AF] border-b border-[#262626] text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Structured Product</th>
                        <th className="py-2.5 px-3">Associated Narrative Theme</th>
                        <th className="py-2.5 px-3 text-right">Joint Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222222] text-[#D1D5DB]">
                      {investigationResult.data?.product_cross_tab?.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#141414]">
                          <td className="py-2.5 px-3 font-medium text-white">{row.product}</td>
                          <td className="py-2.5 px-3 text-[#93C5FD]">{row.theme_label}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE E: Data Governance (Data Quality Audit) */}
          {selectedTemplateKey === 'TEMPLATE_DATA_QUALITY' && investigationResult.data?.dq_checks && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                  <span className="text-[#6B7280] text-[10px] uppercase font-semibold block mb-1">
                    Total Structured Records
                  </span>
                  <span className="text-2xl font-bold text-white font-mono">
                    {investigationResult.data?.total_complaints}
                  </span>
                </div>

                <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                  <span className="text-[#6B7280] text-[10px] uppercase font-semibold block mb-1">
                    Total Narrative Records
                  </span>
                  <span className="text-2xl font-bold text-[#60A5FA] font-mono">
                    {investigationResult.data?.total_narratives}
                  </span>
                </div>

                <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                  <span className="text-[#6B7280] text-[10px] uppercase font-semibold block mb-1">
                    Automated Integrity Checks
                  </span>
                  <span className="text-2xl font-bold text-[#10B981] font-mono">
                    {investigationResult.data?.dq_checks?.length || 0} Rules Active
                  </span>
                </div>
              </div>

              <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
                  Data Quality & Schema Completeness Audit Rules
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black text-[#9CA3AF] border-b border-[#262626]">
                      <tr>
                        <th className="py-2.5 px-3">Rule Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Affected Rows</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222222] text-[#D1D5DB]">
                      {investigationResult.data?.dq_checks?.map((chk: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#141414]">
                          <td className="py-2.5 px-3 font-medium text-white">{chk.check_name}</td>
                          <td className="py-2.5 px-3 text-[#9CA3AF]">{chk.category}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                chk.status === 'PASS'
                                  ? 'bg-[#064E3B]/50 text-[#10B981]'
                                  : chk.status === 'WARN'
                                  ? 'bg-[#78350F]/50 text-[#F59E0B]'
                                  : 'bg-[#7F1D1D]/50 text-[#EF4444]'
                              }`}
                            >
                              {chk.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#93C5FD]">
                            {chk.affected_rows}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Evidence Panel */}
          <EvidencePanel evidence={investigationResult.evidence_panel} initiallyExpanded={true} />
        </div>
      ) : null}

      {/* Save Investigation Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Save Investigation Configuration</h3>
            <p className="text-xs text-[#9CA3AF]">
              Store this question, parameter set, and reproducible query in your saved studio library.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#9CA3AF] block mb-1">Investigation Title</label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="w-full bg-black border border-[#333333] rounded p-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[#9CA3AF] block mb-1">Description / Notes</label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Optional context for analytical audit..."
                  className="w-full bg-black border border-[#333333] rounded p-2 text-white text-xs h-20"
                />
              </div>
            </div>

            {saveSuccessMsg && (
              <p className="text-xs text-[#10B981] font-medium">{saveSuccessMsg}</p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="bg-[#171717] hover:bg-[#262626] text-xs text-white px-3 py-1.5 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInvestigation}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-xs text-white px-4 py-1.5 rounded font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Generate Executive Report Snapshot</h3>
            <p className="text-xs text-[#9CA3AF]">
              Creates a reproducible report document with evidence, SQL, and recommendations.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#9CA3AF] block mb-1">Report Title</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full bg-black border border-[#333333] rounded p-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[#9CA3AF] block mb-1">Executive Summary</label>
                <textarea
                  value={reportSummary}
                  onChange={(e) => setReportSummary(e.target.value)}
                  className="w-full bg-black border border-[#333333] rounded p-2 text-white text-xs h-20"
                />
              </div>

              <div>
                <label className="text-[#9CA3AF] block mb-1">Actionable Recommendations (One per line)</label>
                <textarea
                  value={reportRecs}
                  onChange={(e) => setReportRecs(e.target.value)}
                  className="w-full bg-black border border-[#333333] rounded p-2 text-white text-xs h-20 font-mono text-[11px]"
                />
              </div>
            </div>

            {reportSuccessMsg && (
              <p className="text-xs text-[#10B981] font-medium">{reportSuccessMsg}</p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="bg-[#171717] hover:bg-[#262626] text-xs text-white px-3 py-1.5 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-xs text-white px-4 py-1.5 rounded font-medium"
              >
                Publish Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
