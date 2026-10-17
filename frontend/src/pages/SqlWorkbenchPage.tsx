import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  TerminalSquare,
  Play,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Database,
  ShieldCheck,
  AlertCircle,
  Table,
} from 'lucide-react';
import type { WorkbenchSchema, WorkbenchExecutionResult } from '../types';

export const SqlWorkbenchPage: React.FC = () => {
  const [sqlQuery, setSqlQuery] = useState<string>(
    `SELECT \n    product, \n    COUNT(*) AS total_complaints,\n    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM complaints), 2) AS share_pct\nFROM complaints \nGROUP BY product \nORDER BY total_complaints DESC \nLIMIT 10;`
  );
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Schema & Preloaded queries
  const { data: schemaData } = useQuery<WorkbenchSchema>({
    queryKey: ['workbench-schema'],
    queryFn: () => api.getWorkbenchSchema(),
  });

  // Query Execution Mutation
  const executeMutation = useMutation<WorkbenchExecutionResult, Error, string>({
    mutationFn: (sql) => api.executeSql(sql),
    onError: (err) => {
      setErrorMessage(err.message);
    },
    onSuccess: () => {
      setErrorMessage(null);
    },
  });

  const handleExecute = () => {
    if (!sqlQuery.trim()) return;
    executeMutation.mutate(sqlQuery);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const queryResult = executeMutation.data;

  return (
    <div className="space-y-6">
      {/* Title & Security Banner */}
      <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TerminalSquare className="w-5 h-5 text-[#3B82F6]" />
              Controlled Read-Only SQL Workbench
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Execute verified analytical queries against PostgreSQL 18 with read-only transaction isolation and 5s statement timeouts.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="flex items-center space-x-1.5 text-[#10B981] bg-[#064E3B]/40 px-2.5 py-1 rounded font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Read-Only Role Enforced</span>
            </span>
          </div>
        </div>

        {/* Security Rules Banner */}
        <div className="bg-black border border-[#262626] p-3 rounded text-[11px] text-[#9CA3AF] flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[#60A5FA] font-semibold">Execution Constraints:</span>
          <span>• SELECT statements only</span>
          <span>• Single-statement execution</span>
          <span>• Max 500 rows</span>
          <span>• 5,000ms timeout</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Schema Explorer & Preloaded Queries Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Preloaded Queries */}
          <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#3B82F6]" />
              Approved Query Library
            </h3>
            <div className="space-y-2">
              {schemaData?.preloaded_queries.map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setSqlQuery(q.sql);
                    setErrorMessage(null);
                  }}
                  className="w-full text-left p-2.5 rounded bg-black hover:bg-[#141414] border border-[#262626] hover:border-[#383838] transition-all text-xs"
                >
                  <span className="font-semibold text-white block mb-0.5">{q.title}</span>
                  <span className="text-[10px] text-[#6B7280] line-clamp-1 font-mono">
                    {q.sql.trim().split('\n')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Allowed Tables Inventory */}
          <div className="bg-[#0D0D0D] border border-[#262626] p-4 rounded-lg shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-[#14B8A6]" />
              Approved Schema Tables
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {schemaData?.tables.map((tbl) => (
                <div key={tbl.name} className="p-2.5 rounded bg-black border border-[#262626] text-xs">
                  <span className="font-mono font-bold text-[#60A5FA] block">{tbl.name}</span>
                  <span className="text-[10px] text-[#9CA3AF] block mt-0.5">{tbl.description}</span>
                  <div className="mt-2 text-[10px] text-[#6B7280] font-mono">
                    {tbl.columns.slice(0, 4).map((c) => c.name).join(', ')}
                    {tbl.columns.length > 4 ? '...' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Query Editor & Result Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Query Editor Card */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                SQL Query Editor
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 text-xs text-[#9CA3AF] hover:text-white bg-black hover:bg-[#1A1A1A] px-2.5 py-1 rounded border border-[#262626] transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={() => setSqlQuery('')}
                  className="flex items-center space-x-1 text-xs text-[#9CA3AF] hover:text-white bg-black hover:bg-[#1A1A1A] px-2.5 py-1 rounded border border-[#262626] transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>

                <button
                  onClick={handleExecute}
                  disabled={executeMutation.isPending}
                  className="flex items-center space-x-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-xs text-white px-4 py-1 rounded font-medium disabled:opacity-50 transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{executeMutation.isPending ? 'Executing...' : 'Run Query'}</span>
                </button>
              </div>
            </div>

            {/* SQL Text Area */}
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="Enter read-only SELECT query..."
              rows={7}
              className="w-full bg-black border border-[#262626] rounded-lg p-3 font-mono text-xs text-[#93C5FD] focus:outline-none focus:border-[#3B82F6] leading-relaxed"
            />
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="bg-[#1C1917] border-l-4 border-[#EF4444] p-3 rounded-r-lg flex items-start space-x-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#EF4444] block">Validation / Execution Error</span>
                <p className="text-[#FCA5A5] mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Results Table */}
          {queryResult && (
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg overflow-hidden shadow-sm">
              {/* Results Header */}
              <div className="p-3 bg-[#141414] border-b border-[#262626] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-white">Query Results</span>
                  <span className="text-[#9CA3AF]">
                    {queryResult.row_count} rows returned
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 text-[#10B981] font-mono text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{queryResult.duration_ms} ms</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black text-[#9CA3AF] border-b border-[#262626] uppercase font-mono text-[10px] sticky top-0">
                    <tr>
                      {queryResult.columns.map((col, idx) => (
                        <th key={idx} className="py-2.5 px-3 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222222] text-[#D1D5DB]">
                    {queryResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#141414]">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                            {cell === null ? (
                              <span className="text-[#6B7280] italic">NULL</span>
                            ) : typeof cell === 'boolean' ? (
                              cell ? 'TRUE' : 'FALSE'
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
