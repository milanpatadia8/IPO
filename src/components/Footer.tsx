import React from 'react';
import { Shield, AlertTriangle, ExternalLink, Database } from 'lucide-react';

interface FooterProps {
  navigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-16 text-slate-600 text-xs">
      {/* Risk Notice Banner */}
      <div className="bg-amber-50/60 border-b border-amber-200/50 py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-amber-900 leading-relaxed text-[11px] sm:text-xs">
            <strong className="font-semibold text-amber-950">Statutory & Speculative Risk Warning:</strong> Grey Market Premium (GMP) is strictly unofficial, speculative, and based on unregulated dealer circle observations. It does not constitute an exchange-guaranteed transaction price or promise of listing gain. Investments in initial public offerings are subject to market risks; read all offer documents (DRHP/RHP) thoroughly before applying.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                IPO
              </div>
              <span className="font-bold text-slate-900 text-sm">IPO Tracker India</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[12px]">
              Independent intelligence dashboard monitoring Indian Mainboard and SME Initial Public Offerings across NSE and BSE.
            </p>
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>UTC / IST Standard Timestamps</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-slate-900 text-xs tracking-wider uppercase">Market Desks</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('/ipo/ongoing')}
                  className="hover:text-slate-900 transition-colors"
                >
                  Ongoing Issues
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/ipo/upcoming')}
                  className="hover:text-slate-900 transition-colors"
                >
                  Upcoming IPOs
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/ipo/listed')}
                  className="hover:text-slate-900 transition-colors"
                >
                  Historical Listing Gains
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/ipo/gmp')}
                  className="hover:text-slate-900 transition-colors"
                >
                  Grey Market Premium (GMP)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/calendar')}
                  className="hover:text-slate-900 transition-colors"
                >
                  IPO Event Calendar
                </button>
              </li>
            </ul>
          </div>

          {/* Governance & Methodology */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-slate-900 text-xs tracking-wider uppercase">Data Architecture</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('/about')}
                  className="hover:text-slate-900 transition-colors"
                >
                  Data Methodology & Provenance
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/disclaimer')}
                  className="hover:text-slate-900 transition-colors"
                >
                  SEBI Risk Disclaimers
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/terms')}
                  className="hover:text-slate-900 transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/privacy')}
                  className="hover:text-slate-900 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Official Registrars & Exchanges */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-slate-900 text-xs tracking-wider uppercase">Official Portals</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.nseindia.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  <span>National Stock Exchange (NSE)</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.bseindia.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  <span>Bombay Stock Exchange (BSE)</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.sebi.gov.in/filings/public-issues.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors font-medium text-slate-700"
                >
                  <span>SEBI Public Issues (RHP & DRHP)</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <button
                  onClick={() => navigate('/admin')}
                  className="text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium pt-1"
                >
                  <span>Administrative Control Desk</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} IPO Tracker India. Built for Indian capital markets intelligence.
          </div>
          <div className="flex items-center gap-3">
            <span>Development fixtures clearly labeled</span>
            <span aria-hidden="true">·</span>
            <span>All amounts in INR</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
