import React, { useState, useEffect } from 'react';
import { IPO, IPOCategory } from '../types/ipo';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { StatusIndicator } from '../components/StatusIndicator';
import { GMPDisplay } from '../components/GMPDisplay';
import { SubscriptionProgress } from '../components/SubscriptionProgress';
import {
  formatCrores,
  calculateDaysRemaining,
  getEffectiveMinInvestment,
  formatIndianDate,
} from '../lib/calculations';
import { useSitePageContent } from '../lib/siteContent';
import { PageNoticeBanner, PageExtraSections } from '../components/PageCustomSections';
import { Search } from 'lucide-react';

interface OngoingIPOsPageProps {
  navigate: (route: string) => void;
  searchParam?: string;
  onRequireLogin?: (reason?: string, onAfterLogin?: () => void) => void;
}

export const OngoingIPOsPage: React.FC<OngoingIPOsPageProps> = ({
  navigate,
  searchParam = '',
  onRequireLogin,
}) => {
  const { isSignedIn } = useAuth();
  const pageContent = useSitePageContent('ongoing');
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParam);
  const [categoryFilter, setCategoryFilter] = useState<IPOCategory | 'all'>('all');
  const [gmpOnly, setGmpOnly] = useState(false);

  useEffect(() => {
    async function loadOngoing() {
      setLoading(true);
      try {
        const all = await api.getAllIPOs();
        setIPOs(all.filter((i) => i.status === 'ongoing' || i.status === 'closed'));
      } catch (err) {
        console.error('Failed to load ongoing IPOs', err);
      } finally {
        setLoading(false);
      }
    }
    loadOngoing();
  }, []);

  const filtered = ipos.filter((ipo) => {
    if (categoryFilter !== 'all' && ipo.category !== categoryFilter) return false;
    if (gmpOnly && !ipo.latest_gmp) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = ipo.company?.name.toLowerCase().includes(q);
      const matchSlug = ipo.slug.toLowerCase().includes(q);
      const matchEx = ipo.exchange.toLowerCase().includes(q);
      if (!matchName && !matchSlug && !matchEx) return false;
    }
    return true;
  });

  const activeBidding = filtered.filter((i) => i.status === 'ongoing');
  const recentlyClosed = filtered.filter((i) => i.status === 'closed');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2 border-b border-[#E6DFD3] pb-6">
        {pageContent.eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#14532D]">
            {pageContent.eyebrow}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#1C1917] tracking-tight">
          {pageContent.title}
        </h1>
        {pageContent.subtitle && (
          <p className="text-base text-[#57534E] max-w-2xl leading-relaxed">
            {pageContent.subtitle}
          </p>
        )}
      </div>

      <PageNoticeBanner
        title={pageContent.notice_banner_title}
        body={pageContent.notice_banner_body}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E6DFD3] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={
              pageContent.custom_fields.search_placeholder ||
              'Search by company, exchange or symbol...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-sm bg-[#FAF7F1] border border-[#DFD6C7] focus:border-[#14532D] focus:bg-white rounded-lg outline-none text-[#1C1917] placeholder:text-[#78716C] transition-colors"
          />
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-3 pointer-events-none" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#EFE9DD] border border-[#E6DFD3] rounded-lg">
            {(['all', 'Mainboard', 'SME'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#14532D] text-white font-medium'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setGmpOnly(!gmpOnly)}
            className={`px-3.5 py-2 text-sm rounded-lg border transition-colors ${
              gmpOnly
                ? 'bg-[#14532D] text-white border-[#14532D] font-medium'
                : 'bg-white text-[#57534E] border-[#DFD6C7] hover:bg-[#FAF7F1] hover:text-[#1C1917]'
            }`}
          >
            Unlisted Price Available
          </button>
        </div>
      </div>

      {/* Active Issues Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-2">
          <h2 className="text-lg font-display font-semibold text-[#1C1917]">
            {pageContent.custom_fields.open_section_heading || 'Open for Bidding'} ({activeBidding.length})
          </h2>
          <span className="text-xs text-[#78716C]">
            {pageContent.custom_fields.open_section_sublabel || 'NSE / BSE consolidated feed'}
          </span>
        </div>

        {loading ? (
          <div className="bg-white border border-[#E6DFD3] rounded-xl p-10 text-center text-[#57534E] text-sm">
            Loading open issues...
          </div>
        ) : activeBidding.length === 0 ? (
          <div className="bg-white border border-[#E6DFD3] rounded-xl p-10 text-center text-[#57534E] text-sm">
            {pageContent.custom_fields.empty_state_text ||
              'No open IPOs match the selected filter criteria today.'}
          </div>
        ) : (
          <div className="space-y-4">
            {activeBidding.map((ipo) => {
              const daysRem = calculateDaysRemaining(ipo.close_date);
              const minApp = getEffectiveMinInvestment(ipo);

              return (
                <div
                  key={ipo.id}
                  className="bg-white border border-[#E6DFD3] rounded-xl p-5 hover:border-[#C9BEA9] transition-colors space-y-4 shadow-2xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <StatusIndicator
                          status={ipo.status}
                          category={ipo.category}
                        />
                        <span className="text-[#D6CEC0]" aria-hidden="true">·</span>
                        <span className="text-[#57534E]">{ipo.exchange}</span>
                        {daysRem.days !== null && (
                          <>
                            <span className="text-[#D6CEC0]" aria-hidden="true">·</span>
                            <span className="text-[#15803D] font-medium">
                              {daysRem.statusText}
                            </span>
                          </>
                        )}
                      </div>
                      <h3
                        onClick={() => navigate(`/ipo/${ipo.slug}`)}
                        className="text-lg font-display font-semibold text-[#1C1917] hover:text-[#14532D] cursor-pointer transition-colors"
                      >
                        {ipo.company?.name || ipo.slug}
                      </h3>
                      {ipo.company?.description && (
                        <p className="text-sm text-[#57534E] line-clamp-1 max-w-2xl">
                          {ipo.company.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/ipo/${ipo.slug}`)}
                        className="px-3.5 py-2 bg-[#FAF7F1] hover:bg-[#EFE9DD] text-[#1C1917] border border-[#DFD6C7] font-medium text-sm rounded-lg transition-colors whitespace-nowrap"
                      >
                        {pageContent.secondary_cta_label || 'View Details'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isSignedIn && onRequireLogin) {
                            onRequireLogin(
                              `Login to apply for ${ipo.company?.name || ipo.slug}.`,
                              () => navigate(`/ipo/${ipo.slug}?apply=1`)
                            );
                            return;
                          }
                          navigate(`/ipo/${ipo.slug}?apply=1`);
                        }}
                        className="px-4 py-2 bg-[#14532D] hover:bg-[#0F3F22] text-white font-medium text-sm rounded-lg transition-colors whitespace-nowrap"
                      >
                        {pageContent.primary_cta_label || 'Apply for IPO'}
                      </button>
                    </div>
                  </div>

                  {/* Financial Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-[#EFE9DD] text-sm font-mono tabular-nums">
                    <div>
                      <span className="font-sans text-[#78716C] block text-xs">Price Band</span>
                      <span className="font-medium text-[#1C1917]">
                        {ipo.price_band_min && ipo.price_band_max
                          ? `₹${ipo.price_band_min} – ₹${ipo.price_band_max}`
                          : 'TBA'}
                      </span>
                    </div>

                    <div>
                      <span className="font-sans text-[#78716C] block text-xs">Lot / Min Investment</span>
                      <span className="font-medium text-[#1C1917]">
                        {ipo.lot_size ? `${ipo.lot_size} sh` : 'N/A'}{' '}
                        {minApp ? `(₹${minApp.toLocaleString('en-IN')})` : ''}
                      </span>
                    </div>

                    <div>
                      <span className="font-sans text-[#78716C] block text-xs">Total Issue Size</span>
                      <span className="font-medium text-[#1C1917]">
                        {formatCrores(ipo.issue_size)}
                      </span>
                    </div>

                    <div>
                      <span className="font-sans text-[#78716C] block text-xs">Bidding Window</span>
                      <span className="font-medium text-[#1C1917]">
                        {formatIndianDate(ipo.open_date)} – {formatIndianDate(ipo.close_date)}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Analytics: Subscription Progress & Unlisted Price */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="p-4 bg-[#FAF7F1] rounded-lg border border-[#E6DFD3]">
                      <span className="text-xs font-medium text-[#57534E] block mb-2">
                        Live Subscription Multiples
                      </span>
                      <SubscriptionProgress subscription={ipo.latest_subscription} />
                    </div>

                    <div className="p-4 bg-[#FAF7F1] rounded-lg border border-[#E6DFD3]">
                      <span className="text-xs font-medium text-[#57534E] block mb-2">
                        Indicative Unlisted Price
                      </span>
                      <GMPDisplay
                        latestGmp={ipo.latest_gmp}
                        previousGmp={ipo.previous_gmp}
                        basePrice={ipo.issue_price || ipo.price_band_max}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Closed Issues */}
      {recentlyClosed.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-[#E6DFD3]">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6DFD3]">
            <h2 className="text-lg font-display font-semibold text-[#1C1917]">
              {pageContent.custom_fields.closed_section_heading ||
                'Recently Closed — Awaiting Allotment'}{' '}
              ({recentlyClosed.length})
            </h2>
            <span className="text-xs text-[#78716C]">
              {pageContent.custom_fields.closed_section_sublabel || 'Basis of allotment pending'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentlyClosed.map((ipo) => (
              <div
                key={ipo.id}
                onClick={() => navigate(`/ipo/${ipo.slug}`)}
                className="bg-white border border-[#E6DFD3] rounded-xl p-4 hover:border-[#C9BEA9] transition-colors cursor-pointer space-y-2.5"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h4 className="font-semibold text-[#1C1917] text-base hover:text-[#14532D]">
                      {ipo.company?.name || ipo.slug}
                    </h4>
                    <div className="text-xs text-[#57534E] mt-0.5">
                      {ipo.category} · Closed {formatIndianDate(ipo.close_date)}
                    </div>
                  </div>
                  <span className="text-xs text-[#57534E] font-mono tabular-nums shrink-0">
                    Allotment: {formatIndianDate(ipo.allotment_date)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#EFE9DD] text-sm tabular-nums">
                  <span className="text-[#57534E]">Final Multiple</span>
                  <span className="font-mono font-semibold text-[#1C1917]">
                    {ipo.latest_subscription ? `${ipo.latest_subscription.total_multiple.toFixed(2)}x` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PageExtraSections sections={pageContent.extra_sections} />
    </div>
  );
};
