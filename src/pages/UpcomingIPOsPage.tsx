import React, { useState, useEffect } from 'react';
import { IPO, IPOCategory, AnnouncementStatus } from '../types/ipo';
import { api } from '../lib/api';
import { StatusIndicator } from '../components/StatusIndicator';
import { GMPDisplay } from '../components/GMPDisplay';
import {
  formatINR,
  formatCrores,
  formatIndianDate,
  calculateMinApplication,
  getValidDocUrl,
  SEBI_PUBLIC_ISSUES_URL,
} from '../lib/calculations';
import { Search, FileText, ExternalLink, Calendar, AlertCircle } from 'lucide-react';

interface UpcomingIPOsPageProps {
  navigate: (route: string) => void;
}

export const UpcomingIPOsPage: React.FC<UpcomingIPOsPageProps> = ({ navigate }) => {
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IPOCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function loadUpcoming() {
      setLoading(true);
      try {
        const all = await api.getAllIPOs({ status: 'upcoming' });
        setIPOs(all);
      } catch (err) {
        console.error('Failed to load upcoming IPOs', err);
      } finally {
        setLoading(false);
      }
    }
    loadUpcoming();
  }, []);

  const filtered = ipos.filter((ipo) => {
    if (categoryFilter !== 'all' && ipo.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && ipo.announcement_status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = ipo.company?.name.toLowerCase().includes(q);
      const matchSlug = ipo.slug.toLowerCase().includes(q);
      if (!matchName && !matchSlug) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Upcoming Indian IPOs Pipeline
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl">
          Discover announced and expected initial public offerings. Officially confirmed dates and draft SEBI filings are clearly distinguished from market expectations.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search upcoming IPOs by company name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-slate-400 outline-none transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
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

          {/* Announcement Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 outline-none hover:border-slate-300"
          >
            <option value="all">All Announcement Stages</option>
            <option value="confirmed">Officially Confirmed</option>
            <option value="dates_announced">Dates Announced</option>
            <option value="expected">Expected / DRHP Filed</option>
            <option value="awaiting_details">Awaiting Details</option>
          </select>
        </div>
      </div>

      {/* SEBI Regulatory Filings Notice */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-blue-950">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Official SEBI Offer Documents:</strong> Access verified Red Herring Prospectuses (RHP) & Draft Red Herring Prospectuses (DRHP) directly via the official SEBI Public Issues portal.
          </span>
        </div>
        <a
          href={SEBI_PUBLIC_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium text-xs shadow-xs transition-colors whitespace-nowrap shrink-0"
        >
          <span>SEBI Public Issues Filings</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Upcoming Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Announcement Status</th>
                <th className="py-3 px-4">Expected Open</th>
                <th className="py-3 px-4">Expected Close</th>
                <th className="py-3 px-4 text-right">Price Band</th>
                <th className="py-3 px-4 text-right">Issue Size</th>
                <th className="py-3 px-4 text-right">Latest GMP</th>
                <th className="py-3 px-4">Official Links</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    No upcoming IPOs found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((ipo) => (
                  <tr key={ipo.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-semibold text-slate-900">
                        {ipo.company?.name || ipo.slug}
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        {ipo.company?.industry || 'Diversified'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-sans text-slate-700">
                      {ipo.category} ({ipo.exchange})
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <StatusIndicator
                        status={ipo.status}
                        announcementStatus={ipo.announcement_status}
                      />
                    </td>

                    <td className="py-3.5 px-4 font-sans text-slate-800">
                      {ipo.open_date ? (
                        <span>{formatIndianDate(ipo.open_date)}</span>
                      ) : (
                        <span className="text-slate-400">Not announced</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-sans text-slate-800">
                      {ipo.close_date ? (
                        <span>{formatIndianDate(ipo.close_date)}</span>
                      ) : (
                        <span className="text-slate-400">Not announced</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right text-slate-900">
                      {ipo.price_band_min && ipo.price_band_max
                        ? `₹${ipo.price_band_min} - ₹${ipo.price_band_max}`
                        : 'Not announced'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                      {ipo.issue_size ? formatCrores(ipo.issue_size) : 'Not announced'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <GMPDisplay
                        latestGmp={ipo.latest_gmp}
                        basePrice={ipo.price_band_max}
                        compact
                      />
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <div className="flex items-center gap-2 text-slate-600">
                        <a
                          href={getValidDocUrl(ipo.rhp_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                          title="View Red Herring Prospectus (SEBI Filing)"
                        >
                          <span>RHP</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <a
                          href={getValidDocUrl(ipo.drhp_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-700 hover:text-slate-900 hover:underline"
                          title="View Draft Red Herring Prospectus (SEBI Filing)"
                        >
                          <span>DRHP</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        {ipo.registrar_name ? (
                          ipo.registrar_url ? (
                            <a
                              href={ipo.registrar_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-600 hover:text-slate-900 text-[11px] truncate max-w-[100px] block hover:underline"
                              title={ipo.registrar_name}
                            >
                              {ipo.registrar_name.split(' ')[0]}
                            </a>
                          ) : (
                            <span className="text-slate-600 text-[11px] truncate max-w-[100px] block" title={ipo.registrar_name}>
                              {ipo.registrar_name.split(' ')[0]}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300 text-[11px]">Registrar TBA</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-sans">
                      <button
                        onClick={() => navigate(`/ipo/${ipo.slug}`)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
