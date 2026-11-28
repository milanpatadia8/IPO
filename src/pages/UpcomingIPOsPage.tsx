import React, { useState, useEffect } from 'react';
import { IPO, IPOCategory } from '../types/ipo';
import { api } from '../lib/api';
import {
  formatCrores,
  formatIndianDate,
  getEffectiveMinInvestment,
} from '../lib/calculations';
import { useSitePageContent } from '../lib/siteContent';
import { PageNoticeBanner, PageExtraSections } from '../components/PageCustomSections';
import { Search } from 'lucide-react';

interface UpcomingIPOsPageProps {
  navigate: (route: string) => void;
}

export const UpcomingIPOsPage: React.FC<UpcomingIPOsPageProps> = ({ navigate }) => {
  const pageContent = useSitePageContent('upcoming');
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IPOCategory | 'all'>('all');

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
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = ipo.company?.name.toLowerCase().includes(q);
      const matchSlug = ipo.slug.toLowerCase().includes(q);
      const matchIndustry = (ipo.company?.industry || '').toLowerCase().includes(q);
      if (!matchName && !matchSlug && !matchIndustry) return false;
    }
    return true;
  });

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

      <PageNoticeBanner
        title={pageContent.notice_banner_title}
        body={pageContent.notice_banner_body}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E6DFD3] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={
              pageContent.custom_fields.search_placeholder ||
              'Search upcoming companies, sectors, or DRHP filings...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-sm bg-[#FAF7F1] border border-[#DFD6C7] focus:border-[#14532D] focus:bg-white rounded-lg outline-none text-[#1C1917] placeholder:text-[#78716C] transition-colors"
          />
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-3 pointer-events-none" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#EFE9DD] border border-[#E6DFD3] rounded-lg">
            {(['all', 'Mainboard', 'SME'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#14532D] text-white font-medium'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-2">
          <h2 className="text-lg font-display font-semibold text-[#1C1917]">
            {pageContent.custom_fields.list_section_heading || 'Upcoming Issues'} ({filtered.length})
          </h2>
          <span className="text-xs text-[#78716C]">
            {pageContent.custom_fields.list_section_sublabel || 'DRHP & announced pipeline'}
          </span>
        </div>

        {loading ? (
          <div className="bg-white border border-[#E6DFD3] rounded-xl p-10 text-center text-[#57534E] text-sm">
            Loading upcoming issues...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#E6DFD3] rounded-xl p-10 text-center text-[#57534E] text-sm">
            {pageContent.custom_fields.empty_state_text ||
              'No upcoming IPO records match the selected filter criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto bg-white border border-[#E6DFD3] rounded-xl shadow-2xs custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF6EE] border-b border-[#E6DFD3] text-[#57534E] font-semibold text-xs">
                <tr>
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-3">Expected Dates</th>
                  <th className="py-3.5 px-3 text-right">Price Band</th>
                  <th className="py-3.5 px-3 text-right">Min Investment</th>
                  <th className="py-3.5 px-3 text-right">Est. Size</th>
                  <th className="py-3.5 px-3 text-right">Unlisted Price</th>
                  <th className="py-3.5 px-3">Stage</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE1] bg-white">
                {filtered.map((ipo) => {
                  const minInv = getEffectiveMinInvestment(ipo);
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
                        <div className="text-xs text-[#57534E] flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span
                            className={
                              ipo.category === 'SME'
                                ? 'text-[#9A5B13] font-medium'
                                : 'text-[#14532D] font-medium'
                            }
                          >
                            {ipo.category}
                          </span>
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

                      <td className="py-4 px-3 whitespace-nowrap font-mono tabular-nums text-xs sm:text-sm text-[#1C1917]">
                        {ipo.open_date ? (
                          <div>{formatIndianDate(ipo.open_date)} – {formatIndianDate(ipo.close_date)}</div>
                        ) : (
                          <span className="font-sans text-[#78716C]">Dates TBA</span>
                        )}
                      </td>

                      <td className="py-4 px-3 text-right font-mono tabular-nums whitespace-nowrap text-[#1C1917] font-medium">
                        {ipo.price_band_min && ipo.price_band_max
                          ? `₹${ipo.price_band_min} – ₹${ipo.price_band_max}`
                          : ipo.price_band_max
                          ? `₹${ipo.price_band_max}`
                          : 'TBA'}
                      </td>

                      <td className="py-4 px-3 text-right font-mono tabular-nums whitespace-nowrap text-[#1C1917] font-medium">
                        {minInv ? `₹${minInv.toLocaleString('en-IN')}` : <span className="font-sans text-[#78716C]">TBA</span>}
                      </td>

                      <td className="py-4 px-3 text-right font-mono tabular-nums font-medium text-[#1C1917]">
                        {formatCrores(ipo.issue_size)}
                      </td>

                      <td className="py-4 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {ipo.latest_gmp ? (
                          <span className={ipo.latest_gmp.gmp_amount >= 0 ? 'text-[#15803D] font-medium' : 'text-[#B91C1C] font-medium'}>
                            {ipo.latest_gmp.gmp_amount >= 0 ? `+₹${ipo.latest_gmp.gmp_amount}` : `-₹${Math.abs(ipo.latest_gmp.gmp_amount)}`}
                          </span>
                        ) : (
                          <span className="text-[#78716C]">—</span>
                        )}
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap">
                        <span
                          className={`text-xs font-medium ${
                            ipo.announcement_status === 'dates_announced' || ipo.announcement_status === 'confirmed'
                              ? 'text-[#15803D]'
                              : 'text-[#9A5B13]'
                          }`}
                        >
                          {ipo.announcement_status === 'dates_announced'
                            ? 'Dates Confirmed'
                            : ipo.announcement_status === 'confirmed'
                            ? 'Approved'
                            : 'DRHP Filed'}
                        </span>
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
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PageExtraSections sections={pageContent.extra_sections} />
    </div>
  );
};
