import React, { useState, useEffect } from 'react';
import { IPO, IPOCategory } from '../types/ipo';
import { api } from '../lib/api';
import { GMPDisplay } from '../components/GMPDisplay';
import { GMPTrendChart } from '../components/GMPTrendChart';
import { AllotmentCheckerModal } from '../components/AllotmentCheckerModal';
import { IPOProfitCalculator } from '../components/IPOProfitCalculator';
import {
  formatINR,
  calculateIndicativeListingPrice,
  calculateIndicativeGainPercentage,
  isObservationStale,
  formatIndianTimestamp,
  formatIndianDate,
} from '../lib/calculations';
import {
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = ipo.company?.name?.toLowerCase() || '';
      const slug = ipo.slug.toLowerCase();
      if (!name.includes(q) && !slug.includes(q)) return false;
    }
    if (filterType === 'Mainboard') return ipo.category === 'Mainboard';
    if (filterType === 'SME') return ipo.category === 'SME';
    if (filterType === 'live') return ipo.status === 'ongoing';
    if (filterType === 'hot') return (ipo.latest_gmp?.fire_rating || 0) >= 4;
    return true;
  });

  const handleOpenAllotment = (slug: string) => {
    setAllotmentModalSlug(slug);
    setAllotmentModalOpen(true);
  };

  const getDemandLabel = (rating?: number) => {
    if (!rating) return '—';
    if (rating >= 5) return 'Super Hot';
    if (rating === 4) return 'Strong';
    if (rating === 3) return 'Moderate';
    if (rating === 2) return 'Mild';
    return 'Subdued';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2 border-b border-[#EAEAEA] pb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">
          Live Grey Market Premium (GMP)
        </h1>
        <p className="text-base text-[#4B5563] max-w-2xl leading-relaxed">
          Consolidated unofficial dealer quotations, Kostak rates, Subject to Sauda (SS), and indicative listing price estimates.
        </p>
      </div>

      {/* Statutory Notice */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 text-sm text-[#4B5563] space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-medium text-[#111827]">
            <AlertCircle className="w-4 h-4 text-[#6B7280] shrink-0" />
            <span>Grey Market Premium &amp; Kostak Notice</span>
          </div>
          <button
            onClick={() => setShowExplainer(!showExplainer)}
            className="text-sm font-medium text-[#111827] hover:underline flex items-center gap-1 shrink-0"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{showExplainer ? 'Hide Guide' : 'What is Kostak & Sauda?'}</span>
          </button>
        </div>
        <p className="leading-relaxed text-sm text-[#4B5563]">
          GMP, Kostak, and Subject to Sauda (SS) are unofficial over-the-counter estimates and do not constitute an exchange-guaranteed listing price. Indicative prices are arithmetic projections (Issue Price + GMP).
        </p>
      </div>

      {/* Explainer Accordion */}
      {showExplainer && (
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA] space-y-1.5">
            <span className="font-semibold text-[#111827] block">
              Grey Market Premium (GMP)
            </span>
            <p className="text-[#4B5563] leading-relaxed text-sm">
              The premium per share at which an IPO is traded in unofficial circles before listing. A GMP of ₹246 on a ₹1,119 issue signals an estimated debut near ₹1,365 (+22.0%).
            </p>
          </div>
          <div className="p-4 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA] space-y-1.5">
            <span className="font-semibold text-[#111827] block">
              Kostak Rate
            </span>
            <p className="text-[#4B5563] leading-relaxed text-sm">
              Fixed cash paid to an applicant for their application, irrespective of whether shares are allotted. You keep the Kostak profit even without allotment.
            </p>
          </div>
          <div className="p-4 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA] space-y-1.5">
            <span className="font-semibold text-[#111827] block">
              Subject to Sauda (SS)
            </span>
            <p className="text-[#4B5563] leading-relaxed text-sm">
              A contingent deal where the buyer pays the agreed premium only if shares are allotted. If no allotment occurs, the deal is void.
            </p>
          </div>
        </div>
      )}

      {/* Selected IPO Historical Trend Highlight */}
      {selectedIpo && (
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAEAEA] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#4B5563]">
                <span className="font-medium">Historical GMP Trajectory</span>
                {selectedIpo.status === 'ongoing' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[#16A34A]">Live Bidding</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-semibold text-[#111827] mt-0.5">
                {selectedIpo.company?.name || selectedIpo.slug}
              </h2>
              <div className="text-sm text-[#4B5563] flex flex-wrap items-center gap-2 mt-1">
                <span>{selectedIpo.category}</span>
                <span aria-hidden="true">·</span>
                <span>Closes {formatIndianDate(selectedIpo.close_date)}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  ₹{selectedIpo.price_band_min || selectedIpo.issue_price} – ₹{selectedIpo.price_band_max || selectedIpo.issue_price}
                </span>
                {selectedIpo.lot_size && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{selectedIpo.lot_size} shares/lot</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => handleOpenAllotment(selectedIpo.slug)}
                className="text-sm font-medium text-[#111827] bg-white hover:bg-[#FAFAFA] border border-[#E5E7EB] px-3.5 py-2 rounded-lg transition-colors"
              >
                Check Allotment
              </button>
              <button
                onClick={() => navigate(`/ipo/${selectedIpo.slug}`)}
                className="text-sm font-medium text-white bg-[#111827] hover:bg-neutral-800 px-4 py-2 rounded-lg transition-colors"
              >
                Full Details
              </button>
            </div>
          </div>

          <GMPTrendChart
            history={selectedIpo.gmp_history}
            basePrice={selectedIpo.issue_price || selectedIpo.price_band_max}
          />
        </div>
      )}

      {/* Interactive IPO Profit & Return Estimator */}
      <IPOProfitCalculator ipos={ipos} preselectedSlug={selectedIpo?.slug} />

      {/* Filter and Search Bar Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-white border border-[#EAEAEA] rounded-lg">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-[#111827] text-white font-medium'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            All Active
          </button>
          <button
            onClick={() => setFilterType('live')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
              filterType === 'live'
                ? 'bg-[#111827] text-white font-medium'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            Open ({ipos.filter((i) => i.status === 'ongoing').length})
          </button>
          <button
            onClick={() => setFilterType('Mainboard')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
              filterType === 'Mainboard'
                ? 'bg-[#111827] text-white font-medium'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            Mainboard
          </button>
          <button
            onClick={() => setFilterType('SME')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
              filterType === 'SME'
                ? 'bg-[#111827] text-white font-medium'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            SME
          </button>
          <button
            onClick={() => setFilterType('hot')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
              filterType === 'hot'
                ? 'bg-[#111827] text-white font-medium'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            High Demand
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Filter IPO name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-[#EAEAEA] focus:border-[#111827] rounded-lg text-[#111827] outline-none"
          />
        </div>
      </div>

      {/* Clean GMP Table */}
      <div className="overflow-x-auto bg-white border border-[#EAEAEA] rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#FAFAFA] border-b border-[#EAEAEA] text-[#4B5563] font-semibold text-xs">
            <tr>
              <th className="py-3.5 px-4">Company</th>
              <th className="py-3.5 px-3">Open Date</th>
              <th className="py-3.5 px-3 text-right">Issue Price</th>
              <th className="py-3.5 px-3 text-right">GMP (₹)</th>
              <th className="py-3.5 px-3 text-right">Kostak</th>
              <th className="py-3.5 px-3 text-right">Sauda</th>
              <th className="py-3.5 px-3">Demand</th>
              <th className="py-3.5 px-3 text-right">Est. Listing</th>
              <th className="py-3.5 px-3 text-right">Est. Gain</th>
              <th className="py-3.5 px-3 text-right">Sub</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA] tabular-nums bg-white">
            {loading ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-[#4B5563]">
                  Loading grey market observations...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-[#4B5563]">
                  No active IPO GMP quotes match your filter.
                </td>
              </tr>
            ) : (
              filtered.map((ipo) => {
                const gmp = ipo.latest_gmp;
                if (!gmp) return null;
                const basePrice = ipo.issue_price || ipo.price_band_max;
                const indEst = basePrice ? calculateIndicativeListingPrice(basePrice, gmp.gmp_amount) : null;
                const indGainPct = basePrice ? calculateIndicativeGainPercentage(basePrice, gmp.gmp_amount) : null;
                const isSelected = selectedIpo?.id === ipo.id;
                const isGain = gmp.gmp_amount >= 0;

                return (
                  <tr
                    key={ipo.id}
                    onClick={() => setSelectedIpo(ipo)}
                    className={`hover:bg-[#FAFAFA] transition-colors cursor-pointer group ${
                      isSelected ? 'bg-[#FAFAFA]' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="font-semibold text-[#111827] text-sm sm:text-[15px]">
                        {ipo.company?.name || ipo.slug}
                      </div>
                      <div className="text-xs text-[#4B5563] flex items-center gap-1.5 mt-0.5">
                        <span>{ipo.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ipo.exchange}</span>
                        {ipo.status === 'ongoing' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#16A34A] font-medium">Open</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-3 whitespace-nowrap text-sm text-[#4B5563]">
                      {ipo.open_date ? (
                        <div>
                          <span>{formatIndianDate(ipo.open_date)}</span>
                          <span className="block text-xs text-[#6B7280]">{ipo.lot_size ? `${ipo.lot_size} sh` : ''}</span>
                        </div>
                      ) : (
                        <span className="text-[#6B7280]">TBA</span>
                      )}
                    </td>

                    <td className="py-4 px-3 text-right text-[#111827]">
                      ₹{ipo.price_band_max || ipo.issue_price || '-'}
                    </td>

                    <td className={`py-4 px-3 text-right font-semibold whitespace-nowrap ${isGain ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      {isGain ? `+₹${gmp.gmp_amount}` : `-₹${Math.abs(gmp.gmp_amount)}`}
                    </td>

                    <td className="py-4 px-3 text-right text-[#4B5563]">
                      {gmp.kostak_rate ? `₹${gmp.kostak_rate.toLocaleString('en-IN')}` : '—'}
                    </td>

                    <td className="py-4 px-3 text-right text-[#4B5563]">
                      {gmp.subject_to_sauda_rate ? `₹${gmp.subject_to_sauda_rate.toLocaleString('en-IN')}` : '—'}
                    </td>

                    <td className="py-4 px-3 text-sm">
                      <span className={`font-medium ${(gmp.fire_rating || 0) >= 4 ? 'text-[#16A34A]' : 'text-[#4B5563]'}`}>
                        {getDemandLabel(gmp.fire_rating)}
                      </span>
                    </td>

                    <td className="py-4 px-3 text-right font-medium text-[#111827]">
                      {indEst ? `₹${indEst.price}` : '—'}
                    </td>

                    <td className={`py-4 px-3 text-right font-semibold ${(indGainPct ?? 0) >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      {indGainPct !== null ? `${indGainPct >= 0 ? '+' : ''}${indGainPct}%` : '—'}
                    </td>

                    <td className="py-4 px-3 text-right text-sm">
                      {ipo.latest_subscription ? (
                        <span className="font-medium text-[#111827]">
                          {ipo.latest_subscription.total_multiple.toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-[#6B7280]">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/ipo/${ipo.slug}`);
                        }}
                        className="px-3.5 py-1.5 bg-white border border-[#E5E7EB] hover:bg-[#FAFAFA] hover:border-[#111827] text-[#111827] text-sm font-medium rounded-lg transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Allotment Modal */}
      <AllotmentCheckerModal
        isOpen={allotmentModalOpen}
        onClose={() => setAllotmentModalOpen(false)}
        ipos={ipos}
        preselectedSlug={allotmentModalSlug}
      />
    </div>
  );
};
