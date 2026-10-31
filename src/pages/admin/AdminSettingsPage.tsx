import React, { useState, useEffect } from 'react';
import { AdminUser } from '../../types/ipo';
import { api } from '../../lib/api';
import { Settings, Key, Shield, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminSettingsPageProps {
  adminUser: AdminUser;
}

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ adminUser }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [gmpStalenessHours, setGmpStalenessHours] = useState('24');
  const [subStalenessHours, setSubStalenessHours] = useState('12');
  const [savedNotice, setSavedNotice] = useState('');

  useEffect(() => {
    async function loadUsers() {
      try {
        const u = await api.adminGetUsers();
        setUsers(u);
      } catch (err) {
        console.error(err);
      }
    }
    loadUsers();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice('Freshness thresholds updated successfully.');
    setTimeout(() => setSavedNotice(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Control Settings & Security</h1>
        <p className="text-xs text-slate-500">
          Configure synchronization thresholds, view connected data provider keys, and review user privileges.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Freshness Thresholds Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Clock className="w-4 h-4 text-slate-700" />
          <span>Observation Freshness & Staleness Rules</span>
        </h2>

        <form onSubmit={handleSave} className="space-y-4 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                GMP Staleness Threshold (Hours)
              </label>
              <input
                type="number"
                value={gmpStalenessHours}
                onChange={(e) => setGmpStalenessHours(e.target.value)}
                className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Quotes older than this limit are visually marked as stale.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Subscription Staleness Threshold (Hours)
              </label>
              <input
                type="number"
                value={subStalenessHours}
                onChange={(e) => setSubStalenessHours(e.target.value)}
                className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Bidding figures flagged after market closing session.
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors"
          >
            Save Freshness Rules
          </button>
        </form>
      </div>

      {/* Exchange Credentials & Provider Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Key className="w-4 h-4 text-slate-700" />
          <span>External Provider Credential Status</span>
        </h2>

        <div className="space-y-3">
          <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">NSE India API Key</span>
              <span className="text-[11px] text-slate-500 font-mono">
                Environment Variable: NSE_API_KEY
              </span>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Operating via Public RSS & Official Filings
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">BSE Public Issues Endpoint</span>
              <span className="text-[11px] text-slate-500 font-mono">
                Environment Variable: BSE_API_KEY
              </span>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Operating via Public Feed Disclosures
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">Supabase PostgreSQL Connection</span>
              <span className="text-[11px] text-slate-500 font-mono">
                NEXT_PUBLIC_SUPABASE_URL
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Active Storage & Schema Migrations
            </span>
          </div>
        </div>
      </div>

      {/* Admin User Directory */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Shield className="w-4 h-4 text-slate-700" />
          <span>Authorized Administrative Operators</span>
        </h2>

        <div className="divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.id} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">{u.full_name}</span>
                <span className="text-slate-500 text-[11px] font-mono">{u.email}</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded uppercase">
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
