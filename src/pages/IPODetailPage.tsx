import React, { useState, useEffect } from 'react';
import { IPO } from '../types/ipo';
import { api } from '../lib/api';
import { StatusIndicator } from '../components/StatusIndicator';
import { GMPDisplay } from '../components/GMPDisplay';
import { SubscriptionProgress } from '../components/SubscriptionProgress';
import { GMPTrendChart } from '../components/GMPTrendChart';
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
  const [docCopied, setDocCopied] = useState(false);

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
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500 text-sm">
        Loading IPO offering details...
      </div>
    );
  }

  if (!ipo) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">IPO Record Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested public issue slug &quot;{slug}&quot; does not exist in the database.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-slate-900 text-white rounded text-xs"
        >
          Return to Market Overview
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/ipo/ongoing')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All IPOs</span>
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-md transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copied ? 'Link Copied!' : 'Share Issue'}</span>
        </button>
      </div>

      {/* Main Issue Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StatusIndicator
                status={ipo.status}
                announcementStatus={ipo.announcement_status}
                category={ipo.category}
              />
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-xs font-semibold text-slate-700">{ipo.exchange}</span>
              {daysRem.days !== null && ipo.status === 'ongoing' && (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {daysRem.statusText}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {ipo.company?.name || ipo.slug}
            </h1>

            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              {ipo.company?.description || 'Company offering prospectus overview.'}
            </p>

            {ipo.company?.website_url && (
              <a
                href={ipo.company.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                <span>Visit Corporate Website</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
          </div>

          {/* Quick Issue Stats Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 min-w-[260px] space-y-2.5 font-mono tabular-nums text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500 font-sans">Issue Size</span>
              <span className="font-bold text-slate-900">{formatCrores(ipo.issue_size)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500 font-sans">Price Band</span>
              <span className="font-bold text-slate-900">
                {ipo.price_band_min && ipo.price_band_max
                  ? `₹${ipo.price_band_min} - ₹${ipo.price_band_max}`
                  : 'TBA'}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500 font-sans">Market Lot</span>
              <span className="font-bold text-slate-900">
                {ipo.lot_size ? `${ipo.lot_size} shares` : 'TBA'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Min Application</span>
              <span className="font-bold text-slate-900">
                {minApp ? `₹${minApp.toLocaleString('en-IN')}` : 'TBA'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Timetable, GMP Trend & Subscriptions */}
        <div className="lg:col-span-2 space-y-8">
          {/* Important Timetable Dates (Section 10/11) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-700" />
              <span>Issue Timetable & Important Dates</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Bidding Opens</span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {formatIndianDate(ipo.open_date)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Bidding Closes</span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {formatIndianDate(ipo.close_date)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Basis of Allotment</span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {formatIndianDate(ipo.allotment_date)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Initiation of Refunds</span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {formatIndianDate(ipo.refund_date)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Credit to Demat Account</span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {formatIndianDate(ipo.demat_credit_date)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Listing on Exchanges</span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {formatIndianDate(ipo.listing_date)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Dates correspond to Indian Standard Time (IST) disclosures filed with SEBI and exchanges.
            </p>
          </div>

          {/* Grey Market Premium (GMP) Analytics */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Grey Market Premium (GMP) History
                </h2>
                <p className="text-xs text-slate-500">
                  Daily tracking of unofficial dealer bids and indicative return percentages
                </p>
              </div>
              <button
                onClick={() => navigate('/disclaimer')}
                className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                Speculative Disclaimer
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded border border-slate-100">
              <GMPDisplay
                latestGmp={ipo.latest_gmp}
                previousGmp={ipo.previous_gmp}
                basePrice={basePrice}
              />
            </div>

            <GMPTrendChart history={ipo.gmp_history} basePrice={basePrice} />
          </div>

          {/* Live Subscription Status Breakdown */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Subscription Status Breakdown
              </h2>
              <span className="text-xs text-slate-500">Multiple of shares offered</span>
            </div>

            <SubscriptionProgress subscription={ipo.latest_subscription} />

            {/* Historical Subscription Days Table */}
            {ipo.subscription_history && ipo.subscription_history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-700 mb-2">Bidding Progression</h3>
                <table className="w-full text-left text-xs font-mono tabular-nums">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Date (IST)</th>
                      <th className="py-2 px-3 text-right">QIB</th>
                      <th className="py-2 px-3 text-right">NII</th>
                      <th className="py-2 px-3 text-right">Retail</th>
                      <th className="py-2 px-3 text-right">Total Subscribed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ipo.subscription_history.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2 px-3 font-sans">{formatIndianTimestamp(s.observed_at)}</td>
                        <td className="py-2 px-3 text-right">{s.qib_multiple.toFixed(2)}x</td>
                        <td className="py-2 px-3 text-right">{s.nii_multiple.toFixed(2)}x</td>
                        <td className="py-2 px-3 text-right">{s.retail_multiple.toFixed(2)}x</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {s.total_multiple.toFixed(2)}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Actual Listing Results (if listed) */}
          {ipo.listing_result && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                Actual Listing Performance
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono tabular-nums">
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-400 font-sans block text-[11px]">Issue Price</span>
                  <span className="text-base font-bold text-slate-900 block mt-0.5">
                    ₹{ipo.listing_result.issue_price}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-400 font-sans block text-[11px]">Listing Price</span>
                  <span className="text-base font-bold text-slate-900 block mt-0.5">
                    ₹{ipo.listing_result.listing_price}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-400 font-sans block text-[11px]">Listing Gain (₹)</span>
                  <span
                    className={`text-base font-bold block mt-0.5 ${
                      listingGain! >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {listingGain! >= 0 ? `+₹${listingGain}` : `-₹${Math.abs(listingGain!)}`}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-400 font-sans block text-[11px]">Listing Return (%)</span>
                  <span
                    className={`text-base font-bold block mt-0.5 ${
                      listingGainPct! >= 0 ? 'text-emerald-700' : 'text-rose-700'
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
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Issue Structure Breakdown
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Issue Size</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatCrores(ipo.issue_size)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fresh Issue</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatCrores(ipo.fresh_issue_size)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Offer for Sale (OFS)</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatCrores(ipo.offer_for_sale_size)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
                Quota Distribution
              </span>
              <div className="flex justify-between">
                <span className="text-slate-600">QIB Quota</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {ipo.qib_quota_percent || 50}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">NII / HNI Quota</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {ipo.nii_quota_percent || 15}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Retail Quota</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {ipo.retail_quota_percent || 35}%
                </span>
              </div>
            </div>
          </div>

          {/* Registrar & Allotment Checker */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Registrar & Allotment Status
            </h3>

            <p className="text-xs text-slate-600">
              The designated registrar is responsible for share allotment processing and demat transfer.
            </p>

            <div className="text-xs font-semibold text-slate-900">
              {ipo.registrar_name || 'Registrar TBA'}
            </div>

            {ipo.registrar_url ? (
              <a
                href={ipo.registrar_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Check Allotment Status</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                disabled
                className="w-full py-2 px-3 bg-slate-100 text-slate-400 rounded text-xs font-medium cursor-not-allowed"
              >
                Allotment Link Awaiting Declaration
              </button>
            )}
          </div>

          {/* Official Regulatory Documents */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Official Issue Documents
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Statutory offer documents filed with SEBI and stock exchanges
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <a
                href={getValidDocUrl(ipo.rhp_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-blue-50/60 hover:bg-blue-100/70 rounded-lg border border-blue-200 text-blue-950 font-medium transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    RHP
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 group-hover:text-blue-900 flex items-center gap-1.5">
                      <span>Red Herring Prospectus (RHP)</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      SEBI & ROC Public Offer Document
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-600 group-hover:text-blue-800 shrink-0" />
              </a>

              <a
                href={getValidDocUrl(ipo.drhp_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    DRHP
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 group-hover:text-slate-800 flex items-center gap-1.5">
                      <span>Draft Red Herring Prospectus (DRHP)</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Preliminary SEBI Regulatory Filing
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
              </a>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <a
                  href={SEBI_PUBLIC_ISSUES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open SEBI Public Issues Repository</span>
                  <ExternalLink className="w-3 h-3 text-slate-300" />
                </a>

                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded px-2.5 py-1.5 text-[11px]">
                  <span className="text-slate-500 truncate mr-2 select-all font-mono">
                    https://www.sebi.gov.in/filings/public-issues.html
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(SEBI_PUBLIC_ISSUES_URL);
                      setDocCopied(true);
                      setTimeout(() => setDocCopied(false), 2000);
                    }}
                    className="text-slate-600 hover:text-slate-900 font-medium shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200"
                    title="Copy SEBI public issues URL"
                  >
                    {docCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Related Offerings */}
          {related.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Related {ipo.category} IPOs
              </h3>
              <div className="space-y-2.5 text-xs">
                {related.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/ipo/${r.slug}`)}
                    className="p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors space-y-0.5"
                  >
                    <div className="font-semibold text-slate-900 hover:underline">
                      {r.company?.name || r.slug}
                    </div>
                    <div className="text-slate-400 flex items-center gap-2 text-[11px]">
                      <span>{formatIndianDate(r.open_date || r.listing_date)}</span>
                      <span>·</span>
                      <span>{formatCrores(r.issue_size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
