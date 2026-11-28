import React, { useState, useEffect, useMemo } from 'react';
import { AuditLog, AdminUser } from '../../types/ipo';
import { api } from '../../lib/api';
import { formatIndianTimestamp } from '../../lib/calculations';
import { Search, RotateCcw } from 'lucide-react';

interface AdminAuditPageProps {
  adminUser: AdminUser;
}

export const AdminAuditPage: React.FC<AdminAuditPageProps> = ({ adminUser: _adminUser }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [actorFilter, setActorFilter] = useState('ALL');

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const data = await api.adminGetAuditLogs();
        setLogs(data);
      } catch (err) {
        console.error('Failed to load audit logs', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const entityOptions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entity_type).filter(Boolean))).sort(),
    [logs]
  );
  const actionOptions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action).filter(Boolean))).sort(),
    [logs]
  );
  const actorOptions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.actor_name).filter(Boolean))).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (entityFilter !== 'ALL' && log.entity_type !== entityFilter) return false;
      if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
      if (actorFilter !== 'ALL' && log.actor_name !== actorFilter) return false;
      if (!q) return true;
      return (
        log.action.toLowerCase().includes(q) ||
        log.actor_name.toLowerCase().includes(q) ||
        log.entity_type.toLowerCase().includes(q) ||
        log.entity_id.toLowerCase().includes(q) ||
        JSON.stringify(log.after_values || log.before_values || {})
          .toLowerCase()
          .includes(q)
      );
    });
  }, [logs, entityFilter, actionFilter, actorFilter, search]);

  const hasFilters =
    search.trim() !== '' ||
    entityFilter !== 'ALL' ||
    actionFilter !== 'ALL' ||
    actorFilter !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Administrative Audit Trail</h1>
        <p className="text-xs text-slate-500">
          Append-only, immutable record of administrative actions, data corrections, and approval decisions.
        </p>
      </div>

      {/* Multi-Facet Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search audit logs by action, actor, entity, ID, or diff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-slate-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 outline-none focus:bg-white focus:border-slate-400"
          >
            <option value="ALL">All Entities</option>
            {entityOptions.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 outline-none focus:bg-white focus:border-slate-400"
          >
            <option value="ALL">All Actions</option>
            {actionOptions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>

          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 outline-none focus:bg-white focus:border-slate-400"
          >
            <option value="ALL">All Actors</option>
            {actorOptions.map((actor) => (
              <option key={actor} value={actor}>
                {actor}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filtered.length}</strong> of {logs.length}{' '}
            audit record(s)
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setEntityFilter('ALL');
                setActionFilter('ALL');
                setActorFilter('ALL');
              }}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4 font-sans">Timestamp (IST)</th>
                <th className="py-3 px-4 font-sans">Actor Identity</th>
                <th className="py-3 px-4 font-sans">Action Performed</th>
                <th className="py-3 px-4 font-sans">Target Entity</th>
                <th className="py-3 px-4 font-sans">Entity ID</th>
                <th className="py-3 px-4 font-sans">State Diff (Before / After)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-sans">
                    Loading audit log entries...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-sans">
                    {logs.length === 0
                      ? 'No audit log entries recorded yet.'
                      : 'No audit log entries match your current filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-sans text-slate-500 text-[11px] whitespace-nowrap">
                      {formatIndianTimestamp(log.created_at)}
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900 whitespace-nowrap">
                      {log.actor_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">{log.entity_type}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-[120px]">
                      {log.entity_id}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px] max-w-sm">
                      {log.before_values && (
                        <div className="text-rose-700 truncate">
                          <strong>Before:</strong> {JSON.stringify(log.before_values)}
                        </div>
                      )}
                      {log.after_values && (
                        <div className="text-emerald-700 truncate">
                          <strong>After:</strong> {JSON.stringify(log.after_values)}
                        </div>
                      )}
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
