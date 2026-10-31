import React, { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Layers,
  Clock,
  ShieldCheck,
  Search,
  Menu,
  X,
  ExternalLink,
  Lock,
  FileText,
} from 'lucide-react';
import { SEBI_PUBLIC_ISSUES_URL } from '../lib/calculations';
import { AdminUser } from '../types/ipo';

interface HeaderProps {
  currentRoute: string;
  navigate: (route: string) => void;
  adminUser?: AdminUser | null;
  onOpenAdminLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  navigate,
  adminUser,
  onOpenAdminLogin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const handleNav = (route: string) => {
    navigate(route);
    setMobileMenuOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/ipo/ongoing?search=${encodeURIComponent(quickSearch.trim())}`);
      setQuickSearch('');
    }
  };

  const navLinks = [
    { label: 'Live GMP Today', route: '/ipo/gmp' },
    { label: 'Ongoing', route: '/ipo/ongoing' },
    { label: 'Upcoming', route: '/ipo/upcoming' },
    { label: 'Listed IPOs', route: '/ipo/listed' },
    { label: 'Calendar', route: '/calendar' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (5 Nav Links) - Zone 3 (Primary Action) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleNav('/')}
              className="flex items-center gap-2 text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:bg-slate-800 transition-colors">
                IPO
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap block leading-tight">
                  IPO Tracker India
                </span>
                <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap block">
                  NSE & BSE Market Intelligence
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            {navLinks.map((link) => {
              const isActive = currentRoute === link.route || currentRoute.startsWith(link.route + '/');
              return (
                <button
                  key={link.route}
                  onClick={() => handleNav(link.route)}
                  className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 ${
                    isActive ? 'text-slate-900 font-semibold' : ''
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Search + 1 Primary Action (Admin Access) */}
          <div className="flex items-center gap-3 shrink-0">
            <form onSubmit={handleSearchSubmit} className="hidden md:flex relative items-center">
              <input
                type="text"
                placeholder="Search IPOs or companies..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                className="w-52 lg:w-60 h-9 pl-8 pr-3 text-xs bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-transparent focus:border-slate-300 rounded-md outline-none transition-all placeholder:text-slate-400 text-slate-900"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            </form>

            <a
              href={SEBI_PUBLIC_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/70 rounded-md transition-colors whitespace-nowrap shrink-0"
              title="Official SEBI Public Issues Portal (RHP & DRHP)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>SEBI Filings</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>

            {adminUser ? (
              <button
                onClick={() => handleNav('/admin')}
                className="h-9 px-3.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Panel</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                className="h-9 px-3 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200/70 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Admin Login</span>
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <input
              type="text"
              placeholder="Search IPOs..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-md outline-none text-slate-900"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </form>

          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.route}
                onClick={() => handleNav(link.route)}
                className={`flex items-center justify-between px-3 py-2.5 text-sm rounded-md text-left transition-colors ${
                  currentRoute === link.route
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{link.label}</span>
              </button>
            ))}

            <a
              href={SEBI_PUBLIC_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2.5 text-sm rounded-md text-slate-700 hover:bg-slate-50 font-medium"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-700" />
                <span>SEBI Public Issues (RHP & DRHP)</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => handleNav('/about')}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Methodology
            </button>
            <button
              onClick={() => handleNav('/disclaimer')}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Statutory Disclaimer
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
