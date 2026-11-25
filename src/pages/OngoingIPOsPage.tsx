import React, { useState, useEffect } from 'react';
import { IPO, IPOCategory } from '../types/ipo';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { StatusIndicator } from '../components/StatusIndicator';
import { GMPDisplay } from '../components/GMPDisplay';
import { SubscriptionProgress } from '../components/SubscriptionProgress';
import {
  formatINR,
  formatCrores,
  calculateDaysRemaining,
  calculateMinApplication,
  formatIndianDate,
  formatIndianTimestamp,
  getValidDocUrl,
  SEBI_PUBLIC_ISSUES_URL,
} from '../lib/calculations';
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
        // Ongoing or recently closed
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
      <div className="space-y-2 border-b border-[#EAEAEA] pb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">
          Open IPOs &amp; Live Subscription
        </h1>
        <p className="text-base text-[#4B5563] max-w-2xl leading-relaxed">
          Issues currently open for bidding across NSE and BSE. Track category subscription multiples, grey market premiums, and key issue timelines.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by company, exchange or symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-sm bg-[#FAFAFA] border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-[#111827] transition-colors"
          />
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-[#111827] text-white font-medium'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter('Mainboard')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                categoryFilter === 'Mainboard'
                  ? 'bg-[#111827] text-white font-medium'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Mainboard
            </button>
            <button
              onClick={() => setCategoryFilter('SME')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                categoryFilter === 'SME'
                  ? 'bg-[#111827] text-white font-medium'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              SME
            </button>
          </div>

          <button
            onClick={() => setGmpOnly(!gmpOnly)}
            className={`px-3.5 py-2 text-sm rounded-lg border transition-colors ${
              gmpOnly
                ? 'bg-[#111827] text-white border-[#111827] font-medium'
                : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-[#FAFAFA] hover:text-[#111827]'
            }`}
          >
            GMP Available
          </button>
        </div>
      </div>

      {/* Active Issues Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
          <h2 className="text-lg font-semibold text-[#111827]">
            Open for Bidding ({activeBidding.length})
          </h2>
          <span className="text-xs text-[#4B5563]">NSE / BSE consolidated feed</span>
        </div>

        {loading ? (
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-10 text-center text-[#4B5563] text-sm">
            Loading open issues...
          </div>
        ) : activeBidding.length === 0 ? (
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-10 text-center text-[#4B5563] text-sm">
            No open IPOs match the selected filter criteria today.
          </div>
        ) : (
          <div className="space-y-4">
            {activeBidding.map((ipo) => {
              const daysRem = calculateDaysRemaining(ipo.close_date);
              const minApp = calculateMinApplication(ipo.price_band_max, ipo.lot_size);

              return (
                <div
                  key={ipo.id}
                  className="bg-white border border-[#EAEAEA] rounded-xl p-5 hover:border-[#D1D5DB] transition-colors space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <StatusIndicator
                          status={ipo.status}
                          category={ipo.category}
                        />
                        <span className="text-[#D1D5DB]" aria-hidden="true">·</span>
                        <span className="text-[#4B5563]">{ipo.exchange}</span>
                        {daysRem.days !== null && (
                          <>
                            <span className="text-[#D1D5DB]" aria-hidden="true">·</span>
                            <span className="text-[#16A34A] font-medium">
                              {daysRem.statusText}
                            </span>
                          </>
                        )}
                      </div>
                      <h3
                        onClick={() => navigate(`/ipo/${ipo.slug}`)}
                        className="text-lg font-semibold text-[#111827] hover:underline cursor-pointer"
                      >
                        {ipo.company?.name || ipo.slug}
                      </h3>
                      {ipo.company?.description && (
                        <p className="text-sm text-[#4B5563] line-clamp-1 max-w-2xl">
                          {ipo.company.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/ipo/${ipo.slug}`)}
                        className="px-3.5 py-2 bg-white hover:bg-[#FAFAFA] text-[#111827] border border-[#E5E7EB] font-medium text-sm rounded-lg transition-colors whitespace-nowrap"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isSignedIn && onRequireLogin) {
                            onRequireLogin(
                              `Login as an End User to apply for ${ipo.company?.name || ipo.slug}.`,
                              () => navigate(`/ipo/${ipo.slug}?apply=1`)
                            );
                            return;
                          }
                          navigate(`/ipo/${ipo.slug}?apply=1`);
                        }}
                        className="px-4 py-2 bg-[#111827] hover:bg-neutral-800 text-white font-medium text-sm rounded-lg transition-colors whitespace-nowrap"
                      >
                        Apply for IPO
                      </button>
                    </div>
                  </div>

                  {/* Financial Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-[#EAEAEA] text-sm tabular-nums">
                    <div>
                      <span className="text-[#4B5563] block text-xs">Price Band</span>
                      <span className="font-medium text-[#111827]">
                        {ipo.price_band_min && ipo.price_band_max
                          ? `₹${ipo.price_band_min} – ₹${ipo.price_band_max}`
                          : 'TBA'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#4B5563] block text-xs">Lot / Min Application</span>
                      <span className="font-medium text-[#111827]">
                        {ipo.lot_size ? `${ipo.lot_size} sh` : 'N/A'}{' '}
                        {minApp ? `(₹${minApp.toLocaleString('en-IN')})` : ''}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#4B5563] block text-xs">Total Issue Size</span>
                      <span className="font-medium text-[#111827]">
                        {formatCrores(ipo.issue_size)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#4B5563] block text-xs">Bidding Window</span>
                      <span className="font-medium text-[#111827]">
                        {formatIndianDate(ipo.open_date)} – {formatIndianDate(ipo.close_date)}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Analytics: Subscription Progress & GMP */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="p-4 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
                      <span className="text-xs font-medium text-[#4B5563] block mb-2">
                        Live Subscription Multiples
                      </span>
                      <SubscriptionProgress subscription={ipo.latest_subscription} />
                    </div>

                    <div className="p-4 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
                      <span className="text-xs font-medium text-[#4B5563] block mb-2">
                        Grey Market Premium (GMP)
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
        <div className="space-y-4 pt-6 border-t border-[#EAEAEA]">
          <div className="flex items-center justify-between pb-2 border-b border-[#EAEAEA]">
            <h2 className="text-lg font-semibold text-[#111827]">
              Recently Closed — Awaiting Allotment ({recentlyClosed.length})
            </h2>
            <span className="text-xs text-[#4B5563]">Basis of allotment pending</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentlyClosed.map((ipo) => (
              <div
                key={ipo.id}
                onClick={() => navigate(`/ipo/${ipo.slug}`)}
                className="bg-white border border-[#EAEAEA] rounded-xl p-4 hover:border-[#D1D5DB] transition-colors cursor-pointer space-y-2.5"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h4 className="font-semibold text-[#111827] text-base hover:underline">
                      {ipo.company?.name || ipo.slug}
                    </h4>
                    <div className="text-xs text-[#4B5563] mt-0.5">
                      {ipo.category} · Closed {formatIndianDate(ipo.close_date)}
                    </div>
                  </div>
                  <span className="text-xs text-[#4B5563] tabular-nums shrink-0">
                    Allotment: {formatIndianDate(ipo.allotment_date)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#EAEAEA] text-sm tabular-nums">
                  <span className="text-[#4B5563]">Final Multiple</span>
                  <span className="font-semibold text-[#111827]">
                    {ipo.latest_subscription ? `${ipo.latest_subscription.total_multiple.toFixed(2)}x` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
