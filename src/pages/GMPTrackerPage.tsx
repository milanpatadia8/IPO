import React, { useState, useEffect } from 'react';
import { IPO, IPOCategory } from '../types/ipo';
import { api } from '../lib/api';
import { GMPDisplay } from '../components/GMPDisplay';
import { GMPTrendChart } from '../components/GMPTrendChart';
import { AllotmentCheckerModal } from '../components/AllotmentCheckerModal';
import {
  formatINR,
  calculateIndicativeListingPrice,
  calculateIndicativeGainPercentage,
  isObservationStale,
  formatIndianTimestamp,
  formatIndianDate,
} from '../lib/calculations';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  ShieldAlert,
  Search,
  Flame,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface GMPTrackerPageProps {
  navigate: (route: string) => void;
}

export const GMPTrackerPage: React.FC<GMPTrackerPageProps> = ({ navigate }) => {
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [selectedIpo, setSelectedIpo] = useState<IPO | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'Mainboard' | 'SME' | 'live' | 'hot'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [allotmentModalOpen, setAllotmentModalOpen] = useState(false);
  const [allotmentModalSlug, setAllotmentModalSlug] = useState<string | undefined>();
  const [showExplainer, setShowExplainer] = useState(false);

  useEffect(() => {
    async function loadGmp() {
      setLoading(true);
      try {
        const all = await api.getAllIPOs();
        const withGmp = all.filter((i) => i.latest_gmp);
        setIPOs(withGmp);
        if (withGmp.length > 0) {
          // Default select Jio Platforms or first ongoing IPO
          const jio = withGmp.find((i) => i.slug === 'jio-platforms-ipo');
          const ongoing = withGmp.find((i) => i.status === 'ongoing');
          setSelectedIpo(jio || ongoing || withGmp[0]);
        }
      } catch (err) {
        console.error('Failed to load GMP data', err);
      } finally {
        setLoading(false);
      }
    }
    loadGmp();
  }, []);

  const filtered = ipos.filter((ipo) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = ipo.company?.name?.toLowerCase() || '';
      const slug = ipo.slug.toLowerCase();
      if (!name.includes(q) && !slug.includes(q)) return false;
    }

    // Filter Type
    if (filterType === 'Mainboard') return ipo.category === 'Mainboard';
    if (filterType === 'SME') return ipo.category === 'SME';
    if (filterType === 'live') return ipo.status === 'ongoing';
    if (filterType === 'hot') {
      const fire = ipo.latest_gmp?.fire_rating || 0;
      return fire >= 4;
    }
    return true;
  });

  const handleOpenAllotment = (slug?: string) => {
    setAllotmentModalSlug(slug);
    setAllotmentModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              IPO Premium Real-Time Tracker
            </span>
            <span className="text-xs text-slate-500 font-medium">Oct 2026 Live Market</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            IPO GMP Today Live, Kostak & Subject to Sauda
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl">
            Live dealer quotations, Kostak rates, Subject to Sauda (SS), and indicative listing gain percentages for active Mainboard and SME public offerings.
          </p>
        </div>

        {/* Action Button: Auto Allotment Checker */}
        <div className="shrink-0">
          <button
            onClick={() => handleOpenAllotment()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Check Allotment Status</span>
          </button>
        </div>
      </div>

      {/* Statutory Speculative Risk Warning (Section 9) */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            <span>Grey Market Premium (GMP) & Kostak Statutory Notice</span>
          </div>
          <button
            onClick={() => setShowExplainer(!showExplainer)}
            className="text-[11px] font-semibold text-amber-900 underline hover:text-amber-950 flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showExplainer ? 'Hide Guide' : 'What is Kostak & Sauda?'}</span>
          </button>
        </div>
        <p className="leading-relaxed text-[11px] sm:text-xs">
          Grey Market Premium (GMP), Kostak, and Subject to Sauda (SS) are strictly unofficial, unregulated over-the-counter estimations in dealer circles. They do not constitute an exchange-guaranteed listing price. Indicative prices are arithmetic projections (<code className="font-mono bg-amber-100/70 px-1 py-0.5 rounded">Issue Price + GMP</code>).
        </p>
      </div>

      {/* Explainer Accordion: Kostak vs Subject to Sauda */}
      {showExplainer && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-in fade-in duration-200">
          <div className="p-3 bg-slate-50 rounded border border-slate-100 space-y-1">
            <span className="font-bold text-slate-900 block flex items-center gap-1">
              <span>📈 Grey Market Premium (GMP)</span>
            </span>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              The extra premium per share at which an IPO is traded in unofficial dealer circles before exchange listing. A GMP of ₹246 on a ₹1,119 issue signals an estimated debut at ~₹1,365 (+22.0%).
            </p>
          </div>
          <div className="p-3 bg-amber-50/60 rounded border border-amber-100 space-y-1">
            <span className="font-bold text-amber-950 block flex items-center gap-1">
              <span>📝 Kostak Rate</span>
            </span>
            <p className="text-amber-900 leading-relaxed text-[11px]">
              Fixed upfront cash paid to an IPO applicant for their complete retail application, irrespective of whether shares are allotted. You keep the Kostak profit even if allotment is zero.
            </p>
          </div>
          <div className="p-3 bg-indigo-50/60 rounded border border-indigo-100 space-y-1">
            <span className="font-bold text-indigo-950 block flex items-center gap-1">
              <span>🤝 Subject to Sauda (SS / STS)</span>
            </span>
            <p className="text-indigo-900 leading-relaxed text-[11px]">
              A contingent transaction where the buyer only pays the agreed premium if the applicant actually receives share allotment. If no allotment occurs, the deal is automatically void.
            </p>
          </div>
        </div>
      )}

      {/* Selected IPO Historical Trend Highlight */}
      {selectedIpo && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Historical GMP Trajectory
                </span>
                {selectedIpo.status === 'ongoing' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                    LIVE BIDDING
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {selectedIpo.company?.name || selectedIpo.slug}
              </h2>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                <span>{selectedIpo.category}</span>
                <span aria-hidden="true">·</span>
                <span>Closes: {formatIndianDate(selectedIpo.close_date)}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Price Band: ₹{selectedIpo.price_band_min || selectedIpo.issue_price} - ₹
                  {selectedIpo.price_band_max || selectedIpo.issue_price}
                </span>
                {selectedIpo.lot_size && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Lot: {selectedIpo.lot_size} Shares</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => handleOpenAllotment(selectedIpo.slug)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded transition-colors"
              >
                Check Allotment
              </button>
              <button
                onClick={() => navigate(`/ipo/${selectedIpo.slug}`)}
                className="text-xs font-semibold text-slate-900 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition-colors"
              >
                Full Prospectus →
              </button>
            </div>
          </div>

          <GMPTrendChart
            history={selectedIpo.gmp_history}
            basePrice={selectedIpo.issue_price || selectedIpo.price_band_max}
          />
        </div>
      )}

      {/* Filter and Search Bar Controls (ipopremium.in convention) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-white font-bold text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            All Active GMP
          </button>
          <button
            onClick={() => setFilterType('live')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
              filterType === 'live'
                ? 'bg-white font-bold text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Live Bidding ({ipos.filter((i) => i.status === 'ongoing').length})
          </button>
          <button
            onClick={() => setFilterType('Mainboard')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
              filterType === 'Mainboard'
                ? 'bg-white font-bold text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Mainboard
          </button>
          <button
            onClick={() => setFilterType('SME')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
              filterType === 'SME'
                ? 'bg-white font-bold text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            SME Emerge
          </button>
          <button
            onClick={() => setFilterType('hot')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
              filterType === 'hot'
                ? 'bg-white font-bold text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            <span>High Fire (🔥 4+)</span>
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search IPO name (e.g. Jio, Tonbo)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* IPO Premium Live GMP Comprehensive Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold text-[11px] tracking-wider uppercase">
              <tr>
                <th className="py-3 px-4">IPO Company</th>
                <th className="py-3 px-3 text-center">Dates & Lot</th>
                <th className="py-3 px-3 text-right">Price Band</th>
                <th className="py-3 px-3 text-right">GMP (₹)</th>
                <th className="py-3 px-3 text-right">Kostak (₹)</th>
                <th className="py-3 px-3 text-right">Sauda (SS)</th>
                <th className="py-3 px-2 text-center">Fire</th>
                <th className="py-3 px-3 text-right">Est. Listing Price</th>
                <th className="py-3 px-3 text-right">Est. Gain (%)</th>
                <th className="py-3 px-3 text-center">Live Sub</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-sans">
                    No active IPO GMP quotes matching your current search or category filter.
                  </td>
                </tr>
              ) : (
                filtered.map((ipo) => {
                  const gmp = ipo.latest_gmp;
                  if (!gmp) return null;
                  const basePrice = ipo.issue_price || ipo.price_band_max;
                  const { price: estPrice } = calculateIndicativeListingPrice(
                    basePrice,
                    gmp.gmp_amount
                  );
                  const gainPct = calculateIndicativeGainPercentage(basePrice, gmp.gmp_amount);
                  const isSelected = selectedIpo?.id === ipo.id;
                  const isLive = ipo.status === 'ongoing';

                  return (
                    <tr
                      key={ipo.id}
                      onClick={() => setSelectedIpo(ipo)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/60 font-medium' : ''
                      }`}
                    >
                      {/* Company Name & Badges */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
                              {ipo.company?.name || ipo.slug}
                            </span>
                            {isLive && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">
                                LIVE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                              {ipo.category}
                            </span>
                            <span>{ipo.exchange}</span>
                          </div>
                        </div>
                      </td>

                      {/* Dates & Lot */}
                      <td className="py-3.5 px-3 text-center font-sans text-[11px] text-slate-600">
                        <div>
                          {ipo.open_date && ipo.close_date ? (
                            <span>
                              {formatIndianDate(ipo.open_date).split(',')[0]} -{' '}
                              {formatIndianDate(ipo.close_date).split(',')[0]}
                            </span>
                          ) : (
                            'Dates TBA'
                          )}
                        </div>
                        <span className="text-slate-400 font-mono text-[10px]">
                          Lot: {ipo.lot_size ? `${ipo.lot_size} sh` : 'TBA'}
                        </span>
                      </td>

                      {/* Price Band */}
                      <td className="py-3.5 px-3 text-right text-slate-900 font-semibold">
                        {ipo.price_band_min && ipo.price_band_max
                          ? `₹${ipo.price_band_min} - ₹${ipo.price_band_max}`
                          : basePrice
                          ? `₹${basePrice}`
                          : 'TBA'}
                      </td>

                      {/* Latest GMP */}
                      <td className="py-3.5 px-3 text-right font-extrabold text-slate-900">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          ₹{gmp.gmp_amount}
                        </span>
                      </td>

                      {/* Kostak */}
                      <td className="py-3.5 px-3 text-right font-medium text-amber-900">
                        {gmp.kostak_rate ? `₹${gmp.kostak_rate}` : '—'}
                      </td>

                      {/* Subject to Sauda (SS) */}
                      <td className="py-3.5 px-3 text-right font-medium text-indigo-900">
                        {gmp.subject_to_sauda_rate ? `₹${gmp.subject_to_sauda_rate}` : '—'}
                      </td>

                      {/* Fire / Demand Rating */}
                      <td className="py-3.5 px-2 text-center text-xs">
                        {gmp.fire_rating ? (
                          <span title={`${gmp.fire_rating}/5 Demand Rating`}>
                            {'🔥'.repeat(gmp.fire_rating)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Indicative Est. Listing Price */}
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                        {estPrice ? `₹${estPrice}` : 'N/A'}
                      </td>

                      {/* Est. Listing Gain (%) */}
                      <td
                        className={`py-3.5 px-3 text-right font-bold text-xs ${
                          gainPct && gainPct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {gainPct !== null ? `${gainPct >= 0 ? '+' : ''}${gainPct}%` : 'N/A'}
                      </td>

                      {/* Live Subscription */}
                      <td className="py-3.5 px-3 text-center">
                        {ipo.latest_subscription ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
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

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAllotment(ipo.slug);
                            }}
                            className="px-2 py-1 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                          >
                            Allotment
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/ipo/${ipo.slug}`);
                            }}
                            className="px-2 py-1 text-[10px] font-semibold bg-slate-100 text-slate-800 rounded hover:bg-slate-200 transition-colors"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
