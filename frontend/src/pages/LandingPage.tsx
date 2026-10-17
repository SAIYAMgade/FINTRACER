import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Cpu,
  ShieldAlert,
  Terminal,
  Sparkles,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-[#F9FAFB] flex flex-col font-sans">
      {/* Navigation */}
      <header className="h-16 border-b border-[#262626] px-8 flex items-center justify-between max-w-7xl mx-auto w-full bg-black">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-black tracking-wider text-white">FINTRACER</span>
          <span className="text-xs bg-[#1E3A8A] text-[#93C5FD] font-semibold px-2 py-0.5 rounded">
            v1.0
          </span>
        </div>

        <nav className="flex items-center space-x-6 text-xs text-[#9CA3AF]">
          <NavLink to="/overview" className="hover:text-white transition-colors">
            Overview
          </NavLink>
          <NavLink to="/investigations" className="hover:text-white transition-colors">
            Investigation Studio
          </NavLink>
          <NavLink to="/narratives" className="hover:text-white transition-colors">
            Narrative NLP
          </NavLink>
          <NavLink to="/workbench" className="hover:text-white transition-colors">
            SQL Workbench
          </NavLink>
          <NavLink
            to="/overview"
            className="flex items-center space-x-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-3.5 py-1.5 rounded-md font-medium transition-colors"
          >
            <span>Explore Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-8 max-w-5xl mx-auto text-center flex-1 flex flex-col justify-center bg-black">
        <div className="inline-flex items-center space-x-2 bg-[#171717] border border-[#262626] px-3 py-1 rounded-full text-xs text-[#93C5FD] mb-6 mx-auto">
          <Sparkles className="w-3.5 h-3.5 text-[#60A5FA]" />
          <span>CFPB Financial Complaints Analytics & Investigation Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          From operational signals <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] via-[#38BDF8] to-[#2DD4BF]">
            to defensible business decisions.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#9CA3AF] max-w-3xl mx-auto mb-10 leading-relaxed">
          FINTRACER unifies relational data modeling, statistical contribution analysis, and unsupervised
          natural language processing to investigate consumer financial protection complaints end-to-end.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <NavLink
            to="/overview"
            className="flex items-center justify-center space-x-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 w-full sm:w-auto"
          >
            <span>Explore the Platform</span>
            <ArrowRight className="w-4 h-4" />
          </NavLink>

          <NavLink
            to="/investigations"
            className="flex items-center justify-center space-x-2 bg-[#171717] hover:bg-[#262626] text-[#E5E7EB] border border-[#333333] px-6 py-3 rounded-lg font-semibold text-sm transition-all w-full sm:w-auto"
          >
            <span>Open Investigation Studio</span>
          </NavLink>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="bg-[#0D0D0D] border border-[#262626] p-6 rounded-xl">
            <div className="p-2.5 bg-[#1E3A8A]/30 text-[#60A5FA] rounded-lg w-fit mb-4">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Relational & Contribution Analytics</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Decompose period-over-period complaint volume increases (Δi = C_curr - C_base)
              with verified additive reconciliation and Chi-Square statistical hypothesis testing.
            </p>
          </div>

          <div className="bg-[#0D0D0D] border border-[#262626] p-6 rounded-xl">
            <div className="p-2.5 bg-[#0D9488]/20 text-[#2DD4BF] rounded-lg w-fit mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Unstructured Narrative Intelligence</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Extract qualitative themes and characteristic n-grams from historical consumer narratives using
              TF-IDF and clustering, cross-validated against structured regulatory issue codes.
            </p>
          </div>

          <div className="bg-[#0D0D0D] border border-[#262626] p-6 rounded-xl">
            <div className="p-2.5 bg-[#4F46E5]/20 text-[#A5B4FC] rounded-lg w-fit mb-4">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Evidence-Backed Reproducibility</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Every analytical finding is backed by an inspectable Evidence Panel detailing sample sizes,
              exact PostgreSQL queries, caveats, and exportable executive reports.
            </p>
          </div>
        </div>

        {/* Official Source & Limitations */}
        <div className="mt-16 bg-[#080808] border border-[#262626] p-6 rounded-xl text-left">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#93C5FD] uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4 text-[#38BDF8]" />
            <span>Data Governance & Source Limitations</span>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Data sourced from the official <strong>US Consumer Financial Protection Bureau (CFPB)</strong> Consumer
            Complaint Database and historical narrative archive. Observational complaint records do not represent a market-wide
            census of customer dissatisfaction or proven legal liability. Downstream findings are qualified by documented
            data quality checks and narrative linkage coverage rates.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#262626] py-6 px-8 text-center text-xs text-[#6B7280] bg-black">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>FINTRACER Financial Services Analytics & Investigation Platform</span>
          <div className="flex items-center space-x-4">
            <NavLink to="/overview" className="hover:text-[#9CA3AF]">Dashboard</NavLink>
            <NavLink to="/quality" className="hover:text-[#9CA3AF]">Data Quality</NavLink>
            <NavLink to="/workbench" className="hover:text-[#9CA3AF]">SQL Workbench</NavLink>
            <NavLink to="/reports" className="hover:text-[#9CA3AF]">Reports</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
};
