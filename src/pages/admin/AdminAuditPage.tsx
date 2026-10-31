import React, { useState, useEffect } from 'react';
import { AuditLog, AdminUser } from '../../types/ipo';
import { api } from '../../lib/api';
import { formatIndianTimestamp } from '../../lib/calculations';
import { History, Shield, Search } from 'lucide-react';

interface AdminAuditPageProps {
  adminUser: AdminUser;
}

export const AdminAuditPage: React.FC<AdminAuditPageProps> = ({ adminUser }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filtered = logs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.actor_name.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q) ||
      log.entity_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Administrative Audit Trail</h1>
        <p className="text-xs text-slate-500">
          Append-only, immutable record of administrative actions, data corrections, and approval decisions.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Filter audit logs by action, actor or entity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-slate-400"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
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
              {filtered.map((log) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
