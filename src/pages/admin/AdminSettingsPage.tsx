import React, { useState, useEffect, useMemo } from 'react';
import { AdminUser, AuthorizedAdminEntry } from '../../types/ipo';
import { api } from '../../lib/api';
import { BOOTSTRAP_ADMIN_EMAIL } from '../../lib/firebase';
import {
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCog,
  UserPlus,
  Trash2,
  Mail,
  Search,
  RotateCcw,
} from 'lucide-react';

interface AdminSettingsPageProps {
  adminUser: AdminUser;
}

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ adminUser }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [authorizedAdmins, setAuthorizedAdmins] = useState<AuthorizedAdminEntry[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);
  const [gmpStalenessHours, setGmpStalenessHours] = useState('24');
  const [subStalenessHours, setSubStalenessHours] = useState('12');
  const [savingSettings, setSavingSettings] = useState(false);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter State
  const [adminEmailSearch, setAdminEmailSearch] = useState('');
  const [adminAccountFilter, setAdminAccountFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');

  const loadData = async () => {
    try {
      const [u, authList, settings] = await Promise.all([
        api.adminGetUsers(),
        api.adminGetAuthorizedAdmins(),
        api.adminGetSettings(),
      ]);
      setUsers(u);
      setAuthorizedAdmins(authList);
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
    }, 4500);
  };

  const handleGrantAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newAdminEmail.trim().toLowerCase();
    if (!cleaned) return;
    setAddingEmail(true);
    try {
      const added = await api.adminAuthorizeEmail(cleaned);
      setNewAdminEmail('');
      showNotice(
        'success',
        added.has_account
          ? `${added.email} now has Admin role access.`
          : `${added.email} has been pre-authorized. They will automatically get Admin access when they sign up or login.`
      );
      await loadData();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Unable to authorize email.');
    } finally {
      setAddingEmail(false);
    }
  };

  const handleRevokeAdminEmail = async (email: string) => {
    setRevokingEmail(email);
    try {
      await api.adminRevokeEmail(email);
      showNotice('success', `Revoked Admin role access for ${email}.`);
      await loadData();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Could not revoke Admin access.');
    } finally {
      setRevokingEmail(null);
    }
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
      showNotice('success', 'Freshness thresholds saved.');
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

  const filteredAuthorizedAdmins = useMemo(() => {
    const q = adminEmailSearch.trim().toLowerCase();
    return authorizedAdmins.filter((entry) => {
      const isPending = !entry.has_account && !entry.is_primary;
      if (adminAccountFilter === 'active' && isPending) return false;
      if (adminAccountFilter === 'pending' && !isPending) return false;
      if (q) {
        const hay = `${entry.email} ${entry.user_name || ''} ${entry.added_by || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [authorizedAdmins, adminAccountFilter, adminEmailSearch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (q) {
        const hay = `${u.full_name} ${u.email} ${u.role}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, userRoleFilter, userSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Admin Access &amp; Control Settings</h1>
        <p className="text-sm text-[#4B5563]">
          Authorize specific email IDs for Admin access, manage registered user roles, and configure freshness thresholds.
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

      {/* Grant Admin Role by Email ID */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-4">
        <div className="border-b border-[#EAEAEA] pb-3">
          <h2 className="text-base font-semibold text-[#111827] flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#111827]" />
            <span>Authorized Admin Email IDs ({authorizedAdmins.length})</span>
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">
            Add any email ID below to grant Admin access. If the person signs up or logs in with that email, they will automatically receive the Admin role.
          </p>
        </div>

        <form onSubmit={handleGrantAdminEmail} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
            <input
              type="email"
              required
              placeholder="Enter email ID to grant Admin access (e.g. team@domain.com)"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm bg-[#FAFAFA] border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-[#111827]"
            />
          </div>
          <button
            type="submit"
            disabled={addingEmail}
            className="h-10 px-4 bg-[#111827] hover:bg-[#1F2937] text-white text-sm font-medium rounded-lg transition-colors shrink-0 disabled:opacity-50"
          >
            {addingEmail ? 'Granting...' : 'Grant Admin Access'}
          </button>
        </form>

        {/* Filter Authorized Admins */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter authorized emails by address or name..."
              value={adminEmailSearch}
              onChange={(e) => setAdminEmailSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
            />
          </div>
          <select
            value={adminAccountFilter}
            onChange={(e) =>
              setAdminAccountFilter(e.target.value as 'all' | 'active' | 'pending')
            }
            className="h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Account</option>
            <option value="pending">Pending First Login</option>
          </select>
          {(adminEmailSearch.trim() !== '' || adminAccountFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setAdminEmailSearch('');
                setAdminAccountFilter('all');
              }}
              className="inline-flex items-center gap-1 px-2.5 h-9 text-xs text-[#4B5563] hover:text-[#111827] border border-[#E5E7EB] rounded-lg shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-[#F3F4F6] border border-[#EAEAEA] rounded-lg">
          {filteredAuthorizedAdmins.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#6B7280]">
              No authorized admin emails match your filter.
            </div>
          ) : (
            filteredAuthorizedAdmins.map((entry) => {
            const isSelf = entry.email.toLowerCase() === adminUser.email.toLowerCase();
            return (
              <div
                key={entry.email}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#111827]">{entry.email}</span>
                    {entry.is_primary ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[#111827] text-white">
                        Primary Admin
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Authorized Admin
                      </span>
                    )}
                    {!entry.has_account && !entry.is_primary && (
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        Pending First Login
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    {entry.user_name ? `${entry.user_name} · ` : ''}
                    {entry.is_primary
                      ? 'Automatic Admin on login (protected)'
                      : `Authorized by ${entry.added_by || 'Admin'}`}
                  </div>
                </div>

                <div>
                  {entry.is_primary || isSelf ? (
                    <span className="text-xs text-[#6B7280]">Protected</span>
                  ) : (
                    <button
                      type="button"
                      disabled={revokingEmail === entry.email}
                      onClick={() => handleRevokeAdminEmail(entry.email)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#DC2626] bg-white border border-[#E5E7EB] hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{revokingEmail === entry.email ? 'Revoking...' : 'Revoke Access'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* Registered Users & Role Directory */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
          <h2 className="text-base font-semibold text-[#111827] flex items-center gap-2">
            <UserCog className="w-4 h-4 text-[#111827]" />
            <span>
              Registered Users ({filteredUsers.length}
              {filteredUsers.length !== users.length ? ` of ${users.length}` : ''})
            </span>
          </h2>
          <span className="text-xs text-[#6B7280]">Role changes take effect immediately</span>
        </div>

        {/* Filter Registered Users */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
            />
          </div>

          <div className="inline-flex items-center bg-[#F3F4F6] rounded-lg p-0.5 text-xs self-start">
            {(
              [
                { id: 'all', label: 'All Roles' },
                { id: 'admin', label: 'Admins' },
                { id: 'user', label: 'End Users' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setUserRoleFilter(opt.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  userRoleFilter === opt.id
                    ? 'bg-white text-[#111827] shadow-2xs'
                    : 'text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {(userSearch.trim() !== '' || userRoleFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setUserSearch('');
                setUserRoleFilter('all');
              }}
              className="inline-flex items-center gap-1 px-2.5 h-9 text-xs text-[#4B5563] hover:text-[#111827] border border-[#E5E7EB] rounded-lg shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-[#F3F4F6]">
          {filteredUsers.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#6B7280]">
              {users.length === 0
                ? 'Signed-in users will appear here automatically.'
                : 'No registered users match your current filters.'}
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isBootstrap = u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
              const isSelf = u.id === adminUser.id;
              const canModify = !isBootstrap && !isSelf;

              return (
                <div
                  key={u.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
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
                        <span className="text-xs text-[#6B7280]">(Primary Admin)</span>
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
                          ? 'Revoke Admin'
                          : 'Authorize Admin'}
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
                Unlisted Price Staleness Threshold (Hours)
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

      {/* Security Summary */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-[#111827] flex items-center gap-2 border-b border-[#EAEAEA] pb-3">
          <Shield className="w-4 h-4 text-[#111827]" />
          <span>Access Policy</span>
        </h2>

        <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA] flex items-center justify-between gap-4 text-sm">
          <div>
            <span className="font-semibold text-[#111827] block">
              Unified Login with Role-Based Access Control
            </span>
            <span className="text-xs text-[#4B5563]">
              Public IPO viewing requires no login. Primary and authorized Admin emails receive Admin access automatically on login; all other users receive End User access.
            </span>
          </div>
          <span className="text-xs font-medium text-[#16A34A] bg-[#F0FDF4] px-2.5 py-1 rounded-md border border-[#BBF7D0] shrink-0">
            Enforced
          </span>
        </div>
      </div>
    </div>
  );
};
