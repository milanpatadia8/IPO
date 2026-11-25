import React, { useState } from 'react';
import { Menu, X, LogOut, Shield, LogIn } from 'lucide-react';
import { AppUserProfile } from '../lib/auth';

interface HeaderProps {
  currentRoute: string;
  navigate: (route: string) => void;
  userProfile?: AppUserProfile | null;
  isAdmin?: boolean;
  onOpenLogin: () => void;
  onSignOut: () => void;
  onOpenAllotment: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  navigate,
  userProfile,
  isAdmin = false,
  onOpenLogin,
  onSignOut,
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
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="text-lg font-semibold tracking-tight text-[#111827] hover:opacity-80 transition-opacity whitespace-nowrap shrink-0"
          >
            IPO Insiders
          </button>

          {/* Zone 2: Navigation links */}
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

          {/* Zone 3: Auth & Primary Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNav('/admin')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#111827] bg-[#F3F4F6] hover:bg-[#E5E7EB] border border-[#E5E7EB] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAllotment}
              className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 text-sm font-medium text-[#111827] bg-white hover:bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Check Allotment
            </button>

            {userProfile ? (
              <div className="hidden sm:flex items-center gap-2 pl-2 ml-0.5 border-l border-[#EAEAEA]">
                <span className="text-sm font-medium text-[#111827] max-w-[120px] truncate">
                  {userProfile.displayName.split(' ')[0]}
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  title={`Logout (${userProfile.email})`}
                  className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#111827] hover:bg-[#1F2937] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </button>
            )}

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
          <div className="md:hidden border-t border-[#EAEAEA] py-3 space-y-2.5">
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
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNav('/admin')}
                  className="text-left px-3 py-2.5 text-sm font-medium rounded-lg text-[#111827] bg-[#F3F4F6]"
                >
                  Admin Console
                </button>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-[#EAEAEA]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAllotment();
                }}
                className="w-full py-2.5 text-sm font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-lg"
              >
                Check Allotment
              </button>

              {userProfile ? (
                <div className="flex items-center justify-between px-1 pt-1 text-xs text-[#4B5563]">
                  <span className="truncate font-medium text-[#111827]">
                    {userProfile.displayName} ({isAdmin ? 'Admin' : 'End User'})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSignOut();
                    }}
                    className="text-[#DC2626] font-medium hover:underline"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full py-2.5 text-sm font-medium text-white bg-[#111827] rounded-lg"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
