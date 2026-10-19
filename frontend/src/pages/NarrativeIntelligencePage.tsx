import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';
import {
  MessageSquareText,
  Sparkles,
  Quote,
  RefreshCw,
  Hash,
  Layers,
  BookOpen,
} from 'lucide-react';
import type { NarrativeIntelligenceSummary } from '../types';

export const NarrativeIntelligencePage: React.FC = () => {
  const [clusterCount, setClusterCount] = useState<number>(5);

  const { data: nlpData, isLoading, refetch } = useQuery<NarrativeIntelligenceSummary>({
    queryKey: ['narrative-summary'],
    queryFn: () => api.getNarrativeSummary(),
  });

  const reclusterMutation = useMutation({
    mutationFn: (k: number) => api.reclusterNarratives(k),
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg shadow-sm">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-[#3B82F6]" />
            Narrative Intelligence & Qualitative NLP
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            TF-IDF vectorization, unsupervised clustering, and structured cross-tabulation of CFPB historical narratives.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-[#9CA3AF]">Clusters (K):</span>
          <select
            value={clusterCount}
            onChange={(e) => setClusterCount(Number(e.target.value))}
            className="bg-black border border-[#262626] rounded px-2.5 py-1 text-white text-xs"
          >
            {[3, 4, 5, 6, 8].map((k) => (
              <option key={k} value={k}>
                {k} Topics
              </option>
            ))}
          </select>

          <button
            onClick={() => reclusterMutation.mutate(clusterCount)}
            disabled={reclusterMutation.isPending}
            className="flex items-center space-x-1.5 bg-[#1A1A1A] hover:bg-[#262626] text-xs text-white px-3 py-1.5 rounded border border-[#333333] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#3B82F6] ${reclusterMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{reclusterMutation.isPending ? 'Clustering...' : 'Re-Cluster'}</span>
          </button>
        </div>
      </div>

      {/* Narrative Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Usable Ingested Narratives"
          value={isLoading ? '...' : nlpData?.total_narratives.toLocaleString() || '0'}
          subtitle="Processed and preprocessed stories"
          icon={BookOpen}
        />

        <StatCard
          title="Narrative Availability Rate"
          value={isLoading ? '...' : `${nlpData?.availability_rate_pct || 0}%`}
          subtitle="Proportion of total complaint records"
          icon={Layers}
        />

        <StatCard
          title="Extracted Thematic Topics"
          value={isLoading ? '...' : `${nlpData?.themes?.length || 0}`}
          subtitle="Unsupervised TF-IDF cluster partitions"
          icon={Sparkles}
          badge="K-Means v1.0"
        />
      </div>

      {/* Methodology Banner */}
      <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg flex items-start space-x-3 text-xs">
        <Sparkles className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="text-[#93C5FD] font-semibold block">NLP Analytical Methodology</span>
          <p className="text-[#9CA3AF] leading-relaxed">
            {nlpData?.methodology?.algorithm || 'TF-IDF Vector Space Analysis'}. Stopwords filtered while retaining key financial terminology
            and negative polarities (&quot;not&quot;, &quot;no&quot;, &quot;never&quot;, &quot;without&quot;). Note: Text-derived themes are observational
            associations and do not assert verified customer causation.
          </p>
        </div>
      </div>

      {/* Extracted Theme Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#14B8A6]" />
          Extracted Narrative Thematic Profiles
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {nlpData?.themes?.map((t) => (
            <div
              key={t.id}
              className="bg-[#0D0D0D] border border-[#262626] hover:border-[#383838] rounded-lg p-5 space-y-3 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white">{t.theme_label}</h4>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{t.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-[#60A5FA] block">
                    {t.prevalence_pct}%
                  </span>
                  <span className="text-[10px] text-[#6B7280]">
                    {t.assigned_count} stories
                  </span>
                </div>
              </div>

              {/* Characteristic Keywords */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {t.keywords.slice(0, 6).map((kw, kidx) => (
                  <span
                    key={kidx}
                    className="text-[10px] bg-[#171717] text-[#93C5FD] border border-[#333333] px-2 py-0.5 rounded-full font-mono"
                  >
                    #{kw}
                  </span>
                ))}
              </div>

              {/* Sample Excerpt */}
              {t.excerpts && t.excerpts.length > 0 && (
                <div className="bg-black border border-[#262626] p-3 rounded text-[11px] text-[#D1D5DB] space-y-1">
                  <div className="flex items-center space-x-1.5 text-[10px] text-[#6B7280] uppercase tracking-wider">
                    <Quote className="w-3 h-3 text-[#3B82F6]" />
                    <span>Representative Narrative (Complaint #{t.excerpts[0].complaint_id})</span>
                  </div>
                  <p className="italic text-[#9CA3AF] line-clamp-3 leading-relaxed">
                    &ldquo;{t.excerpts[0].snippet}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* N-Grams and Structured Cross-Tabulation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* N-Grams */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Hash className="w-4 h-4 text-[#3B82F6]" />
            High-Frequency Phrases (N-Grams)
          </h3>
          <p className="text-xs text-[#9CA3AF] mb-3">
            Top bi-grams and tri-grams reflecting recurring consumer complaint language.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider block mb-2">
                Top Bigrams (2-Words)
              </span>
              <ul className="space-y-1.5 text-xs text-[#D1D5DB]">
                {nlpData?.top_bigrams?.slice(0, 5).map((b, idx) => (
                  <li key={idx} className="flex justify-between bg-black p-2 rounded border border-[#262626]">
                    <span className="font-mono text-white text-[11px] truncate max-w-[150px]">{b.phrase}</span>
                    <span className="text-[#60A5FA] font-mono font-medium">{b.count}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider block mb-2">
                Top Trigrams (3-Words)
              </span>
              <ul className="space-y-1.5 text-xs text-[#D1D5DB]">
                {nlpData?.top_trigrams?.slice(0, 5).map((t, idx) => (
                  <li key={idx} className="flex justify-between bg-black p-2 rounded border border-[#262626]">
                    <span className="font-mono text-white text-[11px] truncate max-w-[150px]">{t.phrase}</span>
                    <span className="text-[#60A5FA] font-mono font-medium">{t.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Structured Product Cross-Tabulation */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#14B8A6]" />
            Structured Product Cross-Tabulation
          </h3>
          <p className="text-xs text-[#9CA3AF] mb-3">
            Joint distribution of structured products and NLP narrative themes.
          </p>

          <div className="overflow-x-auto max-h-[260px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-black text-[#9CA3AF] border-b border-[#262626] text-[10px] uppercase">
                <tr>
                  <th className="py-2 px-3">Product</th>
                  <th className="py-2 px-3">Associated Theme</th>
                  <th className="py-2 px-3 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] text-[#D1D5DB]">
                {nlpData?.product_cross_tab?.slice(0, 8).map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#141414]">
                    <td className="py-2 px-3 text-white truncate max-w-[180px]">{row.product}</td>
                    <td className="py-2 px-3 text-[#93C5FD] truncate max-w-[200px]">{row.theme_label}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
