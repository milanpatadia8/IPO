import React, { useState, useEffect } from 'react';
import { IPO, IPOCategory } from '../types/ipo';
import { api } from '../lib/api';
import {
  calculateListingGain,
  calculateListingGainPercentage,
  formatINR,
  formatCrores,
  formatIndianDate,
  getValidDocUrl,
  SEBI_PUBLIC_ISSUES_URL,
} from '../lib/calculations';
import { ListingGainChart } from '../components/ListingGainChart';
import { useSitePageContent } from '../lib/siteContent';
import { PageNoticeBanner, PageExtraSections } from '../components/PageCustomSections';
import { Search, ArrowUpDown, Filter, ChevronRight, FileText, ExternalLink } from 'lucide-react';

interface ListedIPOsPageProps {
  navigate: (route: string) => void;
}

export const ListedIPOsPage: React.FC<ListedIPOsPageProps> = ({ navigate }) => {
  const pageContent = useSitePageContent('listed');
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IPOCategory | 'all'>('all');
  const [sortOption, setSortOption] = useState<
    'date_desc' | 'date_asc' | 'gain_desc' | 'gain_asc' | 'size_desc' | 'name_asc'
  >('gain_desc');
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'gain' | 'loss'>('all');

  useEffect(() => {
    async function loadListed() {
      setLoading(true);
      try {
        const all = await api.getAllIPOs({ status: 'listed' });
        setIPOs(all);
      } catch (err) {
        console.error('Failed to load listed IPOs', err);
      } finally {
        setLoading(false);
      }
    }
    loadListed();
  }, []);

  // Filter & sort
  let list = ipos.filter((ipo) => {
    if (categoryFilter !== 'all' && ipo.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = ipo.company?.name.toLowerCase().includes(q);
      const matchSlug = ipo.slug.toLowerCase().includes(q);
      if (!matchName && !matchSlug) return false;
    }
    if (performanceFilter !== 'all') {
      const res = ipo.listing_result;
      if (!res) return false;
      const gain = res.listing_price - res.issue_price;
      if (performanceFilter === 'gain' && gain < 0) return false;
      if (performanceFilter === 'loss' && gain >= 0) return false;
    }
    return true;
  });

  list.sort((a, b) => {
    const resA = a.listing_result;
    const resB = b.listing_result;
    switch (sortOption) {
      case 'gain_desc': {
        const gA = resA ? calculateListingGainPercentage(resA.issue_price, resA.listing_price) : -999;
        const gB = resB ? calculateListingGainPercentage(resB.issue_price, resB.listing_price) : -999;
        return gB - gA;
      }
      case 'gain_asc': {
        const gA = resA ? calculateListingGainPercentage(resA.issue_price, resA.listing_price) : 999;
        const gB = resB ? calculateListingGainPercentage(resB.issue_price, resB.listing_price) : 999;
        return gA - gB;
      }
      case 'size_desc':
        return (b.issue_size || 0) - (a.issue_size || 0);
      case 'name_asc':
        return (a.company?.name || a.slug).localeCompare(b.company?.name || b.slug);
      case 'date_asc':
        return new Date(a.listing_date || 0).getTime() - new Date(b.listing_date || 0).getTime();
      case 'date_desc':
      default:
        return new Date(b.listing_date || 0).getTime() - new Date(a.listing_date || 0).getTime();
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2 border-b border-[#E6DFD3] pb-6">
        {pageContent.eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#14532D]">
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

      <PageNoticeBanner
        title={pageContent.notice_banner_title}
        body={pageContent.notice_banner_body}
      />

      {/* Visual Chart */}
      <div className="bg-white border border-[#E6DFD3] rounded-xl p-6 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-[#1C1917]">
            {pageContent.custom_fields.chart_heading || 'First-Day Listing Gains (%)'}
          </h2>
          <span className="text-xs text-[#78716C]">
            {pageContent.custom_fields.chart_sublabel || 'Verified exchange data'}
          </span>
        </div>
        <ListingGainChart ipos={ipos} />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E6DFD3] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={
              pageContent.custom_fields.search_placeholder ||
              'Search listed companies or symbols...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-sm bg-[#FAF7F1] border border-[#DFD6C7] focus:border-[#14532D] focus:bg-white rounded-lg outline-none text-[#1C1917] placeholder:text-[#78716C] transition-colors"
          />
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-3 pointer-events-none" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#EFE9DD] border border-[#E6DFD3] rounded-lg">
            <button
              type="button"
              onClick={() => setPerformanceFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                performanceFilter === 'all'
                  ? 'bg-[#14532D] text-white font-medium'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setPerformanceFilter('gain')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                performanceFilter === 'gain'
                  ? 'bg-[#15803D] text-white font-medium'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Premium
            </button>
            <button
              type="button"
              onClick={() => setPerformanceFilter('loss')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                performanceFilter === 'loss'
                  ? 'bg-[#B91C1C] text-white font-medium'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Discount
            </button>
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="h-10 px-3 text-sm bg-[#FAF7F1] border border-[#DFD6C7] rounded-lg text-[#1C1917] outline-none focus:border-[#14532D] focus:bg-white"
          >
            <option value="gain_desc">Highest Gain (%)</option>
            <option value="gain_asc">Lowest Gain (%)</option>
            <option value="date_desc">Latest Listing Date</option>
            <option value="date_asc">Oldest Listing Date</option>
            <option value="size_desc">Largest Issue Size</option>
            <option value="name_asc">Company (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border border-[#E6DFD3] rounded-xl shadow-2xs custom-scrollbar">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#FAF6EE] border-b border-[#E6DFD3] text-[#57534E] font-semibold text-xs">
            <tr>
              <th className="py-3.5 px-4">Company</th>
              <th className="py-3.5 px-3">Listing Date</th>
              <th className="py-3.5 px-3 text-right">Issue Price</th>
              <th className="py-3.5 px-3 text-right">Listing Price</th>
              <th className="py-3.5 px-3 text-right">Listing Gain (₹)</th>
              <th className="py-3.5 px-3 text-right">Return (%)</th>
              <th className="py-3.5 px-3 text-right">Issue Size</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2ECE1] bg-white">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#57534E]">
                  Loading listed IPOs...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#57534E]">
                  {pageContent.custom_fields.empty_state_text ||
                    'No listed IPO records match the selected criteria.'}
                </td>
              </tr>
            ) : (
              list.map((ipo) => {
                const res = ipo.listing_result;
                const gain = res ? calculateListingGain(res.issue_price, res.listing_price) : 0;
                const gainPct = res ? calculateListingGainPercentage(res.issue_price, res.listing_price) : 0;
                const isProfit = gain >= 0;

                return (
                  <tr
                    key={ipo.id}
                    onClick={() => navigate(`/ipo/${ipo.slug}`)}
                    className="hover:bg-[#FAF7F1] transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4">
                      <div className="font-semibold text-[#1C1917] group-hover:text-[#14532D] transition-colors text-sm sm:text-[15px]">
                        {ipo.company?.name || ipo.slug}
                      </div>
                      <div className="text-xs text-[#57534E] flex items-center gap-1.5 mt-0.5">
                        <span className={ipo.category === 'SME' ? 'text-[#9A5B13] font-medium' : 'text-[#14532D] font-medium'}>
                          {ipo.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{ipo.exchange}</span>
                      </div>
                    </td>

                    <td className="py-4 px-3 whitespace-nowrap font-mono tabular-nums text-xs sm:text-sm text-[#57534E]">
                      {formatIndianDate(ipo.listing_date)}
                    </td>

                    <td className="py-4 px-3 text-right font-mono tabular-nums text-[#1C1917]">
                      ₹{res?.issue_price ?? ipo.issue_price ?? '-'}
                    </td>

                    <td className="py-4 px-3 text-right font-mono tabular-nums font-medium text-[#1C1917]">
                      ₹{res?.listing_price ?? '-'}
                    </td>

                    <td
                      className={`py-4 px-3 text-right font-mono tabular-nums font-medium ${
                        isProfit ? 'text-[#15803D]' : 'text-[#B91C1C]'
                      }`}
                    >
                      {isProfit ? `+₹${gain}` : `-₹${Math.abs(gain)}`}
                    </td>

                    <td
                      className={`py-4 px-3 text-right font-mono tabular-nums font-semibold ${
                        isProfit ? 'text-[#15803D]' : 'text-[#B91C1C]'
                      }`}
                    >
                      {isProfit ? `+${gainPct}%` : `${gainPct}%`}
                    </td>

                    <td className="py-4 px-3 text-right font-mono tabular-nums text-[#57534E]">
                      {formatCrores(ipo.issue_size)}
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
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
    </div>
  );
};
