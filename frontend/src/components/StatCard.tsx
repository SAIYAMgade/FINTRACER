import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string | number;
  isPositiveGood?: boolean;
  icon?: LucideIcon;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  badge,
}) => {
  return (
    <div className="bg-[#0D0D0D] border border-[#262626] hover:border-[#383838] rounded-lg p-5 transition-all shadow-sm">
      <div className="flex items-center justify-between text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold mb-2">
        <span>{title}</span>
        {Icon && <Icon className="w-4 h-4 text-[#3B82F6]" />}
      </div>
      <div className="flex items-baseline space-x-3">
        <span className="text-2xl font-bold text-[#F9FAFB] tracking-tight">{value}</span>
        {change !== undefined && (
          <span className="text-xs font-medium text-[#10B981] bg-[#064E3B]/40 px-2 py-0.5 rounded">
            {change}
          </span>
        )}
        {badge && (
          <span className="text-xs font-medium text-[#93C5FD] bg-[#1E3A8A]/40 px-2 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-[#6B7280] mt-1.5">{subtitle}</p>}
    </div>
  );
};
