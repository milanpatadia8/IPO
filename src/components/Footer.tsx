import React from 'react';
import { ExternalLink } from 'lucide-react';
import { AdminUser } from '../types/ipo';

interface FooterProps {
  navigate: (route: string) => void;
  adminUser?: AdminUser | null;
  onOpenAdminLogin: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  navigate,
  adminUser,
  onOpenAdminLogin,
}) => {
  return (
    <footer className="bg-white border-t border-[#EAEAEA] mt-20 text-[#4B5563] text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="space-y-2.5 max-w-sm">
            <div className="text-base font-semibold tracking-tight text-[#111827]">IPO Insiders</div>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Simple tracking for Mainboard and SME IPOs across NSE and BSE — open dates, live subscription multiples, GMP estimates, and one-click multi-PAN allotment checks.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div className="space-y-2.5">
              <div className="font-semibold text-[#111827]">Markets</div>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/ipo/ongoing')} className="hover:text-[#111827] transition-colors">
                    Open IPOs
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/ipo/upcoming')} className="hover:text-[#111827] transition-colors">
                    Upcoming IPOs
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/ipo/gmp')} className="hover:text-[#111827] transition-colors">
                    GMP Tracker
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/ipo/listed')} className="hover:text-[#111827] transition-colors">
                    Listed Performance
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <div className="font-semibold text-[#111827]">Tools</div>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/calendar')} className="hover:text-[#111827] transition-colors">
                    IPO Calendar
                  </button>
                </li>
                <li>
                  <a
                    href="https://www.sebi.gov.in/filings/public-issues.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#111827] transition-colors inline-flex items-center gap-1"
                  >
                    <span>SEBI Filings</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => (adminUser ? navigate('/admin') : onOpenAdminLogin())}
                    className="hover:text-[#111827] transition-colors"
                  >
                    {adminUser ? 'Admin Console' : 'Admin Login'}
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <div className="font-semibold text-[#111827]">Disclosures</div>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/about')} className="hover:text-[#111827] transition-colors">
                    Methodology
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/disclaimer')} className="hover:text-[#111827] transition-colors">
                    GMP Disclaimer
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/terms')} className="hover:text-[#111827] transition-colors">
                    Terms
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/privacy')} className="hover:text-[#111827] transition-colors">
                    Privacy
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-[#F3F4F6] pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#6B7280]">
          <p className="max-w-2xl leading-relaxed">
            Grey Market Premium (GMP) figures are unofficial market observations and not exchange-guaranteed prices. Read the official Red Herring Prospectus (RHP) filed with SEBI before investing.
          </p>
          <span className="shrink-0">
            © {new Date().getFullYear()} IPO Insiders
          </span>
        </div>
      </div>
    </footer>
  );
};
