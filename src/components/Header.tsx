import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AdminUser } from '../types/ipo';

interface HeaderProps {
  currentRoute: string;
  navigate: (route: string) => void;
  adminUser?: AdminUser | null;
  onOpenAdminLogin: () => void;
  onOpenAllotment: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  navigate,
  adminUser,
  onOpenAdminLogin,
  onOpenAllotment,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (route: string) => {
    navigate(route);
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { label: 'Open', route: '/ipo/ongoing' },
    { label: 'Upcoming', route: '/ipo/upcoming' },
    { label: 'GMP', route: '/ipo/gmp' },
    { label: 'Listed', route: '/ipo/listed' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-[#EAEAEA]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="text-lg font-semibold tracking-tight text-[#111827] hover:opacity-80 transition-opacity whitespace-nowrap shrink-0"
          >
            IPO Insiders
          </button>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4B5563]">
            {navLinks.map((link) => {
              const isActive =
                currentRoute === link.route || currentRoute.startsWith(link.route + '/');
              return (
                <button
                  key={link.route}
                  type="button"
                  onClick={() => handleNav(link.route)}
                  className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#111827] hover:underline underline-offset-4 ${
                    isActive ? 'text-[#111827] font-semibold' : ''
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenAllotment}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#111827] hover:bg-[#1F2937] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Check Allotment
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#4B5563] hover:text-[#111827] rounded-lg"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#EAEAEA] py-3 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              {navLinks.map((link) => (
                <button
                  key={link.route}
                  type="button"
                  onClick={() => handleNav(link.route)}
                  className={`text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    currentRoute === link.route
                      ? 'bg-[#F3F4F6] text-[#111827]'
                      : 'text-[#4B5563] hover:bg-[#FAFAFA] hover:text-[#111827]'
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (adminUser) handleNav('/admin');
                  else onOpenAdminLogin();
                }}
                className="text-left px-3 py-2.5 text-sm font-medium rounded-lg text-[#4B5563] hover:bg-[#FAFAFA] hover:text-[#111827]"
              >
                {adminUser ? 'Admin Console' : 'Admin Login'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAllotment();
              }}
              className="w-full py-2.5 text-sm font-medium text-white bg-[#111827] rounded-lg"
            >
              Check Allotment
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
