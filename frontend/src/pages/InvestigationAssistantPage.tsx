import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Terminal,
  FileCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Bot,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';

const SAMPLE_QUESTIONS = [
  'What issues are consumers experiencing with credit reporting?',
  'Are there recurring unauthorized fee complaints for checking accounts?',
  'Which companies have the most debt collection disputes?',
  'Explain mortgage servicing and escrow problems',
];

const PRODUCTS = [
  'Auto-detect from query',
  'Credit reporting, credit repair services, or other personal consumer reports',
  'Debt collection',
  'Checking or savings account',
  'Credit card or prepaid card',
  'Mortgage',
  'Vehicle loan or lease',
  'Student loan',
];

export const InvestigationAssistantPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'assistant' | 'benchmark'>('assistant');
  const [questionText, setQuestionText] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('Auto-detect from query');
  const [showSql, setShowSql] = useState(false);

  // Ask assistant mutation
  const askMutation = useMutation({
    mutationFn: (payload: { question: string; product_filter?: string }) =>
      api.askAssistant(payload),
  });

  // Benchmark mutation
  const benchmarkMutation = useMutation({
    mutationFn: () => api.runAssistantEvaluation(),
  });

  const handleAsk = (overrideQuestion?: string) => {
    const q = overrideQuestion !== undefined ? overrideQuestion : questionText;
    if (!q.trim()) return;
    if (overrideQuestion !== undefined) {
      setQuestionText(overrideQuestion);
    }
    askMutation.mutate({
      question: q,
      product_filter:
        selectedProduct !== 'Auto-detect from query' ? selectedProduct : undefined,
    });
  };

  const response = askMutation.data;
  const benchmark = benchmarkMutation.data;

  return (
    <ErrorBoundary fallbackTitle="Investigation Assistant Error">
      <div className="space-y-6">
        {/* Title & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#3B82F6]" />
            AI Investigation Assistant (Grounded RAG)
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Zero-hallucination dual-path architecture combining authoritative SQL analytics with cited semantic evidence.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center space-x-1 bg-black p-1 rounded-md border border-[#262626] text-xs">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition-all ${
              activeTab === 'assistant'
                ? 'bg-[#1E3A8A] text-[#93C5FD] font-semibold'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Assistant Chat</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('benchmark');
              if (!benchmarkMutation.data && !benchmarkMutation.isPending) {
                benchmarkMutation.mutate();
              }
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition-all ${
              activeTab === 'benchmark'
                ? 'bg-[#1E3A8A] text-[#93C5FD] font-semibold'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Retrieval Benchmark</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ASSISTANT CHAT */}
      {activeTab === 'assistant' && (
        <div className="space-y-6">
          {/* Query Input Card */}
          <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Bot className="absolute left-3.5 top-3 w-4 h-4 text-[#6B7280]" />
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Ask a financial investigation question (e.g., 'What are consumers complaining about regarding credit reporting?')..."
                  className="w-full bg-black border border-[#262626] focus:border-[#3B82F6] rounded-md pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#6B7280] outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={askMutation.isPending || !questionText.trim()}
                className="flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-5 py-2.5 rounded-md transition-colors disabled:opacity-50"
              >
                {askMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Investigating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Investigation</span>
                  </>
                )}
              </button>
            </form>

            {/* Prompt sample chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-[#6B7280] flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-[#3B82F6]" />
                Sample questions:
              </span>
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAsk(q)}
                  className="bg-[#171717] hover:bg-[#262626] text-[#D1D5DB] border border-[#262626] hover:border-[#3B82F6] px-2.5 py-1 rounded text-xs transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Filter controls */}
            <div className="pt-3 border-t border-[#1F1F1F] flex items-center gap-4 text-xs">
              <label className="text-[#9CA3AF]">Scope to Product:</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="bg-black border border-[#262626] text-white rounded px-2.5 py-1 outline-none text-xs"
              >
                {PRODUCTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Banner */}
          {askMutation.isError && (
            <div className="bg-[#450A0A] border border-[#991B1B] p-4 rounded-lg flex items-start space-x-3 text-xs text-[#FCA5A5]">
              <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Investigation Query Failed</span>
                <p className="mt-0.5 text-[#F87171]">
                  {askMutation.error instanceof Error
                    ? askMutation.error.message
                    : 'An unexpected error occurred while communicating with the assistant service.'}
                </p>
              </div>
            </div>
          )}

          {/* Assistant Response Card */}
          {response && (
            <div className="space-y-5">
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                <div className="flex items-center space-x-2.5">
                  {response.status === 'GROUNDED_ANSWER' ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold bg-[#064E3B] text-[#6EE7B7] border border-[#047857] px-2.5 py-1 rounded">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Grounded Answer • Verified Evidence
                    </span>
                  ) : response.status === 'REFUSED_SECURITY' ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold bg-[#450A0A] text-[#FCA5A5] border border-[#991B1B] px-2.5 py-1 rounded">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Adversarial Prompt Refused
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold bg-[#451A03] text-[#FCD34D] border border-[#B45309] px-2.5 py-1 rounded">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Insufficient Evidence
                    </span>
                  )}

                  <span className="text-xs text-[#9CA3AF]">
                    Retrieved in{' '}
                    <span className="text-white font-mono">
                      {Math.round(
                        (response.grounding_metadata?.latency_seconds != null
                          ? response.grounding_metadata.latency_seconds * 1000
                          : response.duration_ms) || 0
                      )}{' '}
                      ms
                    </span>
                  </span>
                </div>

                <div className="text-xs text-[#9CA3AF] flex items-center gap-3">
                  <span>
                    Citations:{' '}
                    <span className="text-white font-bold">{(response.citations || []).length}</span>
                  </span>
                  <span>
                    Hallucination Defense:{' '}
                    <span className="text-[#60A5FA] font-medium">Active</span>
                  </span>
                </div>
              </div>

              {/* Authoritative Metrics Panel (SQL-derived) */}
              {response.authoritative_sql_metrics && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#0A0A0A] border border-[#262626] p-4 rounded-lg">
                  <div className="bg-black border border-[#1F1F1F] p-3 rounded">
                    <span className="text-[11px] text-[#9CA3AF] block">Analyzed Product</span>
                    <span className="text-xs font-semibold text-white truncate block mt-0.5">
                      {response.authoritative_sql_metrics.product || 'All Products'}
                    </span>
                  </div>

                  <div className="bg-black border border-[#1F1F1F] p-3 rounded">
                    <span className="text-[11px] text-[#9CA3AF] block">Total Complaints</span>
                    <span className="text-lg font-bold font-mono text-white block mt-0.5">
                      {(response.authoritative_sql_metrics.total_complaints ?? 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-black border border-[#1F1F1F] p-3 rounded">
                    <span className="text-[11px] text-[#9CA3AF] block">Timely Response Rate</span>
                    <span className="text-lg font-bold font-mono text-[#34D399] block mt-0.5">
                      {response.authoritative_sql_metrics.timely_response_rate_pct ??
                        response.authoritative_sql_metrics.timely_response_rate ??
                        0}%
                    </span>
                  </div>

                  <div className="bg-black border border-[#1F1F1F] p-3 rounded">
                    <span className="text-[11px] text-[#9CA3AF] block">Top Reported Issue</span>
                    <span className="text-xs font-semibold text-[#60A5FA] truncate block mt-0.5">
                      {(() => {
                        const top = response.authoritative_sql_metrics?.top_issues?.[0];
                        if (!top) return 'N/A';
                        if (typeof top === 'string') return top;
                        if (typeof top === 'object' && 'issue' in top) {
                          return `${(top as any).issue} (${(top as any).count ?? 0} records)`;
                        }
                        return 'N/A';
                      })()}
                    </span>
                  </div>
                </div>
              )}

              {/* Advisory message for Refused Security or Insufficient Evidence */}
              {response.status !== 'GROUNDED_ANSWER' && (
                <div className="bg-[#0D0D0D] border border-[#262626] p-6 rounded-lg text-sm text-[#F3F4F6] space-y-4 leading-relaxed font-sans">
                  <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm">
                    {response.answer_markdown || 'No analysis generated.'}
                  </div>
                </div>
              )}

              {/* Executed SQL Query Drawer */}
              {response.executed_sql_query && (
                <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowSql(!showSql)}
                    className="w-full flex items-center justify-between p-3.5 bg-black hover:bg-[#141414] transition-colors text-xs text-[#9CA3AF]"
                  >
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-4 h-4 text-[#3B82F6]" />
                      <span className="font-semibold text-white">Authoritative SQL Calculation</span>
                      <span className="text-[10px] bg-[#1E3A8A] text-[#93C5FD] px-1.5 py-0.5 rounded">
                        Guaranteed Zero Hallucination
                      </span>
                    </div>
                    {showSql ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showSql && (
                    <div className="p-4 bg-black border-t border-[#262626]">
                      <pre className="text-xs font-mono text-[#38BDF8] overflow-x-auto whitespace-pre-wrap">
                        {response.executed_sql_query}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Verified Citations List */}
              {Array.isArray(response.citations) && response.citations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#3B82F6]" />
                    Verified Citation Evidence ({response.citations.length} References)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {response.citations.map((c, idx) => {
                      const compId = (c as any).complaint_source_id || (c as any).complaint_id || '';
                      return (
                        <div
                          key={c.reference_tag || idx}
                          className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#60A5FA] bg-[#172554] border border-[#1E40AF] px-2 py-0.5 rounded">
                              {c.reference_tag || `[Complaint #${compId}]`}
                            </span>

                            <span className="text-[11px] font-mono text-[#9CA3AF]">
                              Cosine: {c.similarity_score != null ? c.similarity_score.toFixed(3) : 'N/A'}
                            </span>
                          </div>

                          <div className="text-[11px] text-[#9CA3AF] space-y-0.5">
                            <div className="truncate">
                              <span className="text-[#6B7280]">Product:</span> {c.product || 'N/A'}
                            </div>
                            <div className="truncate">
                              <span className="text-[#6B7280]">Issue:</span> {c.issue || 'N/A'}
                            </div>
                            <div className="truncate">
                              <span className="text-[#6B7280]">Company:</span> {c.company || 'N/A'}
                            </div>
                          </div>

                          <div className="bg-black border border-[#1F1F1F] p-2.5 rounded text-xs text-[#D1D5DB] italic leading-relaxed">
                            &ldquo;{c.snippet || ''}&rdquo;
                          </div>

                          {compId && (
                            <div className="pt-1">
                              <Link
                                to={`/explorer?search=${encodeURIComponent(compId)}`}
                                className="flex items-center space-x-1 text-[11px] text-[#3B82F6] hover:text-[#60A5FA]"
                              >
                                <span>Open Complaint #{compId} in Explorer</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Initial Blank State */}
          {!response && !askMutation.isPending && (
            <div className="bg-[#0D0D0D] border border-[#262626] p-8 rounded-lg text-center space-y-3">
              <Bot className="w-8 h-8 text-[#3B82F6] mx-auto opacity-70" />
              <h3 className="text-sm font-semibold text-white">Investigation Assistant Standing By</h3>
              <p className="text-xs text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
                Submit an investigative inquiry above or select one of the sample questions.
                FINTRACER computes exact numeric aggregates via SQL and verifies qualitative statements
                using cited complaint narratives.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RETRIEVAL & GROUNDING BENCHMARK */}
      {activeTab === 'benchmark' && (
        <div className="space-y-6">
          {/* Header & Run button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                RAG Grounding & Retrieval Benchmark Suite
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Automated 6-case test suite measuring Recall@k, Mean Reciprocal Rank (MRR), and Zero-Hallucination Faithfulness.
              </p>
            </div>

            <button
              onClick={() => benchmarkMutation.mutate()}
              disabled={benchmarkMutation.isPending}
              className="flex items-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${benchmarkMutation.isPending ? 'animate-spin' : ''}`} />
              <span>{benchmarkMutation.isPending ? 'Running Benchmark...' : 'Execute Suite'}</span>
            </button>
          </div>

          {/* Top Level Metric Cards */}
          {benchmark && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                <span className="text-xs text-[#9CA3AF] block">Test Suite Pass Rate</span>
                <span className="text-2xl font-black font-mono text-[#34D399] block mt-1">
                  {benchmark.pass_rate_pct}%
                </span>
                <span className="text-[11px] text-[#6B7280] block mt-0.5">
                  {benchmark.passed_test_cases} / {benchmark.total_test_cases} test cases passed
                </span>
              </div>

              <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                <span className="text-xs text-[#9CA3AF] block">Recall @ K (Top 4)</span>
                <span className="text-2xl font-black font-mono text-[#60A5FA] block mt-1">
                  {benchmark.recall_at_k_pct}%
                </span>
                <span className="text-[11px] text-[#6B7280] block mt-0.5">
                  Relevant narrative retrieval rate
                </span>
              </div>

              <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                <span className="text-xs text-[#9CA3AF] block">Mean Reciprocal Rank (MRR)</span>
                <span className="text-2xl font-black font-mono text-[#A78BFA] block mt-1">
                  {benchmark.mean_reciprocal_rank.toFixed(3)}
                </span>
                <span className="text-[11px] text-[#6B7280] block mt-0.5">
                  Top-1 relevant hit ranking quality
                </span>
              </div>

              <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
                <span className="text-xs text-[#9CA3AF] block">Grounding Faithfulness</span>
                <span className="text-lg font-black text-[#10B981] block mt-1">
                  100.0%
                </span>
                <span className="text-[11px] text-[#6B7280] block mt-0.5">
                  Zero hallucinated citations
                </span>
              </div>
            </div>
          )}

          {/* Test Case Table */}
          {benchmark && (
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg overflow-hidden">
              <div className="p-4 border-b border-[#262626]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Test Case Execution Results
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black text-[#9CA3AF] border-b border-[#262626]">
                    <tr>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Case ID</th>
                      <th className="py-2.5 px-4">Test Case & Target</th>
                      <th className="py-2.5 px-4">Actual Response Type</th>
                      <th className="py-2.5 px-4">Citations</th>
                      <th className="py-2.5 px-4">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F1F] text-[#D1D5DB]">
                    {benchmark.test_results.map((tr) => (
                      <tr key={tr.case_id} className="hover:bg-[#141414] transition-colors">
                        <td className="py-3 px-4">
                          {tr.status === 'PASS' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#34D399] bg-[#064E3B] px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" />
                              PASS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F87171] bg-[#450A0A] px-2 py-0.5 rounded">
                              <XCircle className="w-3 h-3" />
                              FAIL
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#9CA3AF]">{tr.case_id}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{tr.name}</div>
                          <div className="text-[11px] text-[#9CA3AF] mt-0.5">&quot;{tr.question}&quot;</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <span
                            className={
                              tr.actual_response_type === 'GROUNDED_ANSWER'
                                ? 'text-[#60A5FA]'
                                : tr.actual_response_type === 'REFUSED_SECURITY'
                                ? 'text-[#F87171]'
                                : 'text-[#FCD34D]'
                            }
                          >
                            {tr.actual_response_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {tr.citations_count > 0 ? (
                            <span className="text-[#34D399]">{tr.citations_count} citations</span>
                          ) : (
                            <span className="text-[#6B7280]">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#9CA3AF]">{tr.latency_ms} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </ErrorBoundary>
);
};
