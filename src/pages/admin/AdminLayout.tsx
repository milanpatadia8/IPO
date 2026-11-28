import React from 'react';
import {
  LayoutDashboard,
  Layers,
  TrendingUp,
  BarChart3,
  FileText,
  UploadCloud,
  History,
  Settings,
  LogOut,
  ArrowLeft,
  Users,
  CloudOff,
  UserPen,
} from 'lucide-react';
import { AdminUser } from '../../types/ipo';
import { useAuth } from '../../lib/auth';

interface AdminLayoutProps {
  currentAdminTab: string;
  setAdminTab: (tab: string) => void;
  adminUser: AdminUser;
  onOpenProfile?: () => void;
  onLogout: () => void;
  navigate: (route: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentAdminTab,
  setAdminTab,
  adminUser,
  onOpenProfile,
  onLogout,
  navigate,
  children,
}) => {
  const { isCloudConnected, signInWithGoogle, authBusy } = useAuth();

  const tabs = [
    { id: 'overview', label: 'Admin Overview', icon: LayoutDashboard },
    { id: 'ipos', label: 'IPO Management', icon: Layers },
    { id: 'clients', label: 'Clients & Fees', icon: Users },
    { id: 'gmp', label: 'Unlisted Price Desk', icon: TrendingUp },
    { id: 'subscriptions', label: 'Subscriptions', icon: BarChart3 },
    { id: 'policies', label: 'Terms & Page Content', icon: FileText },
    { id: 'imports', label: 'API Sync & CSV Imports', icon: UploadCloud },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'settings', label: 'Admin Access & Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col text-[#1C1917]">
      {/* Top Admin Bar */}
      <header className="bg-[#FAF8F4] text-[#1C1917] border-b border-[#E6DFD3] px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-[#57534E] hover:text-[#14532D] transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>View IPO Portal</span>
          </button>
          <div className="h-4 w-px bg-[#E6DFD3] hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-base tracking-tight text-[#1C1917]">
              IPO Insiders Console
            </span>
            <span className="text-xs font-medium bg-[#EEF6F0] text-[#14532D] border border-[#C6E2CE] px-2 py-0.5 rounded-md">
              Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenProfile ? (
            <button
              type="button"
              onClick={onOpenProfile}
              title="Edit Profile"
              className="hidden sm:flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[#EFEAE0] transition-colors text-right"
            >
              <div>
                <div className="text-sm font-medium text-[#1C1917] leading-tight">{adminUser.full_name}</div>
                <div className="text-xs text-[#78716C] leading-tight">{adminUser.email}</div>
              </div>
              <UserPen className="w-4 h-4 text-[#14532D]" />
            </button>
          ) : (
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-[#1C1917]">{adminUser.full_name}</div>
              <div className="text-xs text-[#78716C]">{adminUser.email}</div>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#57534E] hover:text-[#1C1917] rounded-lg hover:bg-[#EFEAE0] border border-[#E6DFD3] bg-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Admin Workspace with Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-60 shrink-0 space-y-1">
          <div className="text-xs font-medium text-[#78716C] uppercase tracking-wider px-3 py-2">
            Backend Management
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentAdminTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAdminTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-[#14532D] text-white shadow-xs'
                    : 'text-[#57534E] hover:bg-white hover:text-[#1C1917] border border-transparent hover:border-[#E6DFD3]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#E8D5B0]' : 'text-[#78716C]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="pt-5 px-1">
            <div className="p-3.5 bg-white rounded-xl border border-[#E6DFD3] text-xs text-[#57534E] space-y-1">
              <span className="font-semibold text-[#1C1917] block">Permanent Cloud Storage</span>
              <span>
                All IPOs, unlisted prices, subscriptions, client fee records, and admin roles are saved permanently in Cloud Firestore and survive app republishes.
              </span>
            </div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 min-w-0 space-y-4">
          {!isCloudConnected && (
            <div className="p-4 bg-[#FDF6E9] border border-[#ECD7B3] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs text-[#7C4A15]">
                <CloudOff className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Connect Google to Save Permanently</span>
                  <span>
                    Sign in with Google to authorize permanent Cloud Firestore writes so your data stays saved even after republishing the app.
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={authBusy}
                onClick={() => signInWithGoogle()}
                className="px-3.5 py-2 bg-[#14532D] hover:bg-[#0F3F22] text-white text-xs font-medium rounded-lg transition-colors shrink-0 disabled:opacity-50"
              >
                {authBusy ? 'Connecting...' : 'Connect Google'}
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
