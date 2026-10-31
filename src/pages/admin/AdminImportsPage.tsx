import React, { useState } from 'react';
import { AdminUser } from '../../types/ipo';
import { api } from '../../lib/api';
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, Play } from 'lucide-react';

interface AdminImportsPageProps {
  adminUser: AdminUser;
}

const SAMPLE_CSV = `company,category,exchange,price,lot_size,issue_size,status
Bharat Global Energy,Mainboard,NSE, BSE,245.00,60,1850.00,upcoming
Kutch Agro Organic,SME,NSE Emerge,82.00,1600,18.40,upcoming
Deccan Clean Power,Mainboard,NSE, BSE,310.00,48,2200.00,upcoming`;

export const AdminImportsPage: React.FC<AdminImportsPageProps> = ({ adminUser }) => {
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [isDryRun, setIsDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    totalRows: number;
    accepted: number;
    rejected: number;
    errors: string[];
    importedIPOs: Array<{ name: string; slug: string; status: string }>;
  } | null>(null);

  const handleProcessImport = async () => {
    if (!csvText.trim()) return;
    setLoading(true);
    try {
      const outcome = await api.adminImportCSV(csvText, adminUser, isDryRun);
      setResult(outcome);
    } catch (err: unknown) {
      alert(`Import error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Bulk CSV Data Ingestion Pipeline</h1>
        <p className="text-xs text-slate-500">
          Upload and validate historical IPO records, price determinations, and syndicate details with automatic schema verification.
        </p>
      </div>

      {/* Schema Requirement Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-slate-700" />
          <span>Expected CSV Schema Definition</span>
        </h2>
        <p className="text-slate-600">
          The uploaded file must contain the following comma-separated header row:
        </p>
        <code className="block p-2.5 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-800 overflow-x-auto">
          company,category,exchange,price,lot_size,issue_size,status
        </code>
        <ul className="list-disc pl-5 space-y-1 text-slate-500 text-[11px]">
          <li><strong>category:</strong> Must be <code>Mainboard</code> or <code>SME</code>.</li>
          <li><strong>status:</strong> <code>upcoming</code>, <code>ongoing</code>, or <code>listed</code>.</li>
          <li><strong>issue_size:</strong> Denominated in INR Crores.</li>
        </ul>
      </div>

      {/* Import Area */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-800">CSV Input Data</label>
          <button
            onClick={() => setCsvText(SAMPLE_CSV)}
            className="text-[11px] text-slate-500 hover:text-slate-900 underline"
          >
            Reset to Sample Template
          </button>
        </div>

        <textarea
          rows={7}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:bg-white focus:border-slate-400"
          placeholder="Paste CSV rows here..."
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={isDryRun}
              onChange={(e) => setIsDryRun(e.target.checked)}
              className="rounded text-slate-900"
            />
            <span>Dry-Run Validation Only (Preview errors without database writes)</span>
          </label>

          <button
            onClick={handleProcessImport}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? 'Processing...' : isDryRun ? 'Validate Schema' : 'Execute Import'}</span>
          </button>
        </div>
      </div>

      {/* Import Result Report */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Import Execution Summary</span>
            </h3>
            <span className="font-mono text-slate-500">
              Total Rows: {result.totalRows} · Accepted: {result.accepted} · Rejected: {result.rejected}
            </span>
          </div>

          {result.errors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Validation Discrepancies ({result.errors.length})</span>
              </span>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {result.importedIPOs.length > 0 && (
            <div className="space-y-2">
              <span className="font-semibold text-slate-800 block">Accepted Offerings:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {result.importedIPOs.map((i, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="font-bold text-slate-900 block">{i.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{i.slug}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
