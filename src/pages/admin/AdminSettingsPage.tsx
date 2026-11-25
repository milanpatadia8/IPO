import React, { useState, useEffect } from 'react';
import { AdminUser } from '../../types/ipo';
import { api } from '../../lib/api';
import { BOOTSTRAP_ADMIN_EMAIL } from '../../lib/firebase';
import { Shield, Clock, CheckCircle2, AlertCircle, Database, UserCog } from 'lucide-react';

interface AdminSettingsPageProps {
  adminUser: AdminUser;
}

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ adminUser }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [gmpStalenessHours, setGmpStalenessHours] = useState('24');
  const [subStalenessHours, setSubStalenessHours] = useState('12');
  const [savingSettings, setSavingSettings] = useState(false);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      const [u, settings] = await Promise.all([api.adminGetUsers(), api.adminGetSettings()]);
      setUsers(u);
      setGmpStalenessHours(String(settings.gmpStalenessHours));
      setSubStalenessHours(String(settings.subStalenessHours));
    } catch (err) {
      console.error('Failed to load settings or users:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.adminSaveSettings(
        {
          gmpStalenessHours: parseInt(gmpStalenessHours, 10) || 24,
          subStalenessHours: parseInt(subStalenessHours, 10) || 12,
        },
        adminUser
      );
      showNotice('success', 'Freshness thresholds saved to Firestore.');
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleRole = async (target: AdminUser) => {
    const nextRole: 'admin' | 'user' = target.role === 'admin' ? 'user' : 'admin';
    setUpdatingUid(target.id);
    try {
      await api.adminSetUserRole(target.id, target.email, nextRole, adminUser);
      showNotice(
        'success',
        `${target.full_name} is now ${nextRole === 'admin' ? 'an Admin' : 'an End User'}.`
      );
      await loadData();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Could not update user role.');
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Users, Roles &amp; Control Settings</h1>
        <p className="text-sm text-[#4B5563]">
          Manage end user and administrator access, and configure live freshness thresholds persisted in Firestore.
        </p>
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-lg text-sm flex items-center gap-2 border ${
            notice.type === 'success'
              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]'
              : 'bg-red-50 border-red-200 text-[#DC2626]'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* User & Role Directory */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
          <h2 className="text-base font-semibold text-[#111827] flex items-center gap-2">
            <UserCog className="w-4 h-4 text-[#111827]" />
            <span>Registered Users &amp; Admin Access ({users.length})</span>
          </h2>
          <span className="text-xs text-[#6B7280]">Role changes take effect immediately</span>
        </div>

        <div className="divide-y divide-[#F3F4F6]">
          {users.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#6B7280]">
              Signed-in users will appear here automatically.
            </div>
          ) : (
            users.map((u) => {
              const isBootstrap = u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
              const isSelf = u.id === adminUser.id;
              const canModify = !isBootstrap && !isSelf;

              return (
                <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#111827]">{u.full_name}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
                          u.role === 'admin'
                            ? 'bg-[#111827] text-white border-[#111827]'
                            : 'bg-[#FAFAFA] text-[#4B5563] border-[#E5E7EB]'
                        }`}
                      >
                        {u.role === 'admin' ? 'Admin' : 'End User'}
                      </span>
                      {isBootstrap && (
                        <span className="text-xs text-[#6B7280]">(Primary Owner)</span>
                      )}
                    </div>
                    <span className="text-xs text-[#6B7280]">{u.email}</span>
                  </div>

                  <div>
                    {canModify ? (
                      <button
                        type="button"
                        disabled={updatingUid === u.id}
                        onClick={() => handleToggleRole(u)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                          u.role === 'admin'
                            ? 'bg-white border-[#E5E7EB] text-[#DC2626] hover:bg-red-50'
                            : 'bg-[#111827] border-[#111827] text-white hover:bg-[#1F2937]'
                        }`}
                      >
                        {updatingUid === u.id
                          ? 'Updating...'
                          : u.role === 'admin'
                          ? 'Demote to End User'
                          : 'Promote to Admin'}
                      </button>
                    ) : (
                      <span className="text-xs text-[#6B7280]">Protected Account</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Freshness Thresholds Form */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-[#111827] flex items-center gap-2 border-b border-[#EAEAEA] pb-3">
          <Clock className="w-4 h-4 text-[#111827]" />
          <span>Observation Freshness &amp; Staleness Rules</span>
        </h2>

        <form onSubmit={handleSave} className="space-y-4 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">
                GMP Staleness Threshold (Hours)
              </label>
              <input
                type="number"
                min={1}
                max={168}
                value={gmpStalenessHours}
                onChange={(e) => setGmpStalenessHours(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg tabular-nums outline-none focus:border-[#111827]"
              />
              <span className="text-xs text-[#6B7280] mt-1 block">
                Quotes older than this limit are marked as stale.
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">
                Subscription Staleness Threshold (Hours)
              </label>
              <input
                type="number"
                min={1}
                max={168}
                value={subStalenessHours}
                onChange={(e) => setSubStalenessHours(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg tabular-nums outline-none focus:border-[#111827]"
              />
              <span className="text-xs text-[#6B7280] mt-1 block">
                Bidding figures flagged after market closing session.
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="px-4 py-2 bg-[#111827] text-white text-sm rounded-lg font-medium hover:bg-[#1F2937] transition-colors disabled:opacity-50"
          >
            {savingSettings ? 'Saving...' : 'Save Freshness Rules'}
          </button>
        </form>
      </div>

      {/* Backend Storage Status */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-[#111827] flex items-center gap-2 border-b border-[#EAEAEA] pb-3">
          <Database className="w-4 h-4 text-[#111827]" />
          <span>Backend Storage &amp; Security</span>
        </h2>

        <div className="space-y-3 text-sm">
          <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA] flex items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-[#111827] block">Firebase Firestore Database</span>
              <span className="text-xs text-[#4B5563]">
                Persistent real-time backend storing IPOs, GMP observations, subscriptions, audit trail, and user roles
              </span>
            </div>
            <span className="text-xs font-medium text-[#16A34A] bg-[#F0FDF4] px-2.5 py-1 rounded-md border border-[#BBF7D0] shrink-0">
              Connected
            </span>
          </div>

          <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA] flex items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-[#111827] block flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Firebase Authentication (Google Sign-In)
              </span>
              <span className="text-xs text-[#4B5563]">
                Verified Google login required for end users to view IPOs; Admin role enforced by Firestore Security Rules
              </span>
            </div>
            <span className="text-xs font-medium text-[#16A34A] bg-[#F0FDF4] px-2.5 py-1 rounded-md border border-[#BBF7D0] shrink-0">
              Enforced
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
