import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { AppUserProfile } from '../lib/auth';
import { SitePolicy } from '../types/ipo';
import { DEFAULT_SITE_POLICIES, getPolicyRoutePath } from '../lib/defaultPolicies';
import { useSitePageContent } from '../lib/siteContent';

interface FooterProps {
  navigate: (route: string) => void;
  userProfile?: AppUserProfile | null;
  isAdmin?: boolean;
  onOpenLogin: () => void;
  policies?: SitePolicy[];
}

export const Footer: React.FC<FooterProps> = ({
  navigate,
  userProfile,
  isAdmin = false,
  onOpenLogin,
  policies = DEFAULT_SITE_POLICIES,
}) => {
  const chrome = useSitePageContent('site_chrome');
  const brandName = chrome.title || 'IPO Insiders';
  const brandTagline =
    chrome.subtitle ||
    'Focused tracking for Indian primary markets — open dates, live subscription multiples, unlisted price references, and multi-PAN allotment checks.';
  const exchangeStrip = chrome.custom_fields.footer_exchange_strip || 'NSE · BSE · Mainboard · SME';
  const marketsHeading = chrome.custom_fields.footer_markets_heading || 'Markets';
  const toolsHeading = chrome.custom_fields.footer_tools_heading || 'Tools';
  const disclosuresHeading = chrome.custom_fields.footer_disclosures_heading || 'Disclosures';
  const sebiLabel = chrome.custom_fields.footer_sebi_label || 'SEBI Filings';
  const rawSebiUrl = (chrome.custom_fields.footer_sebi_url || '').trim();
  const sebiUrl =
    /^https?:\/\//i.test(rawSebiUrl)
      ? rawSebiUrl
      : 'https://www.sebi.gov.in/filings/public-issues.html';
  const copyrightOwner = chrome.custom_fields.footer_copyright || brandName;

  const footerLinkPolicies = policies.filter((p) => p.show_in_footer_links);
  const footerBannerPolicies = policies.filter(
    (p) => p.show_in_footer_banner && p.footer_summary && p.footer_summary.trim().length > 0
  );
  const primaryDisclaimer =
    policies.find((p) => p.slug === 'disclaimer') ||
    policies.find((p) => p.category === 'disclaimer');

  return (
    <footer className="mt-24 bg-[#151B18] text-[#B8B2A6] border-t-2 border-[#C89B4B]/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
        {/* Top Row: Brand Statement + Minimalist Navigation Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 items-start">
          <div className="md:col-span-5 space-y-3.5 max-w-sm">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-lg font-display font-bold tracking-tight text-[#FAF7F1] hover:text-[#E5C17A] transition-colors text-left"
            >
              <span className="w-2.5 h-2.5 rounded-xs bg-[#22804B] ring-2 ring-[#C89B4B]/70" />
              <span>{brandName}</span>
            </button>
            <p className="text-sm text-[#B8B2A6] leading-relaxed tracking-[0.01em]">
              {brandTagline}
            </p>
            {exchangeStrip && (
              <div className="pt-1 text-xs text-[#8C867B]">{exchangeStrip}</div>
            )}
          </div>

          <div
            className={`md:col-span-7 grid grid-cols-2 ${
              footerLinkPolicies.length > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
            } gap-8 text-sm`}
          >
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#E5C17A] tracking-[0.03em] uppercase">
                {marketsHeading}
              </div>
              <ul className="space-y-2.5">
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/ipo/ongoing')}
                    className="text-[#E3DDD2] hover:text-white transition-colors whitespace-nowrap"
                  >
                    Open IPOs
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/ipo/upcoming')}
                    className="text-[#E3DDD2] hover:text-white transition-colors whitespace-nowrap"
                  >
                    Upcoming IPOs
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/ipo/unlisted-price')}
                    className="text-[#E3DDD2] hover:text-white transition-colors whitespace-nowrap"
                  >
                    Unlisted Price Tracker
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/ipo/listed')}
                    className="text-[#E3DDD2] hover:text-white transition-colors whitespace-nowrap"
                  >
                    Listed Performance
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#E5C17A] tracking-[0.03em] uppercase">
                {toolsHeading}
              </div>
              <ul className="space-y-2.5">
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/calendar')}
                    className="text-[#E3DDD2] hover:text-white transition-colors whitespace-nowrap"
                  >
                    IPO Calendar
                  </button>
                </li>
                <li>
                  <a
                    href={sebiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#E3DDD2] hover:text-white transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>{sebiLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#8C867B]" />
                  </a>
                </li>
                {isAdmin ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => navigate('/admin')}
                      className="text-[#E3DDD2] hover:text-white transition-colors whitespace-nowrap"
                    >
                      Admin Console
                    </button>
                  </li>
                ) : !userProfile ? (
                  <li>
                    <button
                      type="button"
                      onClick={onOpenLogin}
                      className="text-[#E3DDD2] hover:text-white transition-colors whitespace-nowrap"
                    >
                      {chrome.secondary_cta_label || 'Login'}
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>

            {footerLinkPolicies.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#E5C17A] tracking-[0.03em] uppercase">
                  {disclosuresHeading}
                </div>
                <ul className="space-y-2.5">
                  {footerLinkPolicies.map((policy) => (
                    <li key={policy.id}>
                      <button
                        type="button"
                        onClick={() => navigate(getPolicyRoutePath(policy.slug))}
                        className="text-[#E3DDD2] hover:text-white transition-colors text-left"
                      >
                        {policy.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Minimalist Disclaimer & Risk Disclosure Section */}
        {footerBannerPolicies.length > 0 && (
          <div className="bg-[#1C2420] border border-[#E5C17A]/15 rounded-lg p-5 sm:p-6 space-y-5 text-xs text-[#B8B2A6] leading-relaxed tracking-[0.01em]">
            {footerBannerPolicies.map((policy, idx) => (
              <div
                key={policy.id}
                className={idx > 0 ? 'pt-4 border-t border-white/10 space-y-2.5' : 'space-y-2.5'}
              >
                <div className="font-semibold text-[#FAF7F1] text-xs">{policy.title}</div>
                {(policy.footer_summary || '')
                  .split(/\n{2,}/)
                  .filter((p) => p.trim().length > 0)
                  .map((paragraph, pIdx) => (
                    <p key={pIdx} className="whitespace-pre-line">
                      {paragraph.trim()}
                    </p>
                  ))}
              </div>
            ))}
          </div>
        )}

        {/* Optional Extra Footer Content Sections */}
        {chrome.extra_sections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#B8B2A6] leading-relaxed">
            {chrome.extra_sections.map((sec, idx) => (
              <div key={idx} className="space-y-1.5">
                {sec.heading && (
                  <div className="font-semibold text-[#FAF7F1] text-xs">{sec.heading}</div>
                )}
                {sec.body && <p className="whitespace-pre-line">{sec.body}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Bottom Legal Line */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#8C867B]">
          {primaryDisclaimer ? (
            <button
              type="button"
              onClick={() => navigate(getPolicyRoutePath(primaryDisclaimer.slug))}
              className="text-[#B8B2A6] hover:text-[#E5C17A] underline underline-offset-4 decoration-white/20 hover:decoration-[#E5C17A] transition-colors"
            >
              Read Full {primaryDisclaimer.title}
            </button>
          ) : (
            <span />
          )}
          <span className="shrink-0 text-[#B8B2A6] tabular-nums">
            © {new Date().getFullYear()} {copyrightOwner}
          </span>
        </div>
      </div>
    </footer>
  );
};
