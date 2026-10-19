import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  TableProperties,
  ShieldCheck,
  SearchCode,
  MessageSquareText,
  TerminalSquare,
  FileSpreadsheet,
  Settings,
  Database,
  ExternalLink,
  Search,
  Sparkles,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Overview', path: '/overview', icon: LayoutDashboard },
  { name: 'Data Explorer', path: '/explorer', icon: TableProperties },
  { name: 'Data Quality', path: '/quality', icon: ShieldCheck },
  { name: 'Investigation Studio', path: '/investigations', icon: SearchCode },
  { name: 'Narrative Intelligence', path: '/narratives', icon: MessageSquareText },
  { name: 'Semantic Search', path: '/search', icon: Search },
  { name: 'AI Assistant (RAG)', path: '/assistant', icon: Sparkles },
  { name: 'SQL Workbench', path: '/workbench', icon: TerminalSquare },
  { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
  { name: 'Settings & Ingestion', path: '/settings', icon: Settings },
];

export const Layout: React.FC = () => {
  const location = useLocation();

  const currentNav = NAV_ITEMS.find((item) =>
    location.pathname.startsWith(item.path)
  );

  return (
    <div className="flex min-h-screen bg-black text-[#F9FAFB] font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A0A0A] border-r border-[#262626] flex flex-col shrink-0">
        {/* Brand header */}
        <div className="p-5 border-b border-[#262626]">
          <NavLink to="/" className="block group">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-wider text-white">FINTRACER</span>
              <span className="text-[10px] bg-[#1E3A8A] text-[#93C5FD] font-semibold px-1.5 py-0.5 rounded tracking-wide">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-1 group-hover:text-[#D1D5DB] transition-colors leading-tight">
              From operational signals to business decisions.
            </p>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#171717] text-[#60A5FA] border-l-2 border-[#3B82F6]'
                      : 'text-[#9CA3AF] hover:bg-[#141414] hover:text-[#F3F4F6]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / Database Status */}
        <div className="p-4 border-t border-[#262626] bg-[#050505]">
          <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              PostgreSQL 18
            </span>
            <span className="text-[#6B7280]">CFPB Source</span>
          </div>
          <NavLink
            to="/"
            className="mt-3 flex items-center justify-between text-[11px] text-[#3B82F6] hover:text-[#60A5FA]"
          >
            <span>Landing Page</span>
            <ExternalLink className="w-3 h-3" />
          </NavLink>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black">
        {/* Top Header */}
        <header className="h-14 bg-[#0A0A0A] border-b border-[#262626] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <h1 className="text-sm font-semibold text-[#F9FAFB]">
              {currentNav?.name || 'Investigation Platform'}
            </h1>
            <span className="text-[#6B7280] text-xs">/</span>
            <span className="text-xs text-[#9CA3AF]">Financial Services Complaints Analytics</span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 bg-[#171717] border border-[#262626] px-3 py-1.5 rounded-full text-[#9CA3AF]">
              <Database className="w-3.5 h-3.5 text-[#14B8A6]" />
              <span>CFPB Historical Complaint Archive</span>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto p-6 bg-black">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
