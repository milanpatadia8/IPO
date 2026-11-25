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
import { Search, ArrowUpDown, Filter, ChevronRight, FileText, ExternalLink } from 'lucide-react';

interface ListedIPOsPageProps {
  navigate: (route: string) => void;
}

export const ListedIPOsPage: React.FC<ListedIPOsPageProps> = ({ navigate }) => {
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
      <div className="space-y-2 border-b border-[#EAEAEA] pb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">
          Historical Listing Performance
        </h1>
        <p className="text-base text-[#4B5563] max-w-2xl leading-relaxed">
          Verified IPO listing debut prices across NSE and BSE. Review issue prices against opening exchange rates.
        </p>
      </div>

      {/* Visual Chart */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111827]">First-Day Listing Gains (%)</h2>
          <span className="text-xs text-[#4B5563]">Verified exchange data</span>
        </div>
        <ListingGainChart ipos={ipos} />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search listed companies or symbols..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-sm bg-[#FAFAFA] border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-[#111827] transition-colors"
          />
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg">
            <button
              onClick={() => setPerformanceFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                performanceFilter === 'all'
                  ? 'bg-[#111827] text-white font-medium'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPerformanceFilter('gain')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                performanceFilter === 'gain'
                  ? 'bg-[#16A34A] text-white font-medium'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Premium
            </button>
            <button
              onClick={() => setPerformanceFilter('loss')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                performanceFilter === 'loss'
                  ? 'bg-[#DC2626] text-white font-medium'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Discount
            </button>
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="h-10 px-3 text-sm bg-white border border-[#E5E7EB] rounded-lg text-[#111827] outline-none focus:border-[#111827]"
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
      <div className="overflow-x-auto bg-white border border-[#EAEAEA] rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#FAFAFA] border-b border-[#EAEAEA] text-[#4B5563] font-semibold text-xs">
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
          <tbody className="divide-y divide-[#EAEAEA] bg-white">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#4B5563]">
                  Loading listed IPOs...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#4B5563]">
                  No listed IPO records match the selected criteria.
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
                    className="hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4">
                      <div className="font-semibold text-[#111827] text-sm sm:text-[15px]">
                        {ipo.company?.name || ipo.slug}
                      </div>
                      <div className="text-xs text-[#4B5563] flex items-center gap-1.5 mt-0.5">
                        <span>{ipo.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ipo.exchange}</span>
                      </div>
                    </td>

                    <td className="py-4 px-3 whitespace-nowrap tabular-nums text-sm text-[#4B5563]">
                      {formatIndianDate(ipo.listing_date)}
                    </td>

                    <td className="py-4 px-3 text-right tabular-nums text-[#111827]">
                      ₹{res?.issue_price ?? ipo.issue_price ?? '-'}
                    </td>

                    <td className="py-4 px-3 text-right tabular-nums font-medium text-[#111827]">
                      ₹{res?.listing_price ?? '-'}
                    </td>

                    <td
                      className={`py-4 px-3 text-right tabular-nums font-medium ${
                        isProfit ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}
                    >
                      {isProfit ? `+₹${gain}` : `-₹${Math.abs(gain)}`}
                    </td>

                    <td
                      className={`py-4 px-3 text-right tabular-nums font-semibold ${
                        isProfit ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}
                    >
                      {isProfit ? `+${gainPct}%` : `${gainPct}%`}
                    </td>

                    <td className="py-4 px-3 text-right tabular-nums text-[#4B5563]">
                      {formatCrores(ipo.issue_size)}
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
    </div>
  );
};
