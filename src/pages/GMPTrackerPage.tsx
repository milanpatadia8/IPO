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
import { useSitePageContent } from '../lib/siteContent';
import { PageExtraSections } from '../components/PageCustomSections';
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
  const pageContent = useSitePageContent('unlisted_price');
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
          const ongoing = withGmp.find((i) => i.status === 'ongoing');
          setSelectedIpo(ongoing || withGmp[0]);
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
      <div className="space-y-2 border-b border-[#E6DFD3] pb-6">
        {pageContent.eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A5B13]">
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

      {/* Statutory Notice */}
      <div className="bg-[#FDF8EE] border border-[#EBDCC3] rounded-xl p-5 text-sm text-[#57534E] space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-medium text-[#1C1917]">
            <AlertCircle className="w-4 h-4 text-[#9A5B13] shrink-0" />
            <span>
              {pageContent.notice_banner_title || 'SEBI Compliance & Unlisted Price Notice'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowExplainer(!showExplainer)}
            className="text-sm font-medium text-[#14532D] hover:underline flex items-center gap-1 shrink-0"
          >
            <HelpCircle className="w-4 h-4" />
            <span>
              {showExplainer
                ? 'Hide Guide'
                : pageContent.custom_fields.explainer_toggle_label ||
                  'How to Read Unlisted Price?'}
            </span>
          </button>
        </div>
        <p className="leading-relaxed text-sm text-[#57534E] whitespace-pre-line">
          {pageContent.notice_banner_body ||
            'As per SEBI guidelines, we do not show Grey Market Premium (GMP). Unlisted Price references and indicative spreads shown here are strictly informational pre-listing indicators and do not constitute exchange-guaranteed listing prices or investment advice.'}
        </p>
      </div>

      {/* Explainer Accordion */}
      {showExplainer && (
        <div className="bg-white border border-[#E6DFD3] rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-[#FAF7F1] rounded-lg border border-[#E6DFD3] space-y-1.5">
            <span className="font-semibold text-[#1C1917] block">
              Unlisted Price Spread
            </span>
            <p className="text-[#57534E] leading-relaxed text-sm">
              The indicative per-share difference between pre-listing market reference pricing and the IPO upper price band. For example, a +₹246 spread on a ₹1,119 issue implies an indicative unlisted price near ₹1,365 (+22.0%).
            </p>
          </div>
          <div className="p-4 bg-[#FAF7F1] rounded-lg border border-[#E6DFD3] space-y-1.5">
            <span className="font-semibold text-[#1C1917] block">
              Indicative Unlisted Price
            </span>
            <p className="text-[#57534E] leading-relaxed text-sm">
              Calculated simply as the IPO upper price band plus the latest recorded unlisted price spread. Actual listing prices are discovered strictly through exchange order matching on listing day.
            </p>
          </div>
          <div className="p-4 bg-[#FAF7F1] rounded-lg border border-[#E6DFD3] space-y-1.5">
            <span className="font-semibold text-[#1C1917] block">
              SEBI Compliance Note
            </span>
            <p className="text-[#57534E] leading-relaxed text-sm">
              In line with SEBI regulations, IPO Insiders does not publish or endorse GMP. Always consult the official DRHP/RHP on SEBI&apos;s portal and a registered financial advisor before applying.
            </p>
          </div>
        </div>
      )}

      {/* Selected IPO Historical Trend Highlight */}
      {selectedIpo && (
        <div className="bg-white border border-[#E6DFD3] rounded-xl p-6 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE9DD] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#57534E]">
                <span className="font-semibold uppercase tracking-wider text-[#9A5B13]">
                  {pageContent.custom_fields.trend_section_eyebrow ||
                    'Historical Unlisted Price Trajectory'}
                </span>
                {selectedIpo.status === 'ongoing' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[#15803D]">Live Bidding</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-display font-semibold text-[#1C1917] mt-0.5">
                {selectedIpo.company?.name || selectedIpo.slug}
              </h2>
              <div className="text-sm text-[#57534E] flex flex-wrap items-center gap-2 mt-1">
                <span>{selectedIpo.category}</span>
                <span aria-hidden="true">·</span>
                <span>Closes {formatIndianDate(selectedIpo.close_date)}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  ₹{selectedIpo.price_band_min || selectedIpo.issue_price} – ₹{selectedIpo.price_band_max || selectedIpo.issue_price}
                </span>
                {selectedIpo.lot_size && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{selectedIpo.lot_size} shares/lot</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleOpenAllotment(selectedIpo.slug)}
                className="text-sm font-medium text-[#1C1917] bg-[#FAF7F1] hover:bg-[#EFE9DD] border border-[#DFD6C7] px-3.5 py-2 rounded-lg transition-colors"
              >
                Check Allotment
              </button>
              <button
                type="button"
                onClick={() => navigate(`/ipo/${selectedIpo.slug}`)}
                className="text-sm font-medium text-white bg-[#14532D] hover:bg-[#0F3F22] px-4 py-2 rounded-lg transition-colors"
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
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EFE9DD] border border-[#E6DFD3] rounded-lg">
          {([
            { id: 'all', label: 'All Active' },
            { id: 'live', label: `Open (${ipos.filter((i) => i.status === 'ongoing').length})` },
            { id: 'Mainboard', label: 'Mainboard' },
            { id: 'SME', label: 'SME' },
            { id: 'hot', label: 'High Demand' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-[#14532D] text-white font-medium'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-3" />
          <input
            type="text"
            placeholder={pageContent.custom_fields.search_placeholder || 'Filter IPO name...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-[#DFD6C7] focus:border-[#14532D] rounded-lg text-[#1C1917] placeholder:text-[#78716C] outline-none"
          />
        </div>
      </div>

      {/* Clean Unlisted Price Table */}
      <div className="overflow-x-auto bg-white border border-[#E6DFD3] rounded-xl shadow-2xs custom-scrollbar">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#FAF6EE] border-b border-[#E6DFD3] text-[#57534E] font-semibold text-xs">
            <tr>
              <th className="py-3.5 px-4">Company</th>
              <th className="py-3.5 px-3">Open Date</th>
              <th className="py-3.5 px-3 text-right">Issue Price</th>
              <th className="py-3.5 px-3 text-right">Unlisted Spread (₹)</th>
              <th className="py-3.5 px-3 text-right">App Quote</th>
              <th className="py-3.5 px-3 text-right">Allotment Quote</th>
              <th className="py-3.5 px-3">Demand</th>
              <th className="py-3.5 px-3 text-right">Unlisted Price</th>
              <th className="py-3.5 px-3 text-right">Indicative %</th>
              <th className="py-3.5 px-3 text-right">Sub</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2ECE1] font-mono tabular-nums bg-white">
            {loading ? (
              <tr>
                <td colSpan={11} className="py-12 text-center font-sans text-[#57534E]">
                  Loading unlisted price observations...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center font-sans text-[#57534E]">
                  {pageContent.custom_fields.empty_state_text ||
                    'No active IPO unlisted price quotes match your filter.'}
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
                    className={`hover:bg-[#FAF7F1] transition-colors cursor-pointer group ${
                      isSelected ? 'bg-[#FAF6EE]' : ''
                    }`}
                  >
                    <td className="py-4 px-4 font-sans">
                      <div className="font-semibold text-[#1C1917] group-hover:text-[#14532D] transition-colors text-sm sm:text-[15px]">
                        {ipo.company?.name || ipo.slug}
                      </div>
                      <div className="text-xs text-[#57534E] flex items-center gap-1.5 mt-0.5">
                        <span className={ipo.category === 'SME' ? 'text-[#9A5B13] font-medium' : 'text-[#14532D] font-medium'}>
                          {ipo.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{ipo.exchange}</span>
                        {ipo.status === 'ongoing' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#15803D] font-medium">Open</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-3 whitespace-nowrap text-xs sm:text-sm text-[#57534E]">
                      {ipo.open_date ? (
                        <div>
                          <span>{formatIndianDate(ipo.open_date)}</span>
                          <span className="block text-xs font-sans text-[#78716C]">{ipo.lot_size ? `${ipo.lot_size} sh` : ''}</span>
                        </div>
                      ) : (
                        <span className="font-sans text-[#78716C]">TBA</span>
                      )}
                    </td>

                    <td className="py-4 px-3 text-right text-[#1C1917]">
                      ₹{ipo.price_band_max || ipo.issue_price || '-'}
                    </td>

                    <td className={`py-4 px-3 text-right font-semibold whitespace-nowrap ${isGain ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                      {isGain ? `+₹${gmp.gmp_amount}` : `-₹${Math.abs(gmp.gmp_amount)}`}
                    </td>

                    <td className="py-4 px-3 text-right text-[#57534E]">
                      {gmp.kostak_rate ? `₹${gmp.kostak_rate.toLocaleString('en-IN')}` : '—'}
                    </td>

                    <td className="py-4 px-3 text-right text-[#57534E]">
                      {gmp.subject_to_sauda_rate ? `₹${gmp.subject_to_sauda_rate.toLocaleString('en-IN')}` : '—'}
                    </td>

                    <td className="py-4 px-3 font-sans text-sm">
                      <span className={`font-medium ${(gmp.fire_rating || 0) >= 4 ? 'text-[#15803D]' : 'text-[#57534E]'}`}>
                        {getDemandLabel(gmp.fire_rating)}
                      </span>
                    </td>

                    <td className="py-4 px-3 text-right font-medium text-[#1C1917]">
                      {indEst ? `₹${indEst.price}` : '—'}
                    </td>

                    <td className={`py-4 px-3 text-right font-semibold ${(indGainPct ?? 0) >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                      {indGainPct !== null ? `${indGainPct >= 0 ? '+' : ''}${indGainPct}%` : '—'}
                    </td>

                    <td className="py-4 px-3 text-right text-sm">
                      {ipo.latest_subscription ? (
                        <span className="font-medium text-[#1C1917]">
                          {ipo.latest_subscription.total_multiple.toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-[#78716C]">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right font-sans whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/ipo/${ipo.slug}`);
                        }}
                        className="px-3.5 py-1.5 bg-[#FAF7F1] border border-[#DFD6C7] hover:bg-[#14532D] hover:border-[#14532D] hover:text-white text-[#1C1917] text-sm font-medium rounded-lg transition-colors"
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

      <PageExtraSections sections={pageContent.extra_sections} />

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
