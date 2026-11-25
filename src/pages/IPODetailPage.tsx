import React, { useState, useEffect } from 'react';
import { IPO } from '../types/ipo';
import { api } from '../lib/api';
import { StatusIndicator } from '../components/StatusIndicator';
import { GMPDisplay } from '../components/GMPDisplay';
import { SubscriptionProgress } from '../components/SubscriptionProgress';
import { GMPTrendChart } from '../components/GMPTrendChart';
import { SubscriptionTrendChart } from '../components/SubscriptionTrendChart';
import { AllotmentCheckerModal } from '../components/AllotmentCheckerModal';
import { IPOProfitCalculator } from '../components/IPOProfitCalculator';
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
import {
  FileText,
  ExternalLink,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  ShieldAlert,
  X,
} from 'lucide-react';

interface IPODetailPageProps {
  slug: string;
  navigate: (route: string) => void;
}

export const IPODetailPage: React.FC<IPODetailPageProps> = ({ slug, navigate }) => {
  const [ipo, setIpo] = useState<IPO | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<IPO[]>([]);
  const [copied, setCopied] = useState(false);
  const [allotmentModalOpen, setAllotmentModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  useEffect(() => {
    async function loadIPO() {
      setLoading(true);
      try {
        const data = await api.getIPOBySlug(slug);
        setIpo(data || null);

        if (data) {
          const all = await api.getAllIPOs();
          const rel = all.filter((i) => i.id !== data.id && i.category === data.category).slice(0, 3);
          setRelated(rel);
        }
      } catch (err) {
        console.error('Failed to load IPO details', err);
      } finally {
        setLoading(false);
      }
    }
    loadIPO();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-[#6B7280] text-sm">
        Loading IPO offering details...
      </div>
    );
  }

  if (!ipo) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-semibold text-[#111827]">IPO Record Not Found</h2>
        <p className="text-sm text-[#4B5563]">
          The requested public issue slug &quot;{slug}&quot; does not exist in the database.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-[#111827] hover:bg-neutral-800 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const daysRem = calculateDaysRemaining(ipo.close_date);
  const minApp = calculateMinApplication(ipo.price_band_max, ipo.lot_size);
  const basePrice = ipo.issue_price || ipo.price_band_max;
  const listingGain =
    ipo.listing_result &&
    calculateListingGain(ipo.listing_result.issue_price, ipo.listing_result.listing_price);
  const listingGainPct =
    ipo.listing_result &&
    calculateListingGainPercentage(ipo.listing_result.issue_price, ipo.listing_result.listing_price);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/ipo/ongoing')}
          className="inline-flex items-center gap-1.5 text-sm text-[#4B5563] hover:text-[#111827] transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Open Issues</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-sm text-[#4B5563] hover:text-[#111827] bg-white border border-[#E5E7EB] px-3.5 py-1.5 rounded-lg transition-colors font-medium"
          >
            <Share2 className="w-4 h-4" />
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Issue Header Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <StatusIndicator
                status={ipo.status}
                announcementStatus={ipo.announcement_status}
                category={ipo.category}
              />
              <span className="text-[#D1D5DB]" aria-hidden="true">·</span>
              <span className="text-[#4B5563]">{ipo.exchange}</span>
              {daysRem.days !== null && ipo.status === 'ongoing' && (
                <>
                  <span className="text-[#D1D5DB]" aria-hidden="true">·</span>
                  <span className="text-[#16A34A] font-medium">
                    {daysRem.statusText}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">
              {ipo.company?.name || ipo.slug}
            </h1>

            <p className="text-sm sm:text-base text-[#4B5563] max-w-2xl leading-relaxed">
              {ipo.company?.description || 'Company offering prospectus overview.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              {ipo.company?.website_url && (
                <a
                  href={ipo.company.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[#111827] font-medium hover:underline"
                >
                  <span>Corporate Website</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#6B7280]" />
                </a>
              )}
              {ipo.rhp_url && (
                <a
                  href={ipo.rhp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[#111827] font-medium hover:underline"
                >
                  <span>Red Herring Prospectus (RHP)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#6B7280]" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Issue Stats Card */}
          <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl p-4 min-w-[270px] space-y-2.5 tabular-nums text-sm self-start">
            <div className="flex justify-between border-b border-[#EAEAEA] pb-2">
              <span className="text-[#4B5563]">Issue Size</span>
              <span className="font-semibold text-[#111827]">{formatCrores(ipo.issue_size)}</span>
            </div>
            <div className="flex justify-between border-b border-[#EAEAEA] pb-2">
              <span className="text-[#4B5563]">Price Band</span>
              <span className="font-semibold text-[#111827]">
                {ipo.price_band_min && ipo.price_band_max
                  ? `₹${ipo.price_band_min} – ₹${ipo.price_band_max}`
                  : 'TBA'}
              </span>
            </div>
            <div className="flex justify-between border-b border-[#EAEAEA] pb-2">
              <span className="text-[#4B5563]">Market Lot</span>
              <span className="font-semibold text-[#111827]">
                {ipo.lot_size ? `${ipo.lot_size} shares` : 'TBA'}
              </span>
            </div>
            <div className="flex justify-between border-b border-[#EAEAEA] pb-2">
              <span className="text-[#4B5563]">Min Investment</span>
              <span className="font-semibold text-[#111827]">
                {minApp ? `₹${minApp.toLocaleString('en-IN')}` : 'TBA'}
              </span>
            </div>
            <div className="pt-1 space-y-2">
              {ipo.status === 'ongoing' ? (
                <button
                  onClick={() => setApplyModalOpen(true)}
                  className="w-full py-2.5 bg-[#111827] hover:bg-neutral-800 text-white rounded-lg text-sm font-medium transition-colors text-center"
                >
                  Apply via UPI on Broker
                </button>
              ) : (
                <button
                  onClick={() => setAllotmentModalOpen(true)}
                  className="w-full py-2.5 bg-[#111827] hover:bg-neutral-800 text-white rounded-lg text-sm font-medium transition-colors text-center"
                >
                  Check Allotment Status
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Timetable & Important Dates */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#111827] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#111827]" />
              <span>Issue Timetable</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
                <span className="text-[#4B5563] block text-xs">Bidding Opens</span>
                <span className="font-medium tabular-nums text-[#111827] block mt-0.5">
                  {formatIndianDate(ipo.open_date)}
                </span>
              </div>
              <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
                <span className="text-[#4B5563] block text-xs">Bidding Closes</span>
                <span className="font-medium tabular-nums text-[#111827] block mt-0.5">
                  {formatIndianDate(ipo.close_date)}
                </span>
              </div>
              <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
                <span className="text-[#4B5563] block text-xs">Basis of Allotment</span>
                <span className="font-medium tabular-nums text-[#111827] block mt-0.5">
                  {formatIndianDate(ipo.allotment_date)}
                </span>
              </div>
              <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
                <span className="text-[#4B5563] block text-xs">Initiation of Refunds</span>
                <span className="font-medium tabular-nums text-[#111827] block mt-0.5">
                  {formatIndianDate(ipo.refund_date)}
                </span>
              </div>
              <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
                <span className="text-[#4B5563] block text-xs">Demat Credit</span>
                <span className="font-medium tabular-nums text-[#111827] block mt-0.5">
                  {formatIndianDate(ipo.demat_credit_date)}
                </span>
              </div>
              <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
                <span className="text-[#4B5563] block text-xs">Exchange Listing</span>
                <span className="font-medium tabular-nums text-[#111827] block mt-0.5">
                  {formatIndianDate(ipo.listing_date)}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#4B5563]">
              Dates correspond to Indian Standard Time (IST) disclosures filed with SEBI and exchanges.
            </p>
          </div>

          {/* Live Subscription Status & Demand Progression */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">
                  Subscription Status &amp; Demand Trend
                </h2>
                <p className="text-sm text-[#4B5563]">
                  Consolidated bidding multiples from NSE and BSE order books
                </p>
              </div>
              <span className="text-sm text-[#111827] tabular-nums font-semibold">
                {ipo.latest_subscription ? `${ipo.latest_subscription.total_multiple.toFixed(2)}x` : 'Awaiting Bids'}
              </span>
            </div>

            <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#EAEAEA]">
              <SubscriptionProgress subscription={ipo.latest_subscription} />
            </div>

            <div className="pt-2 border-t border-[#EAEAEA]">
              <SubscriptionTrendChart
                history={ipo.subscription_history}
                openDate={ipo.open_date}
                closeDate={ipo.close_date}
                status={ipo.status}
              />
            </div>

            {/* Historical Subscription Days Table */}
            {ipo.subscription_history && ipo.subscription_history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#EAEAEA] space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#111827]">Day-wise Bidding Log</h3>
                  <span className="text-xs text-[#4B5563]">Time-stamped snapshots</span>
                </div>
                <div className="overflow-x-auto border border-[#EAEAEA] rounded-lg">
                  <table className="w-full text-left text-sm tabular-nums">
                    <thead className="bg-[#FAFAFA] text-[#4B5563] font-semibold text-xs border-b border-[#EAEAEA]">
                      <tr>
                        <th className="py-3 px-3">Timeline (IST)</th>
                        <th className="py-3 px-3">Day</th>
                        <th className="py-3 px-3 text-right">QIB</th>
                        <th className="py-3 px-3 text-right">NII</th>
                        <th className="py-3 px-3 text-right">Retail</th>
                        <th className="py-3 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAEAEA] bg-white">
                      {ipo.subscription_history.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="py-3 px-3 text-[#111827]">
                            {formatIndianTimestamp(s.observed_at)}
                          </td>
                          <td className="py-3 px-3 text-[#4B5563] font-medium">
                            {s.day_number ? `Day ${s.day_number}` : `Obs ${idx + 1}`}
                          </td>
                          <td className="py-3 px-3 text-right text-[#111827] font-medium">{s.qib_multiple.toFixed(2)}x</td>
                          <td className="py-3 px-3 text-right text-[#4B5563] font-medium">{s.nii_multiple.toFixed(2)}x</td>
                          <td className="py-3 px-3 text-right text-[#16A34A] font-medium">{s.retail_multiple.toFixed(2)}x</td>
                          <td className="py-3 px-3 text-right font-semibold text-[#111827]">
                            {s.total_multiple.toFixed(2)}x
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Grey Market Premium (GMP) History */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">
                  Grey Market Premium (GMP) History
                </h2>
                <p className="text-sm text-[#4B5563]">
                  Daily tracking of unofficial dealer bids and indicative return percentages
                </p>
              </div>
              <button
                onClick={() => navigate('/disclaimer')}
                className="text-xs text-[#4B5563] hover:text-[#111827] transition-colors font-medium"
              >
                Disclaimer
              </button>
            </div>

            <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#EAEAEA]">
              <GMPDisplay
                latestGmp={ipo.latest_gmp}
                previousGmp={ipo.previous_gmp}
                basePrice={basePrice}
              />
            </div>

            <GMPTrendChart history={ipo.gmp_history} basePrice={basePrice} />
          </div>

          {/* Interactive Profit & GMP Return Estimator */}
          <IPOProfitCalculator ipos={[ipo]} preselectedSlug={ipo.slug} />

          {/* Actual Listing Results (if listed) */}
          {ipo.listing_result && (
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#111827]">
                Actual Listing Performance
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm tabular-nums">
                <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
                  <span className="text-[#4B5563] block text-xs">Issue Price</span>
                  <span className="text-lg font-semibold text-[#111827] block mt-0.5">
                    ₹{ipo.listing_result.issue_price}
                  </span>
                </div>
                <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
                  <span className="text-[#4B5563] block text-xs">Listing Price</span>
                  <span className="text-lg font-semibold text-[#111827] block mt-0.5">
                    ₹{ipo.listing_result.listing_price}
                  </span>
                </div>
                <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
                  <span className="text-[#4B5563] block text-xs">Listing Gain (₹)</span>
                  <span
                    className={`text-lg font-semibold block mt-0.5 ${
                      listingGain! >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}
                  >
                    {listingGain! >= 0 ? `+₹${listingGain}` : `-₹${Math.abs(listingGain!)}`}
                  </span>
                </div>
                <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
                  <span className="text-[#4B5563] block text-xs">Listing Return (%)</span>
                  <span
                    className={`text-lg font-semibold block mt-0.5 ${
                      listingGainPct! >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}
                  >
                    {listingGainPct! >= 0 ? `+${listingGainPct}%` : `${listingGainPct}%`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Issue Structure, Registrar, Documents & Related */}
        <div className="space-y-6">
          {/* Issue Structure Card */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-3">
            <h3 className="text-base font-semibold text-[#111827] border-b border-[#EAEAEA] pb-2">
              Issue Structure Breakdown
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Total Issue Size</span>
                <span className="tabular-nums font-medium text-[#111827]">
                  {formatCrores(ipo.issue_size)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Fresh Issue</span>
                <span className="tabular-nums font-medium text-[#111827]">
                  {formatCrores(ipo.fresh_issue_size)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Offer for Sale (OFS)</span>
                <span className="tabular-nums font-medium text-[#111827]">
                  {formatCrores(ipo.offer_for_sale_size)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EAEAEA] space-y-2 text-sm">
              <span className="text-[#4B5563] font-semibold text-xs block">
                Quota Distribution
              </span>
              <div className="flex justify-between">
                <span className="text-[#4B5563]">QIB Quota</span>
                <span className="tabular-nums font-medium text-[#111827]">
                  {ipo.qib_quota_percent || 50}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563]">NII / HNI Quota</span>
                <span className="tabular-nums font-medium text-[#111827]">
                  {ipo.nii_quota_percent || 15}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Retail Quota</span>
                <span className="tabular-nums font-medium text-[#111827]">
                  {ipo.retail_quota_percent || 35}%
                </span>
              </div>
            </div>
          </div>

          {/* Registrar & Allotment Checker */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-3">
            <h3 className="text-base font-semibold text-[#111827] border-b border-[#EAEAEA] pb-2">
              Registrar &amp; Allotment
            </h3>

            <p className="text-sm text-[#4B5563] leading-relaxed">
              Designated registrar responsible for share allotment processing and demat credit:
            </p>

            <div className="text-sm font-semibold text-[#111827]">
              {ipo.registrar_name || 'Registrar TBA'}
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => setAllotmentModalOpen(true)}
                className="w-full py-2.5 px-3 bg-[#111827] hover:bg-neutral-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Check Allotment Status</span>
              </button>

              {ipo.registrar_url && (
                <a
                  href={ipo.registrar_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-white hover:bg-[#FAFAFA] border border-[#E5E7EB] text-[#111827] rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <span>Open Registrar Site</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#6B7280]" />
                </a>
              )}
            </div>
          </div>

          {/* Official SEBI Filings Card */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-3">
            <h3 className="text-base font-semibold text-[#111827] border-b border-[#EAEAEA] pb-2">
              SEBI Offer Prospectus
            </h3>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Review statutory disclosures, risk factors, promoter holdings, and financial statements:
            </p>
            <div className="space-y-2 pt-1">
              {ipo.rhp_url ? (
                <a
                  href={ipo.rhp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-[#FAFAFA] hover:bg-neutral-100 border border-[#EAEAEA] text-[#111827] rounded-lg text-sm font-medium transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#111827]" />
                    <span>Red Herring Prospectus (RHP)</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#6B7280]" />
                </a>
              ) : null}
              {ipo.drhp_url ? (
                <a
                  href={ipo.drhp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-[#FAFAFA] hover:bg-neutral-100 border border-[#EAEAEA] text-[#111827] rounded-lg text-sm font-medium transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#6B7280]" />
                    <span>Draft Prospectus (DRHP)</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#6B7280]" />
                </a>
              ) : null}
            </div>
          </div>

          {/* Related IPOs */}
          {related.length > 0 && (
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-3">
              <h3 className="text-base font-semibold text-[#111827] border-b border-[#EAEAEA] pb-2">
                Other {ipo.category} IPOs
              </h3>
              <div className="space-y-2">
                {related.map((rel) => (
                  <button
                    key={rel.id}
                    onClick={() => navigate(`/ipo/${rel.slug}`)}
                    className="w-full text-left p-3 rounded-lg hover:bg-[#FAFAFA] transition-colors border border-[#EAEAEA] block group"
                  >
                    <div className="font-medium text-sm text-[#111827]">
                      {rel.company?.name || rel.slug}
                    </div>
                    <div className="text-xs text-[#4B5563] tabular-nums mt-0.5">
                      {rel.price_band_max ? `₹${rel.price_band_max}` : 'Price TBA'} · {rel.status}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Allotment Verification Modal */}
      <AllotmentCheckerModal
        isOpen={allotmentModalOpen}
        onClose={() => setAllotmentModalOpen(false)}
        ipos={related.concat(ipo)}
        preselectedSlug={ipo.slug}
      />

      {/* Apply via UPI Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-[#EAEAEA] shadow-xl max-w-lg w-full p-6 relative space-y-4">
            <button
              onClick={() => setApplyModalOpen(false)}
              className="absolute top-4 right-4 text-[#6B7280] hover:text-[#111827] p-1 rounded-lg transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-xs font-medium text-[#4B5563]">
                UPI Bidding Guidelines
              </span>
              <h3 className="text-lg font-semibold text-[#111827]">
                How to apply for {ipo.company?.name || ipo.slug}
              </h3>
            </div>

            <div className="space-y-3 text-sm text-[#4B5563] leading-relaxed">
              <div className="p-3.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg space-y-1">
                <div className="font-semibold text-[#111827]">Step 1: Open your trading account</div>
                <div>Log into your broker app or website (e.g. Zerodha Kite, Groww, AngelOne, Upstox) and navigate to <strong>Bids &gt; IPO</strong>.</div>
              </div>

              <div className="p-3.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg space-y-1">
                <div className="font-semibold text-[#111827]">Step 2: Enter bid details</div>
                <div>Select <strong>{ipo.company?.name || ipo.slug}</strong>, enter your UPI ID, enter quantity in lots of <strong>{ipo.lot_size || 1}</strong> shares, and opt for cut-off price (₹{ipo.price_band_max || ipo.issue_price || 'TBA'}).</div>
              </div>

              <div className="p-3.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg space-y-1">
                <div className="font-semibold text-[#111827]">Step 3: Authorize UPI Mandate</div>
                <div>Open your UPI app (Google Pay, PhonePe, BHIM, Paytm, or CRED) and approve the mandate before 5:00 PM on the closing date ({formatIndianDate(ipo.close_date)}). Funds remain in your bank account until allotment.</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setApplyModalOpen(false)}
                className="px-4 py-2 bg-[#111827] hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
