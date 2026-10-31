import React, { useState, useEffect } from 'react';
import { IPO, IPOCategory } from '../types/ipo';
import { api } from '../lib/api';
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
import { Filter, Search, FileText, ExternalLink, Calendar, Info } from 'lucide-react';

interface OngoingIPOsPageProps {
  navigate: (route: string) => void;
  searchParam?: string;
}

export const OngoingIPOsPage: React.FC<OngoingIPOsPageProps> = ({
  navigate,
  searchParam = '',
}) => {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Ongoing IPOs & Live Bidding Status
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl">
          Track issues currently accepting bids across NSE and BSE, live subscription multiples (Retail, NII, QIB), indicative grey market premiums, and minimum lot investment thresholds.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by company, symbol or registrar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-slate-400 outline-none transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md border border-slate-200">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-white font-semibold text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter('Mainboard')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                categoryFilter === 'Mainboard'
                  ? 'bg-white font-semibold text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mainboard
            </button>
            <button
              onClick={() => setCategoryFilter('SME')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                categoryFilter === 'SME'
                  ? 'bg-white font-semibold text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SME
            </button>
          </div>

          <button
            onClick={() => setGmpOnly(!gmpOnly)}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              gmpOnly
                ? 'bg-slate-900 text-white border-slate-900 font-medium'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            GMP Available
          </button>
        </div>
      </div>

      {/* SEBI Public Issues Official Repository Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-blue-950">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Official Prospectuses:</strong> All active offer documents (RHP & DRHP) are archived on the official Securities and Exchange Board of India (SEBI) portal.
          </span>
        </div>
        <a
          href={SEBI_PUBLIC_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium text-xs shadow-xs transition-colors whitespace-nowrap shrink-0"
        >
          <span>SEBI Public Issues Repository</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Active Issues Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-base font-bold text-slate-900">
            Active Issues Open for Subscription ({activeBidding.length})
          </h2>
          <span className="text-xs text-slate-500">Real-time status updated as per exchange disclosures</span>
        </div>

        {activeBidding.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-500 text-xs">
            No open IPOs match the selected filter criteria.
          </div>
        ) : (
          <div className="space-y-4">
            {activeBidding.map((ipo) => {
              const daysRem = calculateDaysRemaining(ipo.close_date);
              const minApp = calculateMinApplication(ipo.price_band_max, ipo.lot_size);

              return (
                <div
                  key={ipo.id}
                  className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusIndicator
                          status={ipo.status}
                          category={ipo.category}
                        />
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="text-xs text-slate-500 font-medium">{ipo.exchange}</span>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {daysRem.statusText}
                        </span>
                      </div>
                      <h3
                        onClick={() => navigate(`/ipo/${ipo.slug}`)}
                        className="text-lg font-bold text-slate-900 hover:text-slate-700 cursor-pointer"
                      >
                        {ipo.company?.name || ipo.slug}
                      </h3>
                      {ipo.company?.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl">
                          {ipo.company.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => navigate(`/ipo/${ipo.slug}`)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-md transition-colors whitespace-nowrap self-start lg:self-center"
                    >
                      View Issue Details
                    </button>
                  </div>

                  {/* Financial Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-100 text-xs font-mono tabular-nums">
                    <div>
                      <span className="text-slate-400 font-sans block text-[11px]">Price Band</span>
                      <span className="font-semibold text-slate-900">
                        {ipo.price_band_min && ipo.price_band_max
                          ? `₹${ipo.price_band_min} - ₹${ipo.price_band_max}`
                          : 'TBA'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-sans block text-[11px]">Lot Size / Min Investment</span>
                      <span className="font-semibold text-slate-900">
                        {ipo.lot_size ? `${ipo.lot_size} shares` : 'N/A'}{' '}
                        {minApp ? `(₹${minApp.toLocaleString('en-IN')})` : ''}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-sans block text-[11px]">Total Issue Size</span>
                      <span className="font-semibold text-slate-900">
                        {formatCrores(ipo.issue_size)}
                      </span>
                      {ipo.fresh_issue_size !== undefined && (
                        <span className="text-[10px] text-slate-500 font-sans block">
                          Fresh: {formatCrores(ipo.fresh_issue_size)}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 font-sans block text-[11px]">Closing Date</span>
                      <span className="font-sans font-semibold text-slate-900">
                        {formatIndianDate(ipo.close_date)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans block">
                        Allotment: {formatIndianDate(ipo.allotment_date)}
                      </span>
                    </div>
                  </div>

                  {/* Dual Intelligence Row: Subscriptions vs GMP */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3.5 rounded border border-slate-100">
                      <SubscriptionProgress subscription={ipo.latest_subscription} />
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded border border-slate-100 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-700 mb-1">
                          Latest Grey Market Premium (GMP)
                        </div>
                        <GMPDisplay
                          latestGmp={ipo.latest_gmp}
                          previousGmp={ipo.previous_gmp}
                          basePrice={ipo.price_band_max}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Registrar and Official Document Links */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">Registrar:</span>
                      {ipo.registrar_url ? (
                        <a
                          href={ipo.registrar_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-900 hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>{ipo.registrar_name || 'View Registrar'}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      ) : (
                        <span>{ipo.registrar_name || 'TBA'}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <a
                        href={getValidDocUrl(ipo.rhp_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium hover:underline text-xs"
                        title="View Red Herring Prospectus on official SEBI portal"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-700" />
                        <span>RHP (SEBI Filing)</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <a
                        href={getValidDocUrl(ipo.drhp_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:underline text-xs"
                        title="View Draft Red Herring Prospectus on official SEBI portal"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>DRHP (SEBI Filing)</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Closed Section (Section 6) */}
      {recentlyClosed.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Recently Closed IPOs (Awaiting Allotment & Listing)
            </h2>
            <span className="text-xs text-slate-500">Subscription finalized</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Closing Date</th>
                    <th className="py-3 px-4 text-right">Price Band</th>
                    <th className="py-3 px-4 text-right">Total Subscribed</th>
                    <th className="py-3 px-4 text-right">Latest GMP</th>
                    <th className="py-3 px-4">Expected Listing</th>
                    <th className="py-3 px-4">Offer Documents</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {recentlyClosed.map((ipo) => (
                    <tr key={ipo.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                        {ipo.company?.name || ipo.slug}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">{ipo.category}</td>
                      <td className="py-3 px-4 text-slate-600">{formatIndianDate(ipo.close_date)}</td>
                      <td className="py-3 px-4 text-right text-slate-900">
                        {ipo.price_band_min && ipo.price_band_max
                          ? `₹${ipo.price_band_min} - ₹${ipo.price_band_max}`
                          : 'TBA'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {ipo.latest_subscription
                          ? `${ipo.latest_subscription.total_multiple.toFixed(2)}x`
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <GMPDisplay latestGmp={ipo.latest_gmp} basePrice={ipo.price_band_max} compact />
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">
                        {formatIndianDate(ipo.listing_date)}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <a
                            href={getValidDocUrl(ipo.rhp_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                            title="RHP Filing"
                          >
                            <span>RHP</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                          <span className="text-slate-300">·</span>
                          <a
                            href={getValidDocUrl(ipo.drhp_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[11px] text-slate-600 hover:text-slate-900 hover:underline"
                            title="DRHP Filing"
                          >
                            <span>DRHP</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <button
                          onClick={() => navigate(`/ipo/${ipo.slug}`)}
                          className="text-slate-600 hover:text-slate-900 font-medium underline"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
