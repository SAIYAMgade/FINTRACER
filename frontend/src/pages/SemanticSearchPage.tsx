import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  RefreshCw,
  Tag,
  Building2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';

const SAMPLE_QUERIES = [
  'Unexpected overdraft & late fees',
  'Identity theft tradeline dispute',
  'Delayed escrow refund check',
  'Debt collector calling workplace',
  'Unauthorized credit card charge',
];

const PRODUCTS = [
  'All Products',
  'Credit reporting, credit repair services, or other personal consumer reports',
  'Debt collection',
  'Checking or savings account',
  'Credit card or prepaid card',
  'Mortgage',
  'Vehicle loan or lease',
  'Student loan',
];

export const SemanticSearchPage: React.FC = () => {
  const [queryText, setQueryText] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('All Products');
  const [minSimilarity, setMinSimilarity] = useState(0.05);
  const [topK, setTopK] = useState(10);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Status query
  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['semantic-status'],
    queryFn: () => api.getSemanticStatus(),
  });

  // Re-index mutation
  const reindexMutation = useMutation({
    mutationFn: () => api.reindexSemantic(),
    onSuccess: () => {
      refetchStatus();
    },
  });

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: (searchParams: {
      query: string;
      top_k: number;
      product?: string;
      min_similarity: number;
    }) => api.searchSemantic(searchParams),
  });

  const handleSearch = (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : queryText;
    if (!q.trim()) return;
    if (overrideQuery !== undefined) {
      setQueryText(overrideQuery);
    }
    searchMutation.mutate({
      query: q,
      top_k: topK,
      product: selectedProduct !== 'All Products' ? selectedProduct : undefined,
      min_similarity: minSimilarity,
    });
  };

  const results = searchMutation.data?.results || [];

  return (
    <ErrorBoundary fallbackTitle="Semantic Vector Search Error">
      <div className="space-y-6">
        {/* Title & Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-[#3B82F6]" />
            Semantic Vector Search
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Vectorized cosine similarity search over L2-normalized 384-dimensional complaint narrative embeddings.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-2 bg-black border border-[#262626] px-3 py-1.5 rounded">
            <Database className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span className="text-[#9CA3AF]">Indexed Vectors:</span>
            <span className="text-white font-mono font-semibold">
              {statusData ? statusData.total_indexed.toLocaleString() : '...'}
            </span>
          </div>

          <button
            onClick={() => reindexMutation.mutate()}
            disabled={reindexMutation.isPending}
            className="flex items-center space-x-1.5 bg-[#171717] hover:bg-[#262626] text-xs text-white px-3 py-1.5 rounded border border-[#333333] transition-colors disabled:opacity-50"
            title="Refit vectorizer & generate embeddings"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#3B82F6] ${reindexMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{reindexMutation.isPending ? 'Indexing...' : 'Re-Index'}</span>
          </button>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search complaint narratives by meaning (e.g., 'unauthorized hold placed on checking account')..."
              className="w-full bg-black border border-[#262626] focus:border-[#3B82F6] rounded-md pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#6B7280] outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={searchMutation.isPending || !queryText.trim()}
            className="flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-5 py-2.5 rounded-md transition-colors disabled:opacity-50"
          >
            {searchMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search Vectors</span>
              </>
            )}
          </button>
        </form>

        {/* Intent Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[#6B7280] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
            Sample intents:
          </span>
          {SAMPLE_QUERIES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => handleSearch(sample)}
              className="bg-[#171717] hover:bg-[#262626] text-[#D1D5DB] border border-[#262626] hover:border-[#3B82F6] px-2.5 py-1 rounded text-xs transition-colors"
            >
              {sample}
            </button>
          ))}
        </div>

        {/* Pre-Filtering Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#1F1F1F] text-xs">
          <div>
            <label className="block text-[#9CA3AF] mb-1 font-medium">Financial Product Filter</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full bg-black border border-[#262626] text-white rounded px-2.5 py-1.5 outline-none text-xs"
            >
              {PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[#9CA3AF] font-medium">Min Similarity Threshold</label>
              <span className="font-mono text-white text-xs">{minSimilarity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.00"
              max="0.50"
              step="0.01"
              value={minSimilarity}
              onChange={(e) => setMinSimilarity(parseFloat(e.target.value))}
              className="w-full accent-[#3B82F6] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[#9CA3AF] mb-1 font-medium">Top Results (K)</label>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full bg-black border border-[#262626] text-white rounded px-2.5 py-1.5 outline-none text-xs"
            >
              {[5, 10, 15, 20].map((k) => (
                <option key={k} value={k}>
                  Top {k} matches
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {searchMutation.isError && (
        <div className="bg-[#450A0A] border border-[#991B1B] p-4 rounded-lg flex items-start space-x-3 text-xs text-[#FCA5A5]">
          <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Semantic Search Query Failed</span>
            <p className="mt-0.5 text-[#F87171]">
              {searchMutation.error instanceof Error
                ? searchMutation.error.message
                : 'An unexpected error occurred while communicating with the vector search service.'}
            </p>
          </div>
        </div>
      )}

      {/* Results Header / Summary */}
      {searchMutation.data && (
        <div className="flex items-center justify-between text-xs text-[#9CA3AF] px-1">
          <div>
            Showing <span className="text-white font-semibold">{results.length}</span> semantic matches for{' '}
            <span className="text-[#60A5FA]">&quot;{searchMutation.data.query}&quot;</span>
          </div>
          <div>
            Retrieval latency:{' '}
            <span className="text-white font-mono">
              {Math.round(
                (searchMutation.data.duration_seconds != null
                  ? searchMutation.data.duration_seconds * 1000
                  : (searchMutation.data as any).search_duration_ms) || 0
              )}{' '}
              ms
            </span>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3">
        {results.map((item, idx) => {
          const compId = (item as any).complaint_source_id || (item as any).complaint_id || '';
          const narrativeId = (item as any).complaint_narrative_id || (item as any).narrative_id || idx;
          const fullText = (item as any).full_narrative || (item as any).narrative_text || '';
          const themeLabel = (item as any).theme_name || (item as any).theme_label || '';
          const isExpanded = expandedId === narrativeId;
          const score = item.similarity_score != null ? item.similarity_score : 0;
          const scorePct = Math.round(score * 100);

          return (
            <div
              key={narrativeId}
              className="bg-[#0D0D0D] border border-[#262626] hover:border-[#383838] p-4 rounded-lg transition-all space-y-3"
            >
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F1F1F] pb-2.5">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded font-mono ${
                      score >= 0.3
                        ? 'bg-[#1E3A8A] text-[#93C5FD]'
                        : score >= 0.15
                        ? 'bg-[#1F2937] text-[#60A5FA]'
                        : 'bg-[#18181B] text-[#9CA3AF]'
                    }`}
                  >
                    Cosine: {score.toFixed(3)} ({scorePct}% match)
                  </span>

                  <span className="text-xs font-semibold text-white">
                    Complaint #{compId || 'N/A'}
                  </span>
                </div>

                {compId && (
                  <Link
                    to={`/explorer?search=${encodeURIComponent(compId)}`}
                    className="flex items-center space-x-1 text-xs text-[#3B82F6] hover:text-[#60A5FA]"
                  >
                    <span>View Structured Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {/* Tags row */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="flex items-center gap-1 bg-[#141414] border border-[#262626] text-[#D1D5DB] px-2 py-0.5 rounded">
                  <Tag className="w-3 h-3 text-[#3B82F6]" />
                  {item.product || 'N/A'}
                </span>

                <span className="bg-[#141414] border border-[#262626] text-[#9CA3AF] px-2 py-0.5 rounded">
                  {item.issue || 'N/A'}
                </span>

                <span className="flex items-center gap-1 bg-[#141414] border border-[#262626] text-[#9CA3AF] px-2 py-0.5 rounded">
                  <Building2 className="w-3 h-3 text-[#6B7280]" />
                  {item.company || 'N/A'}
                </span>

                {themeLabel && (
                  <span className="bg-[#1E1B4B] text-[#A5B4FC] px-2 py-0.5 rounded text-[10px] font-semibold">
                    Topic: {themeLabel}
                  </span>
                )}
              </div>

              {/* Snippet */}
              <div className="bg-black border border-[#1F1F1F] p-3 rounded text-xs text-[#D1D5DB] leading-relaxed italic">
                &ldquo;{item.snippet || ''}&rdquo;
              </div>

              {/* Expand full narrative */}
              <div>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : narrativeId)}
                  className="flex items-center space-x-1 text-xs text-[#9CA3AF] hover:text-white transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Hide Full Narrative</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Show Full Unredacted Narrative ({fullText.length} chars)</span>
                    </>
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-2.5 p-3.5 bg-black border border-[#262626] rounded text-xs text-[#E5E7EB] whitespace-pre-wrap leading-relaxed font-mono">
                    {fullText || 'No narrative content recorded.'}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty Search State */}
        {!searchMutation.data && !searchMutation.isPending && (
          <div className="bg-[#0D0D0D] border border-[#262626] p-8 rounded-lg text-center space-y-3">
            <SlidersHorizontal className="w-8 h-8 text-[#3B82F6] mx-auto opacity-70" />
            <h3 className="text-sm font-semibold text-white">Semantic Search Ready</h3>
            <p className="text-xs text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
              Enter natural language phrases or select a sample intent above. Unlike simple keyword matching,
              semantic search uses high-dimensional vector embeddings to discover narratives with similar underlying meaning.
            </p>
          </div>
        )}

        {/* No Results State */}
        {searchMutation.data && results.length === 0 && (
          <div className="bg-[#0D0D0D] border border-[#262626] p-8 rounded-lg text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-[#EAB308] mx-auto" />
            <h3 className="text-sm font-semibold text-white">No Matching Narratives Found</h3>
            <p className="text-xs text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
              No complaint narratives satisfied the current similarity threshold ({minSimilarity.toFixed(2)}) or product filter.
              Try lowering the similarity threshold or choosing &quot;All Products&quot;.
            </p>
          </div>
        )}
      </div>
    </div>
  </ErrorBoundary>
);
};
