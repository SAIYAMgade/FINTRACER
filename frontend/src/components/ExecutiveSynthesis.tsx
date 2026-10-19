import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  TrendingUp,
  MessageSquare,
  ShieldAlert,
  ArrowRightCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';

interface ExecutiveSynthesisProps {
  markdown: string;
}

export const ExecutiveSynthesis: React.FC<ExecutiveSynthesisProps> = ({ markdown }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!markdown) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render inline formatting: bold and [Complaint #ID] links
  const renderFormattedText = (text: string) => {
    // Split by [Complaint #...] and **...**
    const parts = text.split(/(\[Complaint #\d+\]|\*\*[^*]+\*\*)/g);

    return parts.map((part, idx) => {
      // Citation link [Complaint #1234567]
      const citeMatch = part.match(/\[Complaint #(\d+)\]/);
      if (citeMatch) {
        const id = citeMatch[1];
        return (
          <Link
            key={idx}
            to={`/explorer?search=${id}`}
            className="inline-flex items-center mx-1 font-mono text-[11px] font-bold text-[#60A5FA] bg-[#172554] border border-[#1E40AF] px-1.5 py-0.2 rounded hover:text-white hover:bg-[#1E40AF] transition-colors"
          >
            #{id}
          </Link>
        );
      }

      // Bold text **...**
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }

      return <span key={idx}>{part}</span>;
    });
  };

  // Split markdown into logical sections
  const rawSections = markdown.split(/\n(?=####?\s+)/);

  return (
    <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg overflow-hidden shadow-sm">
      {/* Memo Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-black border-b border-[#262626]">
        <div className="flex items-center space-x-2.5">
          <FileText className="w-4 h-4 text-[#3B82F6]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Executive Investigation Synthesis
          </h3>
          <span className="text-[10px] bg-[#1E3A8A] text-[#93C5FD] font-semibold px-2 py-0.5 rounded">
            Auditable Report
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1 text-[#9CA3AF] hover:text-white bg-[#171717] hover:bg-[#262626] border border-[#262626] px-2.5 py-1 rounded transition-colors text-[11px]"
            title="Copy formatted executive memo"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#10B981]" />
                <span className="text-[#10B981]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Memo</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center space-x-1 text-[#9CA3AF] hover:text-white bg-[#171717] hover:bg-[#262626] border border-[#262626] px-2.5 py-1 rounded transition-colors text-[11px]"
          >
            {isCollapsed ? (
              <>
                <span>Expand</span>
                <ChevronDown className="w-3 h-3" />
              </>
            ) : (
              <>
                <span>Collapse</span>
                <ChevronUp className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Memo Body */}
      {!isCollapsed && (
        <div className="p-5 space-y-5 text-xs text-[#D1D5DB] leading-relaxed">
          {rawSections.map((sec, sIdx) => {
            const trimmed = sec.trim();
            if (!trimmed || trimmed.startsWith('### Investigation Synthesis')) return null;

            // Determine Section Title & Icon
            const lines = trimmed.split('\n');
            const titleLine = lines[0].replace(/^####?\s+/, '').trim();
            const bodyLines = lines.slice(1).filter((l) => l.trim().length > 0);

            let Icon = FileText;
            let accentColor = 'text-[#60A5FA]';
            let bgAccent = 'bg-black border-[#1F1F1F]';

            if (titleLine.includes('1.') || titleLine.toLowerCase().includes('observation')) {
              Icon = TrendingUp;
              accentColor = 'text-[#38BDF8]';
            } else if (titleLine.includes('2.') || titleLine.toLowerCase().includes('evidence')) {
              Icon = MessageSquare;
              accentColor = 'text-[#818CF8]';
            } else if (titleLine.includes('3.') || titleLine.toLowerCase().includes('governance')) {
              Icon = ShieldAlert;
              accentColor = 'text-[#FBBF24]';
              bgAccent = 'bg-[#121008] border-[#382D10]';
            } else if (titleLine.includes('4.') || titleLine.toLowerCase().includes('next steps')) {
              Icon = ArrowRightCircle;
              accentColor = 'text-[#34D399]';
              bgAccent = 'bg-[#091510] border-[#133E2B]';
            }

            return (
              <div key={sIdx} className={`p-4 rounded-lg border ${bgAccent} space-y-2.5`}>
                <div className="flex items-center space-x-2">
                  <Icon className={`w-4 h-4 ${accentColor} shrink-0`} />
                  <h4 className="text-xs font-bold text-white">{titleLine}</h4>
                </div>

                <ul className="space-y-1.5 pl-1">
                  {bodyLines.map((line, lIdx) => {
                    const cleanBullet = line.replace(/^-\s+/, '').trim();
                    if (!cleanBullet) return null;

                    return (
                      <li key={lIdx} className="flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0 mt-1.5"></span>
                        <div className="flex-1 text-[#D1D5DB]">{renderFormattedText(cleanBullet)}</div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
