import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';
import { EChart } from '../components/EChart';
import {
  FileText,
  Clock,
  MessageSquare,
  AlertTriangle,
  Calendar,
  Layers,
  Building2,
  RefreshCw,
} from 'lucide-react';
import type { OverviewSummary, MonthlyTrend, CategoryBreakdowns } from '../types';

export const OverviewPage: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery<OverviewSummary>({
    queryKey: ['overview-summary', selectedProduct],
    queryFn: () => api.getOverviewSummary({ product: selectedProduct || undefined }),
  });

  const { data: trends, isLoading: loadingTrends } = useQuery<MonthlyTrend[]>({
    queryKey: ['overview-trends', selectedProduct],
    queryFn: () => api.getTrends({ product: selectedProduct || undefined }),
  });

  const { data: categories, isLoading: loadingCategories } = useQuery<CategoryBreakdowns>({
    queryKey: ['overview-categories'],
    queryFn: () => api.getCategories(),
  });

  // Chart: Monthly Trends
  const trendChartOption: any = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0A0A0A',
      borderColor: '#262626',
      textStyle: { color: '#F9FAFB', fontSize: 12 },
      formatter: (params: any) => {
        const item = params[0];
        const trendItem = trends?.find((t) => t.period === item.name);
        const mom = trendItem?.mom_pct_change !== null && trendItem?.mom_pct_change !== undefined
          ? `${trendItem.mom_pct_change > 0 ? '+' : ''}${trendItem.mom_pct_change}% MoM`
          : 'Baseline';
        return `<strong>${item.name}</strong><br/>Complaints: ${item.value}<br/><span style="color:#60A5FA;">${mom}</span>`;
      },
    },
    grid: { left: '3%', right: '4%', bottom: '8%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: trends?.map((t) => t.period) || [],
      axisLine: { lineStyle: { color: '#262626' } },
      axisLabel: { color: '#9CA3AF', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#262626' } },
      splitLine: { lineStyle: { color: '#222222' } },
      axisLabel: { color: '#9CA3AF', fontSize: 11 },
    },
    series: [
      {
        data: trends?.map((t) => t.count) || [],
        type: 'line',
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: '#3B82F6' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.35)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
            ],
          },
        },
      },
    ],
  };

  // Chart: Product Breakdown
  const productChartOption: any = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#0A0A0A',
      borderColor: '#262626',
      textStyle: { color: '#F9FAFB', fontSize: 12 },
    },
    grid: { left: '3%', right: '6%', bottom: '5%', top: '5%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#262626' } },
      splitLine: { lineStyle: { color: '#222222' } },
      axisLabel: { color: '#9CA3AF', fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: categories?.products.slice(0, 6).map((p) => p.name.length > 25 ? p.name.substring(0, 22) + '...' : p.name).reverse() || [],
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9CA3AF', fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: categories?.products.slice(0, 6).map((p) => p.count).reverse() || [],
        itemStyle: { color: '#14B8A6' },
        barWidth: '55%',
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Freshness bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg">
        <div>
          <h2 className="text-base font-bold text-white">Executive Complaint Intelligence Overview</h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Real-time descriptive metrics across CFPB consumer complaint submissions and narrative archives.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs w-full sm:w-auto">
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="bg-black border border-[#262626] rounded px-3 py-1.5 text-xs text-[#E5E7EB] focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="">All Financial Products</option>
            {categories?.products.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => refetchSummary()}
            className="p-1.5 bg-[#1A1A1A] hover:bg-[#262626] text-[#9CA3AF] hover:text-white rounded border border-[#333333]"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Ingested Complaints"
          value={loadingSummary ? '...' : summary?.total_complaints.toLocaleString() || '0'}
          subtitle="Distinct valid CFPB source identifiers"
          icon={FileText}
          badge="100% Validated"
        />

        <StatCard
          title="Timely Response Rate"
          value={loadingSummary ? '...' : `${summary?.timely_response_rate || 0}%`}
          subtitle={`${summary?.timely_numerator || 0} of ${summary?.timely_denominator || 0} eligible records`}
          icon={Clock}
        />

        <StatCard
          title="Narrative Availability"
          value={loadingSummary ? '...' : `${summary?.narrative_availability_rate || 0}%`}
          subtitle={`${summary?.narratives_count || 0} consumer narrative stories`}
          icon={MessageSquare}
        />

        <StatCard
          title="Consumer Disputed Rate"
          value={loadingSummary ? '...' : `${summary?.disputed_rate || 0}%`}
          subtitle="Where consumer contested resolution"
          icon={AlertTriangle}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#3B82F6]" />
                Complaint Volume Shift Over Time
              </h3>
              <p className="text-xs text-[#9CA3AF]">
                Monthly aggregated records with Month-over-Month percentage changes.
              </p>
            </div>
          </div>
          {loadingTrends ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#6B7280]">Loading trend data...</div>
          ) : (
            <EChart option={trendChartOption} style={{ height: '280px' }} />
          )}
        </div>

        {/* Product Breakdown Chart */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#14B8A6]" />
                Leading Product Distributions
              </h3>
              <p className="text-xs text-[#9CA3AF]">
                High-level financial product categories by complaint frequency.
              </p>
            </div>
          </div>
          {loadingCategories ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#6B7280]">Loading category data...</div>
          ) : (
            <EChart option={productChartOption} style={{ height: '280px' }} />
          )}
        </div>
      </div>

      {/* Tables: Top Issues & Top Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Issues Table */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            Top Regulatory Issue Categories
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black text-[#9CA3AF] border-b border-[#262626]">
                <tr>
                  <th className="py-2.5 px-3">Issue Category</th>
                  <th className="py-2.5 px-3 text-right">Volume</th>
                  <th className="py-2.5 px-3 text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] text-[#D1D5DB]">
                {categories?.issues.slice(0, 5).map((iss, idx) => (
                  <tr key={idx} className="hover:bg-[#141414]">
                    <td className="py-2.5 px-3 font-medium text-white">{iss.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#93C5FD]">{iss.count}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{iss.share_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Companies Table */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#3B82F6]" />
            Named Financial Institutions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black text-[#9CA3AF] border-b border-[#262626]">
                <tr>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3 text-right">Volume</th>
                  <th className="py-2.5 px-3 text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] text-[#D1D5DB]">
                {categories?.companies.slice(0, 5).map((comp, idx) => (
                  <tr key={idx} className="hover:bg-[#141414]">
                    <td className="py-2.5 px-3 font-medium text-white">{comp.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#93C5FD]">{comp.count}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{comp.share_pct}%</td>
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
