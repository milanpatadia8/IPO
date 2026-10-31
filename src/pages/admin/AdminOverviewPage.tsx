import React, { useState, useEffect } from 'react';
import { IPO, MarketSummary, FeedRun, AuditLog, AdminUser } from '../../types/ipo';
import { api } from '../../lib/api';
import { formatIndianDate, formatIndianTimestamp, isObservationStale } from '../../lib/calculations';
import {
  Layers,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';

interface AdminOverviewPageProps {
  adminUser: AdminUser;
  setAdminTab: (tab: string) => void;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({ adminUser, setAdminTab }) => {
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [feedRuns, setFeedRuns] = useState<FeedRun[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [sum, allIpos, feeds, logs] = await Promise.all([
          api.getMarketSummary(),
          api.getAllIPOs(),
          api.adminGetFeeds(),
          api.adminGetAuditLogs(),
        ]);
        setSummary(sum);
        setIPOs(allIpos);
        setFeedRuns(feeds.runs);
        setAuditLogs(logs);
      } catch (err) {
        console.error('Failed to load admin overview', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Calculate discrepancies or missing fields
  const missingDataIPOs = ipos.filter(
    (i) => (!i.issue_size || (!i.price_band_min && !i.issue_price) || !i.registrar_name)
  );

  // Stale GMP observations (> 24 hours)
  const staleGmpIPOs = ipos.filter(
    (i) => i.latest_gmp && isObservationStale(i.latest_gmp.observed_at, 24)
  );

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Administrative Overview</h1>
        <p className="text-xs text-slate-500">
          Executive monitoring of active offerings, provider ingestion pipelines, and validation queues.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block">Total Managed IPOs</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
            {ipos.length}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {summary?.mainboard_count} Mainboard · {summary?.sme_count} SME
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block">Active Bidding Open</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1 block">
            {summary?.open_ipos_count ?? 0}
          </span>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">Accepting Applications</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block">Upcoming Pipeline</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-sky-700 mt-1 block">
            {summary?.upcoming_ipos_count ?? 0}
          </span>
          <span className="text-[11px] text-sky-700 mt-0.5 block">Awaiting Issue Dates</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block">Stale GMP Quotes</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1 block">
            {staleGmpIPOs.length}
          </span>
          <span className="text-[11px] text-amber-700 mt-0.5 block">Needs Dealer Update</span>
        </div>
      </div>

      {/* Data Health & Validation Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missing or Inconsistent Data */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Incomplete IPO Profiles ({missingDataIPOs.length})</span>
            </h2>
            <button
              onClick={() => setAdminTab('ipos')}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              Manage IPOs →
            </button>
          </div>

          {missingDataIPOs.length === 0 ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All IPO profiles have complete price, registrar, and size parameters.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {missingDataIPOs.slice(0, 4).map((i) => (
                <div key={i.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      {i.company?.name || i.slug}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Missing:{' '}
                      {[
                        !i.issue_size ? 'Issue Size' : null,
                        !i.price_band_min ? 'Price Band' : null,
                        !i.registrar_name ? 'Registrar' : null,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                  <button
                    onClick={() => setAdminTab('ipos')}
                    className="text-xs text-slate-700 hover:text-slate-900 underline"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Ingestion Feed Runs */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-slate-700" />
              <span>Feed Ingestion Status</span>
            </h2>
            <button
              onClick={() => setAdminTab('feeds')}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              Feed Monitor →
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {feedRuns.slice(0, 4).map((run) => (
              <div
                key={run.id}
                className="p-2.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-900 block">
                    {run.provider_name || run.job_type}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {formatIndianTimestamp(run.started_at)} · Accepted {run.records_accepted} records
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {run.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Administrative Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Recent Audit Trail
          </h2>
          <button
            onClick={() => setAdminTab('audit')}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium"
          >
            Full Audit Log →
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-sans">Timestamp (IST)</th>
                <th className="py-2.5 px-3 font-sans">Actor</th>
                <th className="py-2.5 px-3 font-sans">Action</th>
                <th className="py-2.5 px-3 font-sans">Entity</th>
                <th className="py-2.5 px-3 font-sans">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(0, 5).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-slate-500 font-sans text-[11px]">
                    {formatIndianTimestamp(log.created_at)}
                  </td>
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                    {log.actor_name}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{log.action}</td>
                  <td className="py-2.5 px-3 text-slate-600">{log.entity_type}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-500 text-[11px] truncate max-w-xs">
                    {JSON.stringify(log.after_values || log.before_values || {})}
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
