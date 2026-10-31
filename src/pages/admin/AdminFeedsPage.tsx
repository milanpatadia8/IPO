import React, { useState, useEffect } from 'react';
import { IPOSource, FeedRun, AdminUser } from '../../types/ipo';
import { api } from '../../lib/api';
import { formatIndianTimestamp } from '../../lib/calculations';
import { RefreshCw, Play, CheckCircle2, AlertCircle, Clock, Server } from 'lucide-react';

interface AdminFeedsPageProps {
  adminUser: AdminUser;
}

export const AdminFeedsPage: React.FC<AdminFeedsPageProps> = ({ adminUser }) => {
  const [sources, setSources] = useState<IPOSource[]>([]);
  const [runs, setRuns] = useState<FeedRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState('');

  const loadFeeds = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetFeeds();
      setSources(data.sources);
      setRuns(data.runs);
    } catch (err) {
      console.error('Failed to load feed data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeeds();
  }, []);

  const handleTriggerSync = async (sourceId: string, providerName: string) => {
    setSyncingId(sourceId);
    setSyncNotice('');
    try {
      const result = await api.adminSyncFeed(sourceId, adminUser);
      setSyncNotice(`Synchronization completed for "${providerName}". Accepted ${result.records_accepted} records.`);
      await loadFeeds();
    } catch (err) {
      setSyncNotice(`Synchronization error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSyncingId(null);
      setTimeout(() => setSyncNotice(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Data Feed Monitoring & Ingestion</h1>
        <p className="text-xs text-slate-500">
          Automated polling adapters for stock exchanges, regulatory repositories, and grey market dealers.
        </p>
      </div>

      {syncNotice && (
        <div className="p-3 bg-slate-900 text-white rounded text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Provider Registry Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Configured Ingestion Adapters</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((src) => {
            const isSyncing = syncingId === src.id;

            return (
              <div
                key={src.id}
                className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      {src.source_type}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        src.enabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {src.enabled ? 'ACTIVE RUNNER' : 'PAUSED'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{src.provider_name}</h3>
                  {src.base_url && (
                    <p className="text-xs text-slate-500 font-mono truncate">{src.base_url}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Cron: Periodic (15m)</span>
                  </div>

                  <button
                    onClick={() => handleTriggerSync(src.id, src.provider_name)}
                    disabled={isSyncing}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Polling...' : 'Sync Now'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Execution Run Log */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900">
          Feed Run Execution History
        </h2>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-sans">Timestamp (IST)</th>
                <th className="py-2.5 px-3 font-sans">Provider / Source</th>
                <th className="py-2.5 px-3 font-sans">Job Type</th>
                <th className="py-2.5 px-3 text-right">Fetched</th>
                <th className="py-2.5 px-3 text-right">Accepted</th>
                <th className="py-2.5 px-3 text-right">Rejected</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-sans text-slate-600">
                    {formatIndianTimestamp(r.started_at)}
                  </td>
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                    {r.provider_name || 'System Provider'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{r.job_type}</td>
                  <td className="py-2.5 px-3 text-right">{r.records_fetched}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                    {r.records_accepted}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-700">{r.records_rejected}</td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
