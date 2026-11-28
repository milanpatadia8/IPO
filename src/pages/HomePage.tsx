import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { IPO, IPOCategory } from '../types/ipo';
import { api } from '../lib/api';
import {
  formatCrores,
  calculateDaysRemaining,
  getEffectiveMinInvestment,
  calculateListingGainPercentage,
  calculateIndicativeGainPercentage,
  formatIndianDate,
} from '../lib/calculations';
import { useSitePageContent } from '../lib/siteContent';
import { PageNoticeBanner, PageExtraSections } from '../components/PageCustomSections';

interface HomePageProps {
  navigate: (route: string) => void;
  onOpenAllotment?: (slug?: string) => void;
  onOpenCommandPalette?: () => void;
}

type StatusTab = 'ongoing' | 'upcoming' | 'closed' | 'listed' | 'all';

export const HomePage: React.FC<HomePageProps> = ({
  navigate,
  onOpenAllotment,
  onOpenCommandPalette,
}) => {
  const pageContent = useSitePageContent('home');
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<StatusTab>('ongoing');
  const [categoryFilter, setCategoryFilter] = useState<IPOCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const allIpos = await api.getAllIPOs();
        setIPOs(allIpos);
      } catch (err) {
        console.error('Failed to load IPO directory', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const counts = useMemo(() => {
    const byCategory = ipos.filter((i) =>
      categoryFilter === 'all' ? true : i.category === categoryFilter
    );
    return {
      ongoing: byCategory.filter((i) => i.status === 'ongoing').length,
      upcoming: byCategory.filter((i) => i.status === 'upcoming').length,
      closed: byCategory.filter((i) => i.status === 'closed').length,
      listed: byCategory.filter((i) => i.status === 'listed').length,
      all: byCategory.length,
    };
  }, [ipos, categoryFilter]);

  const filteredIPOs = useMemo(() => {
    return ipos.filter((ipo) => {
      if (categoryFilter !== 'all' && ipo.category !== categoryFilter) return false;
      if (statusTab !== 'all' && ipo.status !== statusTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (ipo.company?.name || '').toLowerCase().includes(q);
        const matchSlug = ipo.slug.toLowerCase().includes(q);
        const matchEx = ipo.exchange.toLowerCase().includes(q);
        if (!matchName && !matchSlug && !matchEx) return false;
      }
      return true;
    });
  }, [ipos, categoryFilter, statusTab, searchQuery]);

  const statusTabs: Array<{ id: StatusTab; label: string; count: number }> = [
    { id: 'ongoing', label: 'Open', count: counts.ongoing },
    { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
    { id: 'closed', label: 'Closed', count: counts.closed },
    { id: 'listed', label: 'Listed', count: counts.listed },
    { id: 'all', label: 'All', count: counts.all },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
      {/* Warm Editorial Hero Panel */}
      <section className="rounded-2xl bg-gradient-to-br from-[#FDFBF6] via-[#FAF5EA] to-[#F2ECE0] border border-[#E6DFD3] px-6 py-9 sm:px-10 sm:py-12">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          {pageContent.eyebrow && (
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A5B13]">
              {pageContent.eyebrow}
            </div>
          )}
          <h1 className="text-3xl sm:text-5xl font-display font-bold text-[#1C1917] tracking-tight leading-[1.12]">
            {pageContent.title}
          </h1>
          {pageContent.subtitle && (
            <p className="text-base sm:text-lg text-[#57534E] leading-relaxed">
              {pageContent.subtitle}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenAllotment?.(undefined)}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#14532D] hover:bg-[#0F3F22] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              {pageContent.primary_cta_label || 'Check Allotment'}
            </button>

            <button
              type="button"
              onClick={() => onOpenCommandPalette?.()}
              className="w-full sm:w-64 px-3.5 py-2.5 bg-white hover:bg-[#FAF7F1] border border-[#DFD6C7] rounded-lg text-sm text-[#57534E] flex items-center justify-between gap-3 transition-colors"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-4 h-4 text-[#78716C] shrink-0" />
                <span>{pageContent.secondary_cta_label || 'Quick search any IPO...'}</span>
              </span>
              <kbd className="text-xs font-mono text-[#78716C] shrink-0">⌘K</kbd>
            </button>
          </div>
        </div>

        {/* Compact Live Market Snapshot Strip */}
        <div className="mt-8 pt-6 border-t border-[#E6DFD3] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setStatusTab('ongoing')}
            className={`text-left rounded-xl px-4 py-3 border transition-colors ${
              statusTab === 'ongoing'
                ? 'bg-[#EEF6F0] border-[#B6DAC0]'
                : 'bg-white/80 border-[#E6DFD3] hover:bg-white'
            }`}
          >
            <div className="text-xs font-medium text-[#57534E]">
              {pageContent.custom_fields.stat_open_label || 'Open for Bidding'}
            </div>
            <div className="text-2xl font-display font-bold text-[#14532D] tabular-nums mt-0.5">
              {loading ? '—' : counts.ongoing}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('upcoming')}
            className={`text-left rounded-xl px-4 py-3 border transition-colors ${
              statusTab === 'upcoming'
                ? 'bg-[#FDF6E9] border-[#E6CA9B]'
                : 'bg-white/80 border-[#E6DFD3] hover:bg-white'
            }`}
          >
            <div className="text-xs font-medium text-[#57534E]">
              {pageContent.custom_fields.stat_upcoming_label || 'Upcoming Pipeline'}
            </div>
            <div className="text-2xl font-display font-bold text-[#9A5B13] tabular-nums mt-0.5">
              {loading ? '—' : counts.upcoming}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('listed')}
            className={`text-left rounded-xl px-4 py-3 border transition-colors ${
              statusTab === 'listed'
                ? 'bg-white border-[#C9BEA9]'
                : 'bg-white/80 border-[#E6DFD3] hover:bg-white'
            }`}
          >
            <div className="text-xs font-medium text-[#57534E]">
              {pageContent.custom_fields.stat_listed_label || 'Listed Issues'}
            </div>
            <div className="text-2xl font-display font-bold text-[#1C1917] tabular-nums mt-0.5">
              {loading ? '—' : counts.listed}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('all')}
            className={`text-left rounded-xl px-4 py-3 border transition-colors ${
              statusTab === 'all'
                ? 'bg-white border-[#C9BEA9]'
                : 'bg-white/80 border-[#E6DFD3] hover:bg-white'
            }`}
          >
            <div className="text-xs font-medium text-[#57534E]">
              {pageContent.custom_fields.stat_total_label || 'Total Tracked'}
            </div>
            <div className="text-2xl font-display font-bold text-[#1C1917] tabular-nums mt-0.5">
              {loading ? '—' : counts.all}
            </div>
          </button>
        </div>
      </section>

      <PageNoticeBanner
        title={pageContent.notice_banner_title}
        body={pageContent.notice_banner_body}
      />

      {/* Main Unified IPO Board */}
      <section className="space-y-4">
        {/* Clean Toolbar: Status Tabs + Category Toggle + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Segmented Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#EFE9DD] border border-[#E6DFD3] rounded-lg overflow-x-auto">
            {statusTabs.map((tab) => {
              const active = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusTab(tab.id)}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#14532D] text-white shadow-2xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <div className="flex items-center gap-1 p-1 bg-[#EFE9DD] border border-[#E6DFD3] rounded-lg">
              {(['all', 'Mainboard', 'SME'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-white text-[#1C1917] shadow-2xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>

            {/* Inline Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder={pageContent.custom_fields.search_placeholder || 'Filter by company...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-56 h-9.5 pl-9 pr-3 text-sm bg-white border border-[#DFD6C7] focus:border-[#14532D] rounded-lg outline-none text-[#1C1917] placeholder:text-[#78716C] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Clean Single-Elevation IPO Table */}
        <div className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden shadow-2xs">
          {loading ? (
            <div className="divide-y divide-[#F2ECE1]">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="px-5 py-4 flex items-center justify-between animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-[#F2ECE1] rounded" />
                    <div className="h-3 w-32 bg-[#F2ECE1] rounded" />
                  </div>
                  <div className="h-4 w-24 bg-[#F2ECE1] rounded" />
                </div>
              ))}
            </div>
          ) : ipos.length === 0 ? (
            <div className="py-16 px-6 text-center space-y-2">
              <p className="text-base font-medium text-[#1C1917]">No IPOs published yet</p>
              <p className="text-sm text-[#57534E] max-w-md mx-auto">
                Mainboard and SME IPO listings, subscription numbers, and indicative unlisted prices will appear here once added from the Admin Console.
              </p>
            </div>
          ) : filteredIPOs.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-3">
              <p className="text-base font-medium text-[#1C1917]">No matching IPOs</p>
              <p className="text-sm text-[#57534E]">
                Try switching the status tab or clearing your search filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatusTab('all');
                  setCategoryFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-sm font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#0F3F22] transition-colors"
              >
                Show All IPOs
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FAF6EE] border-b border-[#E6DFD3] text-[#57534E] text-xs font-semibold">
                  <tr>
                    <th className="py-3.5 px-5">Company</th>
                    <th className="py-3.5 px-3">Dates</th>
                    <th className="py-3.5 px-3 text-right">Price Band</th>
                    <th className="py-3.5 px-3 text-right">Min Investment</th>
                    <th className="py-3.5 px-3 text-right">Unlisted Price</th>
                    <th className="py-3.5 px-3 text-right">
                      {statusTab === 'listed' ? 'Listing Gain' : 'Subscription'}
                    </th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2ECE1]">
                  {filteredIPOs.map((ipo) => {
                    const daysRem = calculateDaysRemaining(ipo.close_date);
                    const minApp = getEffectiveMinInvestment(ipo);
                    const basePrice = ipo.issue_price || ipo.price_band_max;
                    const gmpPct =
                      ipo.latest_gmp && basePrice
                        ? calculateIndicativeGainPercentage(basePrice, ipo.latest_gmp.gmp_amount)
                        : null;
                    const listingGainPct =
                      ipo.listing_result
                        ? calculateListingGainPercentage(
                            ipo.listing_result.issue_price,
                            ipo.listing_result.listing_price
                          )
                        : null;

                    return (
                      <tr
                        key={ipo.id}
                        onClick={() => navigate(`/ipo/${ipo.slug}`)}
                        className="hover:bg-[#FAF7F1] transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-5">
                          <div className="font-semibold text-sm sm:text-[15px] text-[#1C1917] group-hover:text-[#14532D] transition-colors">
                            {ipo.company?.name || ipo.slug}
                          </div>
                          <div className="text-xs text-[#57534E] flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span
                              className={
                                ipo.category === 'SME'
                                  ? 'text-[#9A5B13] font-medium'
                                  : 'text-[#14532D] font-medium'
                              }
                            >
                              {ipo.category}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{ipo.exchange}</span>
                            {ipo.issue_size && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">{formatCrores(ipo.issue_size)}</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-3 whitespace-nowrap">
                          <div className="font-mono tabular-nums text-xs sm:text-sm text-[#1C1917]">
                            {ipo.open_date
                              ? `${formatIndianDate(ipo.open_date)} – ${formatIndianDate(ipo.close_date)}`
                              : 'Dates TBA'}
                          </div>
                          <div className="text-xs mt-0.5">
                            {ipo.status === 'ongoing' && daysRem.days !== null ? (
                              <span className="text-[#15803D] font-medium">{daysRem.statusText}</span>
                            ) : ipo.status === 'listed' && ipo.listing_date ? (
                              <span className="text-[#57534E]">Listed {formatIndianDate(ipo.listing_date)}</span>
                            ) : ipo.status === 'upcoming' ? (
                              <span className="text-[#B45309] font-medium">Upcoming</span>
                            ) : (
                              <span className="text-[#57534E] capitalize">{ipo.status}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-3 text-right font-mono tabular-nums whitespace-nowrap text-[#1C1917] font-medium">
                          {ipo.price_band_min && ipo.price_band_max
                            ? `₹${ipo.price_band_min} – ₹${ipo.price_band_max}`
                            : ipo.price_band_max || ipo.issue_price
                            ? `₹${ipo.price_band_max || ipo.issue_price}`
                            : 'TBA'}
                        </td>

                        <td className="py-4 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          <div className="font-medium text-[#1C1917]">
                            {minApp ? `₹${minApp.toLocaleString('en-IN')}` : '—'}
                          </div>
                          {ipo.lot_size && (
                            <div className="text-xs font-sans text-[#78716C]">{ipo.lot_size} shares</div>
                          )}
                        </td>

                        <td className="py-4 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {ipo.latest_gmp ? (
                            <div>
                              <span
                                className={`font-medium ${
                                  ipo.latest_gmp.gmp_amount >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                                }`}
                              >
                                {ipo.latest_gmp.gmp_amount >= 0 ? '+' : ''}₹{ipo.latest_gmp.gmp_amount}
                              </span>
                              {gmpPct !== null && (
                                <div
                                  className={`text-xs ${
                                    gmpPct >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                                  }`}
                                >
                                  {gmpPct >= 0 ? '+' : ''}{gmpPct}%
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#78716C]">—</span>
                          )}
                        </td>

                        <td className="py-4 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {ipo.status === 'listed' && listingGainPct !== null ? (
                            <span
                              className={`font-semibold ${
                                listingGainPct >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                              }`}
                            >
                              {listingGainPct >= 0 ? '+' : ''}{listingGainPct}%
                            </span>
                          ) : ipo.latest_subscription ? (
                            <div>
                              <span className="font-semibold text-[#1C1917]">
                                {ipo.latest_subscription.total_multiple.toFixed(2)}x
                              </span>
                              {ipo.latest_subscription.day_number && (
                                <div className="text-xs font-sans text-[#78716C]">
                                  Day {ipo.latest_subscription.day_number}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="font-sans text-[#78716C]">Awaiting</span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          {ipo.status === 'closed' || ipo.status === 'listed' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenAllotment?.(ipo.slug);
                              }}
                              className="px-3.5 py-1.5 text-sm font-medium bg-[#FAF7F1] hover:bg-[#EFE9DD] text-[#1C1917] border border-[#DFD6C7] rounded-lg transition-colors"
                            >
                              Allotment
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/ipo/${ipo.slug}`);
                              }}
                              className="px-3.5 py-1.5 text-sm font-medium bg-[#14532D] hover:bg-[#0F3F22] text-white rounded-lg transition-colors"
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <PageExtraSections sections={pageContent.extra_sections} />
    </div>
  );
};
