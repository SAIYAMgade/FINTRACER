import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileText,
} from 'lucide-react';
import type { ComplaintItem, ComplaintDetailResponse } from '../types';

export const DataExplorerPage: React.FC = () => {
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [search, setSearch] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [hasNarrativeOnly, setHasNarrativeOnly] = useState<boolean | undefined>(undefined);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['complaint-filters'],
    queryFn: () => api.getComplaintFilters(),
  });

  // Fetch complaints
  const { data, isLoading } = useQuery({
    queryKey: [
      'complaints',
      page,
      pageSize,
      search,
      selectedProduct,
      selectedCompany,
      hasNarrativeOnly,
    ],
    queryFn: () =>
      api.getComplaints({
        page,
        pageSize,
        search: search || undefined,
        product: selectedProduct || undefined,
        company: selectedCompany || undefined,
        hasNarrative: hasNarrativeOnly,
      }),
  });

  // Fetch detail if modal open
  const { data: detailData, isLoading: loadingDetail } = useQuery<ComplaintDetailResponse>({
    queryKey: ['complaint-detail', selectedComplaintId],
    queryFn: () => api.getComplaintDetail(selectedComplaintId!),
    enabled: !!selectedComplaintId,
  });

  const handleExportCSV = () => {
    if (!data?.items) return;
    const headers = [
      'complaint_id',
      'date_received',
      'product',
      'issue',
      'company',
      'state',
      'timely_response',
      'has_narrative',
    ];
    const csvRows = [headers.join(',')];

    for (const item of data.items) {
      csvRows.push(
        [
          `"${item.complaint_id}"`,
          `"${item.date_received}"`,
          `"${item.product.replace(/"/g, '""')}"`,
          `"${item.issue.replace(/"/g, '""')}"`,
          `"${item.company.replace(/"/g, '""')}"`,
          `"${item.state || ''}"`,
          `"${item.timely_response ? 'Yes' : 'No'}"`,
          `"${item.has_narrative ? 'Yes' : 'No'}"`,
        ].join(',')
      );
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resolvex_complaints_export_p${page}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">Complaint Record Explorer</h2>
            <p className="text-xs text-[#9CA3AF]">
              Search and filter across normalized CFPB complaint records with verified narrative linkage.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-[#1A1A1A] hover:bg-[#262626] text-xs text-[#E5E7EB] px-3 py-1.5 rounded border border-[#333333] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, company, issue..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-black border border-[#262626] rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          {/* Product Filter */}
          <select
            value={selectedProduct}
            onChange={(e) => {
              setSelectedProduct(e.target.value);
              setPage(1);
            }}
            className="bg-black border border-[#262626] rounded px-3 py-1.5 text-xs text-[#E5E7EB] focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="">All Products</option>
            {filterOptions?.products?.map((p: string) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Company Filter */}
          <select
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value);
              setPage(1);
            }}
            className="bg-black border border-[#262626] rounded px-3 py-1.5 text-xs text-[#E5E7EB] focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="">All Companies</option>
            {filterOptions?.companies?.map((c: string) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Narrative Only toggle */}
          <div className="flex items-center space-x-2 bg-black border border-[#262626] px-3 py-1.5 rounded text-xs text-[#D1D5DB]">
            <input
              type="checkbox"
              id="narrativeCheck"
              checked={hasNarrativeOnly === true}
              onChange={(e) => {
                setHasNarrativeOnly(e.target.checked ? true : undefined);
                setPage(1);
              }}
              className="rounded bg-[#171717] border-[#333333] text-[#3B82F6] focus:ring-0"
            />
            <label htmlFor="narrativeCheck" className="cursor-pointer select-none">
              Narrative Available Only
            </label>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black text-[#9CA3AF] border-b border-[#262626] uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Complaint ID</th>
                <th className="py-3 px-4">Received</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Issue</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4 text-center">Timely</th>
                <th className="py-3 px-4 text-center">Narrative</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222] text-[#D1D5DB]">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#6B7280]">
                    Loading complaint records...
                  </td>
                </tr>
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#6B7280]">
                    No matching complaints found for the selected criteria.
                  </td>
                </tr>
              ) : (
                data?.items?.map((row: ComplaintItem) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedComplaintId(row.complaint_id)}
                    className="hover:bg-[#141414] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-[#60A5FA]">
                      {row.complaint_id}
                    </td>
                    <td className="py-3 px-4 text-[#9CA3AF] whitespace-nowrap">
                      {row.date_received}
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-white" title={row.product}>
                      {row.product}
                    </td>
                    <td className="py-3 px-4 max-w-[220px] truncate text-[#E5E7EB]" title={row.issue}>
                      {row.issue}
                    </td>
                    <td className="py-3 px-4 max-w-[180px] truncate text-[#D1D5DB]" title={row.company}>
                      {row.company}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#9CA3AF]">
                      {row.state || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          row.timely_response
                            ? 'bg-[#064E3B]/40 text-[#10B981]'
                            : 'bg-[#7F1D1D]/40 text-[#EF4444]'
                        }`}
                      >
                        {row.timely_response ? 'Timely' : 'Untimely'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.has_narrative ? (
                        <span className="bg-[#1E3A8A]/40 text-[#93C5FD] px-2 py-0.5 rounded text-[10px] font-medium">
                          Available
                        </span>
                      ) : (
                        <span className="text-[#6B7280] text-[10px]">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedComplaintId(row.complaint_id);
                        }}
                        className="text-[#3B82F6] hover:text-[#60A5FA] p-1 rounded"
                        title="View detail & narrative"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#262626] flex items-center justify-between text-xs text-[#9CA3AF] bg-black">
          <div>
            Showing{' '}
            <span className="text-white font-medium">
              {data?.total ? (page - 1) * pageSize + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="text-white font-medium">
              {Math.min(page * pageSize, data?.total || 0)}
            </span>{' '}
            of <span className="text-white font-medium">{data?.total || 0}</span> complaints
          </div>

          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded bg-[#1A1A1A] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#262626] border border-[#333333]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">
              Page {page} of {data?.total_pages || 1}
            </span>
            <button
              disabled={page >= (data?.total_pages || 1)}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded bg-[#1A1A1A] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#262626] border border-[#333333]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Row Detail Modal */}
      {selectedComplaintId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#262626] flex items-center justify-between bg-[#141414]">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-[#3B82F6]" />
                <h3 className="text-sm font-bold text-white">
                  Complaint Record #{selectedComplaintId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedComplaintId(null)}
                className="text-[#9CA3AF] hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {loadingDetail ? (
                <div className="py-8 text-center text-[#6B7280]">Loading details...</div>
              ) : (
                <>
                  {/* Structured Details Grid */}
                  <div className="grid grid-cols-2 gap-4 bg-black p-4 rounded-lg border border-[#262626]">
                    <div>
                      <span className="text-[#6B7280] font-medium block uppercase text-[10px]">Product</span>
                      <span className="text-white font-medium">{detailData?.complaint.product}</span>
                      {detailData?.complaint.sub_product && (
                        <span className="text-[#9CA3AF] block text-[11px] mt-0.5">
                          Sub: {detailData.complaint.sub_product}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[#6B7280] font-medium block uppercase text-[10px]">Issue</span>
                      <span className="text-white font-medium">{detailData?.complaint.issue}</span>
                      {detailData?.complaint.sub_issue && (
                        <span className="text-[#9CA3AF] block text-[11px] mt-0.5">
                          Sub: {detailData.complaint.sub_issue}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[#6B7280] font-medium block uppercase text-[10px]">Company</span>
                      <span className="text-white font-medium">{detailData?.complaint.company}</span>
                    </div>

                    <div>
                      <span className="text-[#6B7280] font-medium block uppercase text-[10px]">State & Zip</span>
                      <span className="text-white font-medium">
                        {detailData?.complaint.state || 'N/A'} (Zip: {detailData?.complaint.zip_code || 'N/A'})
                      </span>
                    </div>

                    <div>
                      <span className="text-[#6B7280] font-medium block uppercase text-[10px]">Date Received</span>
                      <span className="text-white font-mono">{detailData?.complaint.date_received}</span>
                    </div>

                    <div>
                      <span className="text-[#6B7280] font-medium block uppercase text-[10px]">Company Response</span>
                      <span className="text-white">{detailData?.complaint.company_response_to_consumer}</span>
                    </div>
                  </div>

                  {/* Unstructured Narrative Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#14B8A6]" />
                        Historical Consumer Narrative
                      </span>
                      {detailData?.narrative.available && (
                        <span className="text-[10px] text-[#9CA3AF] font-mono">
                          {detailData.narrative.word_count} words
                        </span>
                      )}
                    </div>

                    {detailData?.narrative.available ? (
                      <div className="bg-black border border-[#262626] p-4 rounded-lg text-xs leading-relaxed text-[#D1D5DB] whitespace-pre-wrap">
                        {detailData.narrative.text}
                      </div>
                    ) : (
                      <div className="bg-black border border-[#262626] p-4 rounded-lg text-xs text-[#9CA3AF] italic">
                        {detailData?.narrative.message}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#262626] bg-[#141414] flex justify-end">
              <button
                onClick={() => setSelectedComplaintId(null)}
                className="bg-[#222222] hover:bg-[#333333] text-xs text-white px-4 py-1.5 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
