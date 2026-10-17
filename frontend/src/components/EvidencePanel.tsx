import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Code2, AlertCircle, HelpCircle } from 'lucide-react';
import type { EvidencePanelData } from '../types';

interface EvidencePanelProps {
  evidence: EvidencePanelData;
  initiallyExpanded?: boolean;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  initiallyExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(evidence.sql_reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg overflow-hidden shadow-sm mt-6">
      <div
        className="flex items-center justify-between p-4 bg-[#141414] cursor-pointer hover:bg-[#1C1C1C] transition-colors border-b border-[#262626]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-[#3B82F6]/20 text-[#60A5FA] rounded">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#F9FAFB]">
              Evidence & Analytical Methodology Panel
            </h4>
            <p className="text-xs text-[#9CA3AF] line-clamp-1">
              {evidence.finding_title}
            </p>
          </div>
        </div>
        <button
          className="text-[#9CA3AF] hover:text-[#F9FAFB] p-1 rounded"
          aria-label={expanded ? "Collapse evidence" : "Expand evidence"}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black p-4 rounded border border-[#262626]">
            <div>
              <span className="text-[#6B7280] font-medium uppercase tracking-wider block mb-1">
                Business Question
              </span>
              <p className="text-[#E5E7EB] font-medium">{evidence.business_question}</p>
            </div>
            <div>
              <span className="text-[#6B7280] font-medium uppercase tracking-wider block mb-1">
                Sample Size & Coverage
              </span>
              <p className="text-[#E5E7EB] font-medium">{evidence.sample_size}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[#6B7280] font-medium uppercase tracking-wider block">
              Metric Definitions & Calculation
            </span>
            <p className="text-[#D1D5DB] leading-relaxed">
              {evidence.metric_definitions}
            </p>
            <p className="text-[#9CA3AF] italic">
              Method: {evidence.calculation_method}
            </p>
          </div>

          {/* SQL Reference with Copy Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] font-medium uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                Reproducible SQL Query (PostgreSQL 18)
              </span>
              <button
                onClick={handleCopySql}
                className="flex items-center space-x-1.5 text-xs text-[#9CA3AF] hover:text-[#F9FAFB] bg-[#1A1A1A] hover:bg-[#262626] px-2.5 py-1 rounded transition-colors border border-[#333333]"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-[#10B981]" />
                    <span className="text-[#10B981]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-black border border-[#262626] p-3 rounded font-mono text-xs text-[#93C5FD] overflow-x-auto whitespace-pre leading-relaxed">
              {evidence.sql_reference}
            </pre>
          </div>

          {/* Caveats & Next Investigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-[#1C1917]/40 border border-[#78350F]/40 p-3 rounded flex space-x-2.5">
              <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#FBBF24] font-semibold block mb-0.5">Known Caveats & Limitations</span>
                <p className="text-[#D6D3D1] text-[11px] leading-relaxed">{evidence.caveats}</p>
              </div>
            </div>

            <div className="bg-[#042F2E]/30 border border-[#115E59]/40 p-3 rounded flex space-x-2.5">
              <HelpCircle className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#2DD4BF] font-semibold block mb-0.5">Suggested Next Investigation</span>
                <p className="text-[#CCFBF1] text-[11px] leading-relaxed">{evidence.suggested_next_investigation}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
