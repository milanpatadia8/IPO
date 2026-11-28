import React, { useState, useEffect, useMemo } from 'react';
import { IPO, IPOCategory, IPOStatus, MarketSummary, SitePolicy, AuditLog, AdminUser } from '../../types/ipo';
import { api } from '../../lib/api';
import { formatIndianTimestamp, isObservationStale } from '../../lib/calculations';
import {
  AlertTriangle,
  FileText,
  CheckCircle2,
  Search,
  RotateCcw,
} from 'lucide-react';

interface AdminOverviewPageProps {
  adminUser: AdminUser;
  setAdminTab: (tab: string) => void;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({ adminUser: _adminUser, setAdminTab }) => {
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [policies, setPolicies] = useState<SitePolicy[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [boardFilter, setBoardFilter] = useState<'ALL' | IPOCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | IPOStatus>('ALL');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [sum, allIpos, sitePolicies, logs] = await Promise.all([
          api.getMarketSummary(),
          api.getAllIPOs(),
          api.getSitePolicies(),
          api.adminGetAuditLogs(),
        ]);
        setSummary(sum);
        setIPOs(allIpos);
        setPolicies(sitePolicies);
        setAuditLogs(logs);
      } catch (err) {
        console.error('Failed to load admin overview', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredIPOs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ipos.filter((i) => {
      if (boardFilter !== 'ALL' && i.category !== boardFilter) return false;
      if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
      if (q) {
        const hay = `${i.company?.name || ''} ${i.slug} ${i.exchange} ${i.registrar_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ipos, boardFilter, statusFilter, search]);

  // Calculate discrepancies or missing fields
  const missingDataIPOs = filteredIPOs.filter(
    (i) => (!i.issue_size || (!i.price_band_min && !i.issue_price) || !i.registrar_name)
  );

  // Stale GMP observations (> 24 hours)
  const staleGmpIPOs = filteredIPOs.filter(
    (i) => i.latest_gmp && isObservationStale(i.latest_gmp.observed_at, 24)
  );

  const filteredPolicies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return policies;
    return policies.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [policies, search]);

  const filteredAuditLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (l) =>
        l.actor_name.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.entity_type.toLowerCase().includes(q)
    );
  }, [auditLogs, search]);

  const hasFilters = search.trim() !== '' || boardFilter !== 'ALL' || statusFilter !== 'ALL';
  const mainboardCount = filteredIPOs.filter((i) => i.category === 'Mainboard').length;
  const smeCount = filteredIPOs.filter((i) => i.category === 'SME').length;
  const openCount = filteredIPOs.filter((i) => i.status === 'ongoing').length;
  const upcomingCount = filteredIPOs.filter((i) => i.status === 'upcoming').length;

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Administrative Overview</h1>
        <p className="text-xs text-slate-500">
          Executive monitoring of active offerings, published disclosures, and data completeness.
        </p>
      </div>

      {/* Overview Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter overview by company, policy, actor, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-slate-400"
          />
        </div>

        <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5 text-xs self-start">
          {(['ALL', 'Mainboard', 'SME'] as const).map((board) => (
            <button
              key={board}
              type="button"
              onClick={() => setBoardFilter(board)}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                boardFilter === board
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {board === 'ALL' ? 'All Boards' : board}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | IPOStatus)}
          className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 outline-none focus:bg-white focus:border-slate-400"
        >
          <option value="ALL">All Statuses</option>
          <option value="ongoing">Open (Ongoing)</option>
          <option value="upcoming">Upcoming</option>
          <option value="closed">Closed</option>
          <option value="listed">Listed</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setBoardFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-md shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block">
            {hasFilters ? 'Matching Managed IPOs' : 'Total Managed IPOs'}
          </span>
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
            {filteredIPOs.length}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {mainboardCount} Mainboard · {smeCount} SME
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block">Active Bidding Open</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1 block">
            {hasFilters ? openCount : (summary?.open_ipos_count ?? openCount)}
          </span>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">Accepting Applications</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block">Upcoming Pipeline</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-sky-700 mt-1 block">
            {hasFilters ? upcomingCount : (summary?.upcoming_ipos_count ?? upcomingCount)}
          </span>
          <span className="text-[11px] text-sky-700 mt-0.5 block">Awaiting Issue Dates</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block">Stale Unlisted Prices</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1 block">
            {staleGmpIPOs.length}
          </span>
          <span className="text-[11px] text-amber-700 mt-0.5 block">Needs Price Refresh</span>
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

          {ipos.length === 0 ? (
            <div className="p-4 bg-slate-50 text-slate-600 rounded text-xs">
              No IPOs published yet. Add your first IPO from Manage IPOs.
            </div>
          ) : missingDataIPOs.length === 0 ? (
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

        {/* Published Terms, Policies & Disclaimers */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-700" />
              <span>Terms, Policies &amp; Disclaimers ({filteredPolicies.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => setAdminTab('policies')}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              Manage Policies →
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {loading ? (
              <div className="p-4 bg-slate-50 text-slate-500 rounded text-xs">
                Loading published policies...
              </div>
            ) : filteredPolicies.length === 0 ? (
              <div className="p-4 bg-slate-50 text-slate-500 rounded text-xs">
                {policies.length === 0
                  ? 'No policies or disclaimers published yet. Add one from Terms & Disclaimers.'
                  : 'No published policies match your search filter.'}
              </div>
            ) : (
              filteredPolicies.slice(0, 4).map((policy) => (
                <div
                  key={policy.id}
                  className="p-2.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 block truncate">
                      {policy.title}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {[
                        policy.show_in_footer_links ? 'Footer Link' : null,
                        policy.show_in_footer_banner ? 'Footer Banner' : null,
                        `${policy.sections.length} section${policy.sections.length === 1 ? '' : 's'}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminTab('policies')}
                    className="text-xs text-slate-700 hover:text-slate-900 underline shrink-0"
                  >
                    Edit
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Administrative Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Recent Audit Trail ({filteredAuditLogs.length})
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
              {filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                    {auditLogs.length === 0
                      ? 'No administrative activity recorded yet.'
                      : 'No recent audit entries match your search filter.'}
                  </td>
                </tr>
              ) : (
                filteredAuditLogs.slice(0, 5).map((log) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
