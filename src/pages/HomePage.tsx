import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  Flame,
  Search,
} from 'lucide-react';
import { IPO, MarketSummary, IPOCategory } from '../types/ipo';
import { api } from '../lib/api';
import { StatusIndicator } from '../components/StatusIndicator';
import { GMPDisplay } from '../components/GMPDisplay';
import { SubscriptionProgress } from '../components/SubscriptionProgress';
import { AllotmentCheckerModal } from '../components/AllotmentCheckerModal';
import {
  formatINR,
  formatCrores,
  calculateDaysRemaining,
  calculateMinApplication,
  calculateListingGain,
  calculateListingGainPercentage,
  calculateIndicativeListingPrice,
  calculateIndicativeGainPercentage,
  formatIndianDate,
  formatIndianTimestamp,
  getValidDocUrl,
  SEBI_PUBLIC_ISSUES_URL,
} from '../lib/calculations';

interface HomePageProps {
  navigate: (route: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<IPOCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [allotmentModalOpen, setAllotmentModalOpen] = useState(false);
  const [allotmentModalSlug, setAllotmentModalSlug] = useState<string | undefined>();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [sumData, allIpos] = await Promise.all([
          api.getMarketSummary(),
          api.getAllIPOs(),
        ]);
        setSummary(sumData);
        setIPOs(allIpos);
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredIPOs = ipos.filter((ipo) => {
    if (categoryFilter === 'all') return true;
    return ipo.category === categoryFilter;
  });

  const ongoingIPOs = filteredIPOs.filter((i) => i.status === 'ongoing');
  const upcomingIPOs = filteredIPOs.filter((i) => i.status === 'upcoming').slice(0, 4);
  const listedIPOs = filteredIPOs.filter((i) => i.status === 'listed').slice(0, 5);

  return (
    <div className="space-y-12 pb-12">
      {/* Hero & Market Headline */}
      <section className="bg-white border-b border-slate-200 pt-8 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Capital Markets Dashboard
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-balance">
                Real-Time Indian IPO Intelligence, GMP Tracking & Listing Analysis
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Discover, compare, and monitor Mainboard and SME public issues on NSE and BSE. Track verified subscription multiples, grey market quotes, and historical listing outcomes.
              </p>
            </div>

            {/* Freshness Badge & Segmented Filter Control */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  setAllotmentModalSlug(undefined);
                  setAllotmentModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Check Allotment</span>
              </button>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    categoryFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Issues
                </button>
                <button
                  onClick={() => setCategoryFilter('Mainboard')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    categoryFilter === 'Mainboard'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mainboard
                </button>
                <button
                  onClick={() => setCategoryFilter('SME')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    categoryFilter === 'SME'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  SME Emerge
                </button>
              </div>
            </div>
          </div>

          {/* Database-Derived Summary Cards (Section 5) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-8">
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
              <span className="text-xs text-slate-500 font-medium block">Open for Bidding</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                {summary?.open_ipos_count ?? 0}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
                Live Subscriptions Active
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
              <span className="text-xs text-slate-500 font-medium block">Upcoming Pipeline</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                {summary?.upcoming_ipos_count ?? 0}
              </span>
              <span className="text-[11px] text-sky-700 font-medium block mt-0.5">
                Dates Confirmed / Awaiting
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
              <span className="text-xs text-slate-500 font-medium block">Recently Listed</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                {summary?.recently_listed_count ?? 0}
              </span>
              <span className="text-[11px] text-slate-600 font-medium block mt-0.5">
                Historical Database
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
              <span className="text-xs text-slate-500 font-medium block">Mainboard Issues</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                {summary?.mainboard_count ?? 0}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">NSE & BSE Primary</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500 font-medium block">SME Offerings</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                {summary?.sme_count ?? 0}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">NSE Emerge / BSE SME</span>
            </div>
          </div>

          {/* Sync Timestamp Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Last Successful Sync:{' '}
                {summary?.last_sync_timestamp
                  ? formatIndianTimestamp(summary.last_sync_timestamp)
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Data Sources: Official NSE/BSE Feeds & SEBI Filings</span>
              <span className="text-slate-300">·</span>
              <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-200">
                Sample Development Data Labeled
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Spotlight Banner: Live Historic Mega-IPO (Jio Platforms) */}
        {ipos.find((i) => i.slug === 'jio-platforms-ipo' && i.status === 'ongoing') && (
          <div
            onClick={() => navigate('/ipo/jio-platforms-ipo')}
            className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 sm:p-7 text-white shadow-md border border-blue-700/50 cursor-pointer hover:border-blue-400 transition-all group"
          >
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    LIVE NOW · DAY 2 OF 3
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                    Mainboard (BSE & NSE)
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    India's Historic ₹30,213 Cr Mega-Issue
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white group-hover:text-blue-200 transition-colors">
                  Jio Platforms Limited IPO (Reliance Jio)
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Reliance Industries flagship digital & 5G telecom ecosystem is live for public subscription. High QIB and retail participation driving over 4.35x subscription on Day 2.
                </p>
              </div>

              {/* Live Metric Strip */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 shrink-0 bg-white/10 backdrop-blur-xs p-3.5 rounded-lg border border-white/10">
                <div className="px-2">
                  <span className="text-[11px] text-slate-300 block">Price Band</span>
                  <span className="font-mono text-base font-bold text-white">₹1,065 - ₹1,119</span>
                </div>
                <div className="w-px h-8 bg-white/20 hidden sm:block"></div>
                <div className="px-2">
                  <span className="text-[11px] text-slate-300 block">Day 2 Bidding</span>
                  <span className="font-mono text-base font-bold text-emerald-400">4.35x Subscribed</span>
                </div>
                <div className="w-px h-8 bg-white/20 hidden sm:block"></div>
                <div className="px-2">
                  <span className="text-[11px] text-slate-300 block">Grey Market (GMP)</span>
                  <span className="font-mono text-base font-bold text-amber-300">₹246 (+22.0%)</span>
                </div>
                <div className="pl-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3.5 py-2 rounded-md transition-colors shadow-xs">
                    View Live Tracker <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IPO Premium Live GMP & Kostak Table */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  IPO PREMIUM TRACKER
                </span>
                <span className="text-xs text-slate-500 font-medium">Real-Time Quotes</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                Live IPO Grey Market Premium (GMP), Kostak & Subject to Sauda
              </h2>
              <p className="text-xs text-slate-500">
                Dealer circle rates, estimated listing prices, and verified subscription multiples for active offerings
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setAllotmentModalSlug(undefined);
                  setAllotmentModalOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Allotment Checker</span>
              </button>
              <button
                onClick={() => navigate('/ipo/gmp')}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>Full GMP Board</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">IPO Name</th>
                  <th className="py-2.5 px-3 text-right">Price Band</th>
                  <th className="py-2.5 px-3 text-right">GMP (₹)</th>
                  <th className="py-2.5 px-3 text-right">Kostak</th>
                  <th className="py-2.5 px-3 text-right">Sauda (SS)</th>
                  <th className="py-2.5 px-2 text-center">Fire</th>
                  <th className="py-2.5 px-3 text-right">Est. Listing</th>
                  <th className="py-2.5 px-3 text-right">Est. Gain (%)</th>
                  <th className="py-2.5 px-3 text-center">Subscribed</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {ipos
                  .filter((i) => i.latest_gmp)
                  .slice(0, 8)
                  .map((ipo) => {
                    const gmp = ipo.latest_gmp!;
                    const basePrice = ipo.issue_price || ipo.price_band_max;
                    const { price: estPrice } = calculateIndicativeListingPrice(
                      basePrice,
                      gmp.gmp_amount
                    );
                    const gainPct = calculateIndicativeGainPercentage(basePrice, gmp.gmp_amount);
                    const isLive = ipo.status === 'ongoing';

                    return (
                      <tr
                        key={ipo.id}
                        onClick={() => navigate(`/ipo/${ipo.slug}`)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-3 font-sans">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
                              {ipo.company?.name || ipo.slug}
                            </span>
                            {isLive && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">
                                LIVE
                              </span>
                            )}
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                              {ipo.category}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 font-medium">
                          {ipo.price_band_min && ipo.price_band_max
                            ? `₹${ipo.price_band_min} - ₹${ipo.price_band_max}`
                            : basePrice
                            ? `₹${basePrice}`
                            : 'TBA'}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            ₹{gmp.gmp_amount}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-amber-900">
                          {gmp.kostak_rate ? `₹${gmp.kostak_rate}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-indigo-900">
                          {gmp.subject_to_sauda_rate ? `₹${gmp.subject_to_sauda_rate}` : '—'}
                        </td>
                        <td className="py-3 px-2 text-center text-xs">
                          {gmp.fire_rating ? '🔥'.repeat(gmp.fire_rating) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {estPrice ? `₹${estPrice}` : 'N/A'}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-bold text-xs ${
                            gainPct && gainPct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {gainPct !== null ? `${gainPct >= 0 ? '+' : ''}${gainPct}%` : 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {ipo.latest_subscription ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                ipo.latest_subscription.total_multiple >= 10
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : ipo.latest_subscription.total_multiple >= 2
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {ipo.latest_subscription.total_multiple}x
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-sans">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAllotmentModalSlug(ipo.slug);
                                setAllotmentModalOpen(true);
                              }}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                            >
                              Allotment
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/ipo/${ipo.slug}`);
                              }}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 1: ONGOING IPOS (CURRENTLY OPEN) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Ongoing IPOs (Open for Bidding)
              </h2>
              <p className="text-xs text-slate-500">
                Active issues accepting applications on stock exchanges
              </p>
            </div>
            <button
              onClick={() => navigate('/ipo/ongoing')}
              className="text-xs font-semibold text-slate-900 hover:text-slate-600 flex items-center gap-1"
            >
              <span>View All Ongoing</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {ongoingIPOs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-xs">
              No active IPOs open for subscription in the selected category.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ongoingIPOs.map((ipo) => {
                const daysRem = calculateDaysRemaining(ipo.close_date);
                const minApp = calculateMinApplication(ipo.price_band_max, ipo.lot_size);

                return (
                  <div
                    key={ipo.id}
                    onClick={() => navigate(`/ipo/${ipo.slug}`)}
                    className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <StatusIndicator
                            status={ipo.status}
                            category={ipo.category}
                          />
                          <h3 className="text-base font-bold text-slate-900 hover:text-slate-700 transition-colors mt-1">
                            {ipo.company?.name || ipo.slug}
                          </h3>
                        </div>
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">
                          {daysRem.statusText}
                        </span>
                      </div>

                      {/* Financial Quick Specs */}
                      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 text-slate-600">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Price Band</span>
                          <span className="font-mono tabular-nums font-semibold text-slate-900">
                            {ipo.price_band_min && ipo.price_band_max
                              ? `₹${ipo.price_band_min} - ₹${ipo.price_band_max}`
                              : 'TBA'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Issue Size</span>
                          <span className="font-mono tabular-nums font-semibold text-slate-900">
                            {formatCrores(ipo.issue_size)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Lot Size / Min App.</span>
                          <span className="font-mono tabular-nums text-slate-900">
                            {ipo.lot_size ? `${ipo.lot_size} shares` : 'N/A'}{' '}
                            {minApp ? `(₹${minApp.toLocaleString('en-IN')})` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Closes On</span>
                          <span className="font-medium text-slate-900">
                            {formatIndianDate(ipo.close_date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Subscription Status */}
                    <div className="bg-slate-50 p-3 rounded border border-slate-100">
                      <SubscriptionProgress
                        subscription={ipo.latest_subscription}
                        compact
                      />
                    </div>

                    {/* GMP Quick Scanner */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-slate-500">Grey Market Premium:</span>
                      <GMPDisplay
                        latestGmp={ipo.latest_gmp}
                        previousGmp={ipo.previous_gmp}
                        basePrice={ipo.price_band_max}
                        compact
                      />
                    </div>

                    {/* Official Offer Documents (SEBI Filings) */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                      <span className="text-[11px]">SEBI Filings:</span>
                      <div className="flex items-center gap-2">
                        <a
                          href={getValidDocUrl(ipo.rhp_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                          title="Red Herring Prospectus on official SEBI portal"
                        >
                          <span>RHP</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                        <span className="text-slate-300">·</span>
                        <a
                          href={getValidDocUrl(ipo.drhp_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-0.5 text-[11px] text-slate-600 hover:text-slate-900 hover:underline"
                          title="Draft Red Herring Prospectus on official SEBI portal"
                        >
                          <span>DRHP</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: TOP LISTING GAINERS & PERFORMANCE */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Historical Listing Performance (Actual Listing Gains)
              </h2>
              <p className="text-xs text-slate-500">
                Calculated strictly as: (Actual Listing Price − Issue Price)
              </p>
            </div>
            <button
              onClick={() => navigate('/ipo/listed')}
              className="text-xs font-semibold text-slate-900 hover:text-slate-600 flex items-center gap-1"
            >
              <span>Explore All Historical Listings</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Listing Date</th>
                    <th className="py-3 px-4 text-right">Issue Price</th>
                    <th className="py-3 px-4 text-right">Listing Price</th>
                    <th className="py-3 px-4 text-right">Listing Gain (₹)</th>
                    <th className="py-3 px-4 text-right">Listing Return</th>
                    <th className="py-3 px-4 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {listedIPOs.map((ipo) => {
                    const result = ipo.listing_result;
                    if (!result) return null;
                    const gainInRupees = calculateListingGain(
                      result.issue_price,
                      result.listing_price
                    );
                    const gainPercentage = calculateListingGainPercentage(
                      result.issue_price,
                      result.listing_price
                    );

                    return (
                      <tr key={ipo.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                          {ipo.company?.name || ipo.slug}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-600">
                          {ipo.category} ({ipo.exchange})
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {formatIndianDate(result.listing_date)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-900">
                          ₹{result.issue_price}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          ₹{result.listing_price}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-semibold ${
                            gainInRupees >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {gainInRupees >= 0 ? `+₹${gainInRupees}` : `-₹${Math.abs(gainInRupees)}`}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${
                            gainPercentage >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {gainPercentage >= 0 ? `+${gainPercentage}%` : `${gainPercentage}%`}
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          <button
                            onClick={() => navigate(`/ipo/${ipo.slug}`)}
                            className="text-slate-600 hover:text-slate-900 font-medium underline underline-offset-2"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 3: UPCOMING ISSUES PIPELINE */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Upcoming IPO Pipeline
              </h2>
              <p className="text-xs text-slate-500">
                Confirmed schedules and expected offerings with filed draft documents
              </p>
            </div>
            <button
              onClick={() => navigate('/ipo/upcoming')}
              className="text-xs font-semibold text-slate-900 hover:text-slate-600 flex items-center gap-1"
            >
              <span>View Full Pipeline</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingIPOs.map((ipo) => (
              <div
                key={ipo.id}
                onClick={() => navigate(`/ipo/${ipo.slug}`)}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div>
                  <StatusIndicator
                    status={ipo.status}
                    announcementStatus={ipo.announcement_status}
                    category={ipo.category}
                  />
                  <h3 className="font-bold text-slate-900 text-sm mt-1 line-clamp-1">
                    {ipo.company?.name || ipo.slug}
                  </h3>
                  <div className="text-xs text-slate-500 mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Expected Open:</span>
                      <span className="font-medium text-slate-800">
                        {formatIndianDate(ipo.open_date)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price Band:</span>
                      <span className="font-mono tabular-nums text-slate-800">
                        {ipo.price_band_min && ipo.price_band_max
                          ? `₹${ipo.price_band_min} - ₹${ipo.price_band_max}`
                          : 'Not Announced'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. Issue Size:</span>
                      <span className="font-mono tabular-nums text-slate-800">
                        {formatCrores(ipo.issue_size)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">GMP Whisper:</span>
                    <GMPDisplay
                      latestGmp={ipo.latest_gmp}
                      basePrice={ipo.price_band_max}
                      compact
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                    <span>SEBI Filings:</span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={getValidDocUrl(ipo.rhp_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-700 hover:text-blue-900 font-semibold hover:underline flex items-center gap-0.5"
                        title="Red Herring Prospectus on official SEBI portal"
                      >
                        <span>RHP</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                      <span className="text-slate-300">·</span>
                      <a
                        href={getValidDocUrl(ipo.drhp_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-0.5"
                        title="Draft Red Herring Prospectus on official SEBI portal"
                      >
                        <span>DRHP</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Auto Allotment Checker Modal */}
      <AllotmentCheckerModal
        isOpen={allotmentModalOpen}
        onClose={() => setAllotmentModalOpen(false)}
        ipos={ipos}
        preselectedSlug={allotmentModalSlug}
      />
    </div>
  );
};
