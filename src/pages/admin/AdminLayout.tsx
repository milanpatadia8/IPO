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
    <div className="min-h-screen bg-[#fbfbfb] flex flex-col text-[#424242]">
      {/* Top Admin Bar */}
      <header className="bg-white text-[#424242] border-b border-[#eeeeee] px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-[#666666] hover:text-[#387ed1] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Portal</span>
          </button>
          <div className="h-4 w-px bg-[#eeeeee] hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm tracking-tight text-[#424242]">IPO Insiders Console</span>
            <span className="text-[10px] font-medium bg-[#f0fdf4] text-[#2e7d32] border border-[#bbf7d0] px-1.5 py-0.5 rounded-[3px]">
              Admin Desk
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-[#424242]">{adminUser.full_name}</div>
            <div className="text-[10px] text-[#9b9b9b] font-mono capitalize">
              Role: {adminUser.role} · {adminUser.email}
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign out from administrative session"
            className="p-1.5 text-[#9b9b9b] hover:text-[#424242] rounded-[3px] hover:bg-[#fbfbfb] border border-transparent hover:border-[#eeeeee] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Admin Workspace with Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-60 shrink-0 space-y-1">
          <div className="text-[11px] font-medium text-[#9b9b9b] uppercase tracking-wider px-3 py-2">
            System Operations
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentAdminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[3px] transition-colors text-left ${
                  isActive
                    ? 'bg-[#387ed1] text-white shadow-xs'
                    : 'text-[#666666] hover:bg-white hover:text-[#424242] border border-transparent hover:border-[#eeeeee]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#9b9b9b]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="pt-6 px-3">
            <div className="p-3 bg-white rounded-[3px] border border-[#eeeeee] text-[11px] text-[#666666] space-y-1">
              <span className="font-medium text-[#424242] block">Server-Side RLS</span>
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
