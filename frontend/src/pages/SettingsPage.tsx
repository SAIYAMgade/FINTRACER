import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Settings,
  Upload,
  RefreshCw,
  CheckCircle2,
  Server,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [fileType, setFileType] = useState<'complaints' | 'narratives'>('complaints');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Health and Readiness
  const { data: healthData } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.getHealth(),
  });

  const { data: readyData } = useQuery({
    queryKey: ['system-ready'],
    queryFn: () => api.getReady(),
  });

  // Seed Mutation
  const seedMutation = useMutation({
    mutationFn: () => api.seedSampleDataset(),
  });

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadStatus('Uploading and processing CSV...');
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`/api/ingestion/upload?file_type=${fileType}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setUploadStatus(
        `Successfully ingested ${data.rows_inserted} rows from ${selectedFile.name} (Status: ${data.status})`
      );
    } catch (err: any) {
      setUploadStatus(`Upload failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-[#0D0D0D] border border-[#262626] p-5 rounded-lg shadow-sm">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#3B82F6]" />
          Platform Administration & Ingestion Engine
        </h2>
        <p className="text-xs text-[#9CA3AF] mt-0.5">
          Manage CFPB sample data seeding, manual CSV batch uploads, and database diagnostic health checks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sample Seeding Administration */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-sm font-bold text-white">One-Click Demonstration Seed</h3>
          </div>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Populates the PostgreSQL database with the documented CFPB sample dataset (1,200+ complaints,
            540+ historical narratives, and pre-computed NLP thematic clusters).
          </p>

          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="flex items-center space-x-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs px-4 py-2.5 rounded-lg font-medium transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seedMutation.isPending ? 'animate-spin' : ''}`} />
            <span>
              {seedMutation.isPending ? 'Ingesting and Extracting Themes...' : 'Seed Sample Dataset & Run NLP'}
            </span>
          </button>

          {seedMutation.isSuccess && (
            <div className="bg-[#064E3B]/30 border border-[#10B981]/40 p-3 rounded-lg text-xs text-[#34D399] flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Sample Data Seeding Complete</span>
                <p className="text-[11px] text-[#A7F3D0] mt-0.5">
                  {seedMutation.data.complaints_run.rows_read} complaints read, {seedMutation.data.themes_extracted} narrative themes extracted.
                </p>
              </div>
            </div>
          )}

          {seedMutation.isError && (
            <div className="bg-[#7F1D1D]/30 border border-[#EF4444]/40 p-3 rounded-lg text-xs text-[#FCA5A5] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Seeding Failed</span>
                <p className="text-[11px] mt-0.5">{seedMutation.error.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Manual CSV File Upload (Mode B) */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5">
            <Upload className="w-4 h-4 text-[#14B8A6]" />
            <h3 className="text-sm font-bold text-white">Local File Ingestion (Mode B)</h3>
          </div>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Upload custom CFPB complaint or narrative CSV files. The ETL pipeline will perform chunked parsing,
            schema validation, duplicate checking, and database upserts.
          </p>

          <form onSubmit={handleFileUpload} className="space-y-3 text-xs">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-1.5 cursor-pointer text-[#D1D5DB]">
                <input
                  type="radio"
                  name="fileType"
                  value="complaints"
                  checked={fileType === 'complaints'}
                  onChange={() => setFileType('complaints')}
                  className="text-[#3B82F6]"
                />
                <span>Complaints CSV</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer text-[#D1D5DB]">
                <input
                  type="radio"
                  name="fileType"
                  value="narratives"
                  checked={fileType === 'narratives'}
                  onChange={() => setFileType('narratives')}
                  className="text-[#3B82F6]"
                />
                <span>Narratives CSV</span>
              </label>
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full bg-black border border-[#262626] rounded p-2 text-xs text-[#9CA3AF] file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#1A1A1A] file:text-white"
            />

            <button
              type="submit"
              disabled={!selectedFile}
              className="bg-[#1A1A1A] hover:bg-[#262626] text-white text-xs px-4 py-2 rounded font-medium disabled:opacity-40 transition-colors border border-[#333333]"
            >
              Start Ingestion Pipeline
            </button>
          </form>

          {uploadStatus && (
            <p className="text-xs text-[#60A5FA] bg-black p-3 rounded border border-[#262626] font-mono">
              {uploadStatus}
            </p>
          )}
        </div>
      </div>

      {/* System Diagnostics & Health */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-[#3B82F6]" />
          Infrastructure & Database Readiness
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-black border border-[#262626] p-4 rounded-lg">
            <span className="text-[#6B7280] uppercase tracking-wider text-[10px] block mb-1">
              Backend Service
            </span>
            <span className="text-white font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              {healthData?.app} (v{healthData?.version})
            </span>
          </div>

          <div className="bg-black border border-[#262626] p-4 rounded-lg">
            <span className="text-[#6B7280] uppercase tracking-wider text-[10px] block mb-1">
              Database Engine
            </span>
            <span className="text-white font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              PostgreSQL 18 (Local Instance)
            </span>
          </div>

          <div className="bg-black border border-[#262626] p-4 rounded-lg">
            <span className="text-[#6B7280] uppercase tracking-wider text-[10px] block mb-1">
              Readiness Status
            </span>
            <span className="text-white font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              {readyData?.database || 'Connected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
