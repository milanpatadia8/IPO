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
      case 'date_desc':
        return (
          new Date(resB?.listing_date || 0).getTime() - new Date(resA?.listing_date || 0).getTime()
        );
      case 'date_asc':
        return (
          new Date(resA?.listing_date || 0).getTime() - new Date(resB?.listing_date || 0).getTime()
        );
      case 'size_desc':
        return (b.issue_size || 0) - (a.issue_size || 0);
      case 'name_asc':
        return (a.company?.name || a.slug).localeCompare(b.company?.name || b.slug);
      default:
        return 0;
    }
  });

  // Data for listing comparison chart
  const chartData = list
    .filter((i) => i.listing_result)
    .slice(0, 8)
    .map((i) => ({
      company: i.company?.name?.split(' ')[0] || i.slug,
      gainPct: calculateListingGainPercentage(
        i.listing_result!.issue_price,
        i.listing_result!.listing_price
      ),
      issuePrice: i.listing_result!.issue_price,
      listingPrice: i.listing_result!.listing_price,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Past IPOs & Historical Listing Performance
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl">
          Historical record of all closed and listed Indian public issues. Listing gains and losses are strictly calculated using actual verified exchange debut prices versus finalized issue prices.
        </p>
      </div>

      {/* Listing Performance Visual Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Listing Day Performance Comparison (% Return on Debut)
          </h2>
          <span className="text-xs text-slate-400">Green = Listing Premium · Red = Discount</span>
        </div>
        <ListingGainChart data={chartData} />
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search listed IPOs by company name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-slate-400 outline-none transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Tabs */}
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

          {/* Performance filter */}
          <select
            value={performanceFilter}
            onChange={(e) => setPerformanceFilter(e.target.value as any)}
            className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 outline-none hover:border-slate-300"
          >
            <option value="all">All Returns</option>
            <option value="gain">Listing Gain Only (Positive)</option>
            <option value="loss">Listing Loss / Discount (Negative)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 outline-none hover:border-slate-300 font-medium"
          >
            <option value="gain_desc">Highest Listing Gain (%)</option>
            <option value="gain_asc">Largest Listing Loss (%)</option>
            <option value="date_desc">Latest Listing Date</option>
            <option value="date_asc">Oldest Listing Date</option>
            <option value="size_desc">Largest Issue Size</option>
            <option value="name_asc">Company Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Historical Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Company Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Listing Date</th>
                <th className="py-3.5 px-4 text-right">Issue Size</th>
                <th className="py-3.5 px-4 text-right">Final Sub.</th>
                <th className="py-3.5 px-4 text-right">Issue Price</th>
                <th className="py-3.5 px-4 text-right">Listing Price</th>
                <th className="py-3.5 px-4 text-right">Day 1 Close</th>
                <th className="py-3.5 px-4 text-right">Listing Gain (₹)</th>
                <th className="py-3.5 px-4 text-right">Listing Gain (%)</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-sans">
                    No historical records found for this query.
                  </td>
                </tr>
              ) : (
                list.map((ipo) => {
                  const res = ipo.listing_result;
                  if (!res) return null;

                  const gainInRupees = calculateListingGain(res.issue_price, res.listing_price);
                  const gainPercentage = calculateListingGainPercentage(
                    res.issue_price,
                    res.listing_price
                  );

                  return (
                    <tr key={ipo.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-semibold text-slate-900">
                          {ipo.company?.name || ipo.slug}
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          {ipo.exchange}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                          <a
                            href={getValidDocUrl(ipo.rhp_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 hover:text-blue-900 font-semibold hover:underline flex items-center gap-0.5"
                            title="Red Herring Prospectus (SEBI Filing)"
                          >
                            <span>RHP</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                          <span>·</span>
                          <a
                            href={getValidDocUrl(ipo.drhp_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-0.5"
                            title="Draft Red Herring Prospectus (SEBI Filing)"
                          >
                            <span>DRHP</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-sans text-slate-700">{ipo.category}</td>

                      <td className="py-3.5 px-4 font-sans text-slate-700">
                        {formatIndianDate(res.listing_date)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-800">
                        {formatCrores(ipo.issue_size)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                        {ipo.latest_subscription
                          ? `${ipo.latest_subscription.total_multiple.toFixed(2)}x`
                          : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        ₹{res.issue_price}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ₹{res.listing_price}
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-700">
                        {res.first_day_close ? `₹${res.first_day_close}` : 'N/A'}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right font-bold ${
                          gainInRupees >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {gainInRupees >= 0 ? `+₹${gainInRupees}` : `-₹${Math.abs(gainInRupees)}`}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right font-bold ${
                          gainPercentage >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {gainPercentage >= 0 ? `+${gainPercentage}%` : `${gainPercentage}%`}
                      </td>

                      <td className="py-3.5 px-4 text-center font-sans">
                        <button
                          onClick={() => navigate(`/ipo/${ipo.slug}`)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          View
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
    </div>
  );
};
