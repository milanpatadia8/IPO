import React from 'react';
import {
  LayoutDashboard,
  Layers,
  TrendingUp,
  BarChart3,
  RefreshCw,
  UploadCloud,
  History,
  Settings,
  Shield,
  LogOut,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { AdminUser } from '../../types/ipo';

interface AdminLayoutProps {
  currentAdminTab: string;
  setAdminTab: (tab: string) => void;
  adminUser: AdminUser;
  onLogout: () => void;
  navigate: (route: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentAdminTab,
  setAdminTab,
  adminUser,
  onLogout,
  navigate,
  children,
}) => {
  const tabs = [
    { id: 'overview', label: 'Admin Overview', icon: LayoutDashboard },
    { id: 'ipos', label: 'IPO Management', icon: Layers },
    { id: 'gmp', label: 'GMP Desk', icon: TrendingUp },
    { id: 'subscriptions', label: 'Subscriptions', icon: BarChart3 },
    { id: 'feeds', label: 'Data Feeds & Sync', icon: RefreshCw },
    { id: 'imports', label: 'CSV Data Imports', icon: UploadCloud },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'settings', label: 'Control Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Admin Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Portal</span>
          </button>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight">IPO Tracker Control Console</span>
            <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">
              Secure Desk
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-200">{adminUser.full_name}</div>
            <div className="text-[10px] text-slate-400 font-mono capitalize">
              Role: {adminUser.role} · {adminUser.email}
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign out from administrative session"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Admin Workspace with Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-60 shrink-0 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
            System Operations
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentAdminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="pt-6 px-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <span className="font-semibold text-slate-800 block">Server-Side RLS</span>
              <span>All operations verified on backend with permanent audit records.</span>
            </div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};
