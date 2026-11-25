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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2 border-b border-[#EAEAEA] pb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">
          Upcoming Indian IPOs
        </h1>
        <p className="text-base text-[#4B5563] max-w-2xl leading-relaxed">
          Companies that have filed draft offer documents (DRHP) or announced issue dates with SEBI, NSE, and BSE.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search upcoming companies, sectors, or DRHP filings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-sm bg-[#FAFAFA] border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-[#111827] transition-colors"
          />
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-[#111827] text-white font-medium'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter('Mainboard')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                categoryFilter === 'Mainboard'
                  ? 'bg-[#111827] text-white font-medium'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Mainboard
            </button>
            <button
              onClick={() => setCategoryFilter('SME')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                categoryFilter === 'SME'
                  ? 'bg-[#111827] text-white font-medium'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              SME
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
          <h2 className="text-lg font-semibold text-[#111827]">
            Upcoming Issues ({filtered.length})
          </h2>
          <span className="text-xs text-[#4B5563]">DRHP &amp; announced pipeline</span>
        </div>

        {loading ? (
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-10 text-center text-[#4B5563] text-sm">
            Loading upcoming issues...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-10 text-center text-[#4B5563] text-sm">
            No upcoming IPO records match the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white border border-[#EAEAEA] rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAFAFA] border-b border-[#EAEAEA] text-[#4B5563] font-semibold text-xs">
                <tr>
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-3">Expected Dates</th>
                  <th className="py-3.5 px-3 text-right">Price Band</th>
                  <th className="py-3.5 px-3 text-right">Est. Size</th>
                  <th className="py-3.5 px-3 text-right">Early GMP</th>
                  <th className="py-3.5 px-3">Stage</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA] bg-white">
                {filtered.map((ipo) => (
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
                        {ipo.company?.industry && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{ipo.company.industry}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-3 whitespace-nowrap tabular-nums text-sm text-[#111827]">
                      {ipo.open_date ? (
                        <div>{formatIndianDate(ipo.open_date)} – {formatIndianDate(ipo.close_date)}</div>
                      ) : (
                        <span className="text-[#4B5563]">Dates TBA</span>
                      )}
                    </td>

                    <td className="py-4 px-3 text-right tabular-nums whitespace-nowrap text-[#111827] font-medium">
                      {ipo.price_band_min && ipo.price_band_max
                        ? `₹${ipo.price_band_min} – ₹${ipo.price_band_max}`
                        : ipo.price_band_max
                        ? `₹${ipo.price_band_max}`
                        : 'TBA'}
                    </td>

                    <td className="py-4 px-3 text-right tabular-nums font-medium text-[#111827]">
                      {formatCrores(ipo.issue_size)}
                    </td>

                    <td className="py-4 px-3 text-right tabular-nums whitespace-nowrap">
                      {ipo.latest_gmp ? (
                        <span className={ipo.latest_gmp.gmp_amount >= 0 ? 'text-[#16A34A] font-medium' : 'text-[#DC2626] font-medium'}>
                          {ipo.latest_gmp.gmp_amount >= 0 ? `+₹${ipo.latest_gmp.gmp_amount}` : `-₹${Math.abs(ipo.latest_gmp.gmp_amount)}`}
                        </span>
                      ) : (
                        <span className="text-[#6B7280]">—</span>
                      )}
                    </td>

                    <td className="py-4 px-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${ipo.announcement_status === 'dates_announced' ? 'text-[#16A34A]' : 'text-[#4B5563]'}`}>
                        {ipo.announcement_status === 'dates_announced' ? 'Dates Confirmed' : 'DRHP Filed'}
                      </span>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
