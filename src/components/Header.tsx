import React, { useState } from 'react';
import { Menu, X, LogOut, Shield, LogIn, UserPen } from 'lucide-react';
import { AppUserProfile, formatUserContact } from '../lib/auth';
import { useSitePageContent } from '../lib/siteContent';

interface HeaderProps {
  currentRoute: string;
  navigate: (route: string) => void;
  userProfile?: AppUserProfile | null;
  isAdmin?: boolean;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
  onOpenAllotment: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  navigate,
  userProfile,
  isAdmin = false,
  onOpenLogin,
  onOpenProfile,
  onSignOut,
  onOpenAllotment,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const chrome = useSitePageContent('site_chrome');
  const brandName = chrome.title || 'IPO Insiders';
  const allotmentBtnLabel = chrome.primary_cta_label || 'Check Allotment';
  const loginBtnLabel = chrome.secondary_cta_label || 'Login';

  const handleNav = (route: string) => {
    navigate(route);
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { label: chrome.custom_fields.nav_ongoing || 'Open', route: '/ipo/ongoing' },
    { label: chrome.custom_fields.nav_upcoming || 'Upcoming', route: '/ipo/upcoming' },
    { label: chrome.custom_fields.nav_unlisted || 'Unlisted Price', route: '/ipo/unlisted-price' },
    { label: chrome.custom_fields.nav_listed || 'Listed', route: '/ipo/listed' },
  ];

  const userInitial = (userProfile?.displayName || 'U').trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F4]/95 backdrop-blur-xs border-b border-[#E6DFD3]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="flex items-center gap-2 text-lg font-display font-bold tracking-tight text-[#1C1917] hover:text-[#14532D] transition-colors whitespace-nowrap shrink-0"
          >
            <span className="w-2.5 h-2.5 rounded-xs bg-[#14532D] ring-2 ring-[#E8D5B0]" />
            <span>{brandName}</span>
          </button>

          {/* Zone 2: Navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57534E]">
            {navLinks.map((link) => {
              const isActive =
                currentRoute === link.route || currentRoute.startsWith(link.route + '/');
              return (
                <button
                  key={link.route}
                  type="button"
                  onClick={() => handleNav(link.route)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    isActive
                      ? 'text-[#14532D] font-semibold border-[#14532D]'
                      : 'border-transparent hover:text-[#1C1917] hover:border-[#D6C7B2]'
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
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#14532D] bg-[#EEF6F0] hover:bg-[#E0EFE4] border border-[#C6E2CE] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAllotment}
              className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 text-sm font-medium text-[#1C1917] bg-white hover:bg-[#FAF4E8] border border-[#DFD6C7] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {allotmentBtnLabel}
            </button>

            {userProfile ? (
              <div className="hidden sm:flex items-center gap-1.5 pl-2.5 ml-0.5 border-l border-[#E6DFD3]">
                <button
                  type="button"
                  onClick={onOpenProfile}
                  title="Edit your profile"
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 text-sm font-medium text-[#1C1917] bg-white hover:bg-[#FAF4E8] border border-[#E6DFD3] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {userProfile.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt={userProfile.displayName}
                      className="w-5 h-5 rounded-sm object-cover"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-sm bg-[#14532D] text-[#FAF7F1] text-[11px] font-semibold flex items-center justify-center">
                      {userInitial}
                    </span>
                  )}
                  <span className="max-w-[110px] truncate">
                    {userProfile.displayName.split(' ')[0]}
                  </span>
                  <UserPen className="w-3.5 h-3.5 text-[#78716C]" />
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
                  title={`Logout (${formatUserContact(userProfile.email, userProfile.phone)})`}
                  className="p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-[#EFEAE0] rounded-lg transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#14532D] hover:bg-[#0F3F22] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>{loginBtnLabel}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#57534E] hover:text-[#1C1917] rounded-lg"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E6DFD3] py-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-1.5">
              {navLinks.map((link) => (
                <button
                  key={link.route}
                  type="button"
                  onClick={() => handleNav(link.route)}
                  className={`text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    currentRoute === link.route
                      ? 'bg-[#EEF6F0] text-[#14532D]'
                      : 'text-[#57534E] hover:bg-[#F2ECE1] hover:text-[#1C1917]'
                  }`}
                >
                  {link.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNav('/admin')}
                  className="text-left px-3 py-2.5 text-sm font-medium rounded-lg text-[#14532D] bg-[#EEF6F0] border border-[#C6E2CE]"
                >
                  Admin Console
                </button>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E6DFD3]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAllotment();
                }}
                className="w-full py-2.5 text-sm font-medium text-[#1C1917] bg-white border border-[#DFD6C7] rounded-lg"
              >
                {allotmentBtnLabel}
              </button>

              {userProfile ? (
                <div className="flex items-center justify-between gap-2 px-1 pt-1 text-xs text-[#57534E]">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenProfile();
                    }}
                    className="inline-flex items-center gap-1.5 truncate font-medium text-[#1C1917] hover:text-[#14532D]"
                  >
                    <UserPen className="w-3.5 h-3.5 text-[#14532D] shrink-0" />
                    <span className="truncate">
                      {userProfile.displayName} · Edit Profile
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSignOut();
                    }}
                    className="text-[#B91C1C] font-medium hover:underline shrink-0"
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
                  className="w-full py-2.5 text-sm font-medium text-white bg-[#14532D] rounded-lg"
                >
                  {loginBtnLabel}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
