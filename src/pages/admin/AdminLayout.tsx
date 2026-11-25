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
  LogOut,
  ArrowLeft,
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
    { id: 'settings', label: 'Users & Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col text-[#111827]">
      {/* Top Admin Bar */}
      <header className="bg-white text-[#111827] border-b border-[#EAEAEA] px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-[#4B5563] hover:text-[#111827] transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>View IPO Portal</span>
          </button>
          <div className="h-4 w-px bg-[#EAEAEA] hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base tracking-tight text-[#111827]">IPO Insiders Console</span>
            <span className="text-xs font-medium bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] px-2 py-0.5 rounded-md">
              Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-[#111827]">{adminUser.full_name}</div>
            <div className="text-xs text-[#6B7280]">{adminUser.email}</div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6] border border-[#EAEAEA] transition-colors"
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
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wider px-3 py-2">
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
                    ? 'bg-[#111827] text-white'
                    : 'text-[#4B5563] hover:bg-white hover:text-[#111827] border border-transparent hover:border-[#EAEAEA]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#6B7280]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="pt-5 px-1">
            <div className="p-3.5 bg-white rounded-xl border border-[#EAEAEA] text-xs text-[#4B5563] space-y-1">
              <span className="font-semibold text-[#111827] block">Firestore Security Active</span>
              <span>All changes persist to Firestore and are logged to the immutable audit trail.</span>
            </div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};
