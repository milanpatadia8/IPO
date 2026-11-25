import React, { useState, useEffect, useMemo } from 'react';
import { Search, ArrowRight, Calculator, CheckCircle2 } from 'lucide-react';
import { IPO, IPOCategory } from '../types/ipo';
import { api } from '../lib/api';
import { getSavedPANCount } from '../components/AllotmentCheckerModal';
import {
  formatCrores,
  calculateDaysRemaining,
  calculateMinApplication,
  calculateListingGainPercentage,
  calculateIndicativeGainPercentage,
  formatIndianDate,
} from '../lib/calculations';

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
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<StatusTab>('ongoing');
  const [categoryFilter, setCategoryFilter] = useState<IPOCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedPanCount, setSavedPanCount] = useState(0);

  useEffect(() => {
    setSavedPanCount(getSavedPANCount());
  }, []);

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 space-y-10">
      {/* Minimal Hero */}
      <section className="text-center max-w-2xl mx-auto space-y-5 pt-2">
        <h1 className="text-3xl sm:text-5xl font-bold text-[#111827] tracking-tight leading-[1.15]">
          Track IPOs and check allotment in one click.
        </h1>
        <p className="text-base sm:text-lg text-[#4B5563] leading-relaxed">
          Mainboard and SME IPO dates, live subscription multiples, grey market premiums, and saved multi-PAN allotment status in one clean view.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => onOpenAllotment?.(undefined)}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Check Allotment
          </button>

          <button
            type="button"
            onClick={() => onOpenCommandPalette?.()}
            className="w-full sm:w-64 px-3.5 py-2.5 bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm text-[#4B5563] flex items-center justify-between gap-3 transition-colors"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
              <span>Quick search any IPO...</span>
            </span>
            <kbd className="text-xs text-[#6B7280] shrink-0">⌘K</kbd>
          </button>
        </div>
      </section>

      {/* Main Unified IPO Board */}
      <section className="space-y-4">
        {/* Clean Toolbar: Status Tabs + Category Toggle + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Segmented Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#F3F4F6] rounded-lg overflow-x-auto">
            {statusTabs.map((tab) => {
              const active = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusTab(tab.id)}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-[#111827] shadow-2xs'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <div className="flex items-center gap-1 p-1 bg-[#F3F4F6] rounded-lg">
              {(['all', 'Mainboard', 'SME'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-white text-[#111827] shadow-2xs'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>

            {/* Inline Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-56 h-9.5 pl-9 pr-3 text-sm bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-[#111827] placeholder:text-[#6B7280] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Clean Single-Elevation IPO Table */}
        <div className="bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-[#F3F4F6]">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="px-5 py-4 flex items-center justify-between animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-[#F3F4F6] rounded" />
                    <div className="h-3 w-32 bg-[#F3F4F6] rounded" />
                  </div>
                  <div className="h-4 w-24 bg-[#F3F4F6] rounded" />
                </div>
              ))}
            </div>
          ) : filteredIPOs.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-3">
              <p className="text-base font-medium text-[#111827]">No matching IPOs</p>
              <p className="text-sm text-[#4B5563]">
                Try switching the status tab or clearing your search filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatusTab('all');
                  setCategoryFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-sm font-medium bg-[#111827] text-white rounded-lg hover:bg-[#1F2937] transition-colors"
              >
                Show All IPOs
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FAFAFA] border-b border-[#EAEAEA] text-[#4B5563] text-xs font-semibold">
                  <tr>
                    <th className="py-3.5 px-5">Company</th>
                    <th className="py-3.5 px-3">Dates</th>
                    <th className="py-3.5 px-3 text-right">Price Band</th>
                    <th className="py-3.5 px-3 text-right">Min Investment</th>
                    <th className="py-3.5 px-3 text-right">GMP</th>
                    <th className="py-3.5 px-3 text-right">
                      {statusTab === 'listed' ? 'Listing Gain' : 'Subscription'}
                    </th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {filteredIPOs.map((ipo) => {
                    const daysRem = calculateDaysRemaining(ipo.close_date);
                    const minApp = calculateMinApplication(ipo.price_band_max, ipo.lot_size);
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
                        className="hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-5">
                          <div className="font-semibold text-sm sm:text-[15px] text-[#111827] group-hover:underline underline-offset-2">
                            {ipo.company?.name || ipo.slug}
                          </div>
                          <div className="text-xs text-[#4B5563] flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>{ipo.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{ipo.exchange}</span>
                            {ipo.issue_size && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">{formatCrores(ipo.issue_size)}</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-3 whitespace-nowrap">
                          <div className="tabular-nums text-[#111827]">
                            {ipo.open_date
                              ? `${formatIndianDate(ipo.open_date)} – ${formatIndianDate(ipo.close_date)}`
                              : 'Dates TBA'}
                          </div>
                          <div className="text-xs mt-0.5">
                            {ipo.status === 'ongoing' && daysRem.days !== null ? (
                              <span className="text-[#16A34A] font-medium">{daysRem.statusText}</span>
                            ) : ipo.status === 'listed' && ipo.listing_date ? (
                              <span className="text-[#4B5563]">Listed {formatIndianDate(ipo.listing_date)}</span>
                            ) : (
                              <span className="text-[#4B5563] capitalize">{ipo.status}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-3 text-right tabular-nums whitespace-nowrap text-[#111827] font-medium">
                          {ipo.price_band_min && ipo.price_band_max
                            ? `₹${ipo.price_band_min} – ₹${ipo.price_band_max}`
                            : ipo.price_band_max || ipo.issue_price
                            ? `₹${ipo.price_band_max || ipo.issue_price}`
                            : 'TBA'}
                        </td>

                        <td className="py-4 px-3 text-right tabular-nums whitespace-nowrap">
                          <div className="font-medium text-[#111827]">
                            {minApp ? `₹${minApp.toLocaleString('en-IN')}` : '—'}
                          </div>
                          {ipo.lot_size && (
                            <div className="text-xs text-[#4B5563]">{ipo.lot_size} shares</div>
                          )}
                        </td>

                        <td className="py-4 px-3 text-right tabular-nums whitespace-nowrap">
                          {ipo.latest_gmp ? (
                            <div>
                              <span
                                className={`font-medium ${
                                  ipo.latest_gmp.gmp_amount >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                                }`}
                              >
                                {ipo.latest_gmp.gmp_amount >= 0 ? '+' : ''}₹{ipo.latest_gmp.gmp_amount}
                              </span>
                              {gmpPct !== null && (
                                <div
                                  className={`text-xs ${
                                    gmpPct >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                                  }`}
                                >
                                  {gmpPct >= 0 ? '+' : ''}{gmpPct}%
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#6B7280]">—</span>
                          )}
                        </td>

                        <td className="py-4 px-3 text-right tabular-nums whitespace-nowrap">
                          {ipo.status === 'listed' && listingGainPct !== null ? (
                            <span
                              className={`font-semibold ${
                                listingGainPct >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                              }`}
                            >
                              {listingGainPct >= 0 ? '+' : ''}{listingGainPct}%
                            </span>
                          ) : ipo.latest_subscription ? (
                            <div>
                              <span className="font-semibold text-[#111827]">
                                {ipo.latest_subscription.total_multiple.toFixed(2)}x
                              </span>
                              {ipo.latest_subscription.day_number && (
                                <div className="text-xs text-[#4B5563]">
                                  Day {ipo.latest_subscription.day_number}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#6B7280]">Awaiting</span>
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
                              className="px-3.5 py-1.5 text-sm font-medium bg-white hover:bg-[#F3F4F6] text-[#111827] border border-[#E5E7EB] rounded-lg transition-colors"
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
                              className="px-3.5 py-1.5 text-sm font-medium bg-[#111827] hover:bg-[#1F2937] text-white rounded-lg transition-colors"
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

      {/* Focused Utility Strip */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#4B5563]">
              <CheckCircle2 className="w-4 h-4 text-[#111827]" />
              <span>Multi-PAN Allotment Vault</span>
            </div>
            <h2 className="text-lg font-semibold text-[#111827]">
              Check multiple family PANs in one click
            </h2>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Save PAN numbers locally in your browser so you never have to re-type them across KFinTech, Link Intime, or Bigshare on allotment day.
              {savedPanCount > 0 && (
                <span className="text-[#111827] font-medium ml-1">
                  ({savedPanCount} PAN{savedPanCount > 1 ? 's' : ''} currently saved)
                </span>
              )}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => onOpenAllotment?.(undefined)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#111827] hover:bg-[#1F2937] text-white rounded-lg transition-colors"
            >
              <span>Open Allotment Checker</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#4B5563]">
              <Calculator className="w-4 h-4 text-[#111827]" />
              <span>GMP &amp; Return Tools</span>
            </div>
            <h2 className="text-lg font-semibold text-[#111827]">
              Track grey market premiums &amp; listing returns
            </h2>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Monitor live GMP trends, estimate expected listing gains per lot, or check upcoming bidding windows on the IPO calendar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/ipo/gmp')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white hover:bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB] rounded-lg transition-colors"
            >
              <span>GMP &amp; Profit Estimator</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white hover:bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB] rounded-lg transition-colors"
            >
              <span>IPO Calendar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
