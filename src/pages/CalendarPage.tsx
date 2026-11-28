import React, { useState, useEffect } from 'react';
import { IPOCategory } from '../types/ipo';
import { api } from '../lib/api';
import { formatIndianDate } from '../lib/calculations';
import { useSitePageContent } from '../lib/siteContent';
import { PageNoticeBanner, PageExtraSections } from '../components/PageCustomSections';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  ExternalLink,
  Layers,
} from 'lucide-react';

interface CalendarEventItem {
  ipo_id: string;
  company_name: string;
  slug: string;
  category: IPOCategory;
  event_type: string;
  event_date: string;
  status: string;
}

interface CalendarPageProps {
  navigate: (route: string) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ navigate }) => {
  const pageContent = useSitePageContent('calendar');
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'chronological' | 'month'>('chronological');
  const [categoryFilter, setCategoryFilter] = useState<IPOCategory | 'all'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  // Month navigation for monthly view
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      try {
        const data = await api.getCalendarEvents();
        setEvents(data);
      } catch (err) {
        console.error('Failed to load calendar events', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (eventTypeFilter !== 'all' && e.event_type !== eventTypeFilter) return false;
    return true;
  });

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const currentMonthShortcut = () => {
    setCurrentDate(new Date());
  };

  // Group events by month for chronological view
  const eventsByMonth: { [key: string]: CalendarEventItem[] } = {};
  filteredEvents.forEach((e) => {
    const d = new Date(e.event_date);
    const monthKey = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    if (!eventsByMonth[monthKey]) eventsByMonth[monthKey] = [];
    eventsByMonth[monthKey].push(e);
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6DFD3] pb-6">
        <div className="space-y-1">
          {pageContent.eyebrow && (
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A5B13]">
              {pageContent.eyebrow}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#1C1917] tracking-tight">
            {pageContent.title}
          </h1>
          {pageContent.subtitle && (
            <p className="text-base text-[#57534E] leading-relaxed">
              {pageContent.subtitle}
            </p>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#EFE9DD] border border-[#E6DFD3] rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('chronological')}
            className={`px-3.5 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'chronological'
                ? 'bg-[#14532D] text-white font-medium'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            {pageContent.custom_fields.schedule_tab_label || 'Schedule'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`px-3.5 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'month'
                ? 'bg-[#14532D] text-white font-medium'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            {pageContent.custom_fields.month_tab_label || 'Month Grid'}
          </button>
        </div>
      </div>

      <PageNoticeBanner
        title={pageContent.notice_banner_title}
        body={pageContent.notice_banner_body}
      />

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#E6DFD3] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
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
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-[#57534E]">Filter Event:</span>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="text-sm bg-[#FAF7F1] border border-[#DFD6C7] rounded-lg px-3 py-2 text-[#1C1917] outline-none focus:border-[#14532D] focus:bg-white"
          >
            <option value="all">All Events</option>
            <option value="Issue Opens">Issue Opens</option>
            <option value="Issue Closes">Issue Closes</option>
            <option value="Basis of Allotment">Basis of Allotment</option>
            <option value="Initiation of Refunds">Initiation of Refunds</option>
            <option value="Credit of Shares to Demat">Credit to Demat</option>
            <option value="Listing Date">Listing Date</option>
          </select>
        </div>
      </div>

      {/* Main Calendar View Area */}
      {loading ? (
        <div className="bg-white border border-[#E6DFD3] rounded-xl p-12 text-center text-[#57534E] text-sm">
          Loading calendar schedule...
        </div>
      ) : viewMode === 'chronological' ? (
        <div className="space-y-8">
          {Object.keys(eventsByMonth).length === 0 ? (
            <div className="bg-white border border-[#E6DFD3] rounded-xl p-12 text-center text-[#57534E] text-sm">
              {pageContent.custom_fields.empty_state_text ||
                'No calendar events found for the active filter settings.'}
            </div>
          ) : (
            Object.entries(eventsByMonth).map(([month, monthEvents]) => (
              <div key={month} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-[#E6DFD3] pb-2">
                  <CalendarIcon className="w-4 h-4 text-[#14532D]" />
                  <h2 className="text-lg font-display font-semibold text-[#1C1917]">{month}</h2>
                  <span className="text-xs text-[#78716C]">({monthEvents.length} events)</span>
                </div>

                <div className="overflow-x-auto bg-white border border-[#E6DFD3] rounded-xl shadow-2xs custom-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#FAF6EE] border-b border-[#E6DFD3] text-[#57534E] font-semibold text-xs">
                      <tr>
                        <th className="py-3 px-4">Event Date</th>
                        <th className="py-3 px-3">Company</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Milestone Event</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2ECE1] bg-white">
                      {monthEvents.map((evt, idx) => (
                        <tr
                          key={`${evt.ipo_id}-${evt.event_type}-${idx}`}
                          onClick={() => navigate(`/ipo/${evt.slug}`)}
                          className="hover:bg-[#FAF7F1] transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 font-mono tabular-nums text-xs sm:text-sm text-[#1C1917] whitespace-nowrap">
                            {formatIndianDate(evt.event_date)}
                          </td>
                          <td className="py-3.5 px-3 font-medium text-[#1C1917] group-hover:text-[#14532D]">
                            {evt.company_name}
                          </td>
                          <td className="py-3.5 px-3 text-[#57534E]">
                            <span className={evt.category === 'SME' ? 'text-[#9A5B13] font-medium' : 'text-[#14532D] font-medium'}>
                              {evt.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap font-medium text-[#1C1917]">
                            {evt.event_type}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/ipo/${evt.slug}`);
                              }}
                              className="px-3.5 py-1.5 bg-[#FAF7F1] border border-[#DFD6C7] hover:bg-[#14532D] hover:border-[#14532D] hover:text-white text-[#1C1917] text-sm font-medium rounded-lg transition-colors"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#E6DFD3] rounded-xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#EFE9DD]">
            <h2 className="text-lg font-display font-semibold text-[#1C1917]">
              {currentDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={currentMonthShortcut}
                className="text-sm px-3 py-1.5 border border-[#DFD6C7] bg-[#FAF7F1] hover:bg-[#EFE9DD] text-[#1C1917] rounded-lg transition-colors font-medium"
              >
                Today
              </button>
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 border border-[#DFD6C7] hover:bg-[#FAF7F1] rounded-lg text-[#57534E]"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-2 border border-[#DFD6C7] hover:bg-[#FAF7F1] rounded-lg text-[#57534E]"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-[#E6DFD3] border border-[#E6DFD3] rounded-xl overflow-hidden text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="bg-[#FAF6EE] p-2.5 text-center font-semibold text-[#57534E] text-xs">
                {d}
              </div>
            ))}
            {(() => {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const totalDays = new Date(year, month + 1, 0).getDate();
              const cells = [];

              for (let i = 0; i < firstDay; i++) {
                cells.push(
                  <div key={`empty-${i}`} className="bg-[#FAF8F4] min-h-[90px] p-2 opacity-60" />
                );
              }

              for (let day = 1; day <= totalDays; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = filteredEvents.filter((e) => e.event_date.startsWith(dateStr));
                const isToday =
                  new Date().toDateString() === new Date(year, month, day).toDateString();

                cells.push(
                  <div
                    key={`day-${day}`}
                    className={`bg-white min-h-[90px] p-2 space-y-1 hover:bg-[#FAF7F1] transition-colors ${
                      isToday ? 'ring-2 ring-[#14532D] ring-inset bg-[#EEF6F0]/40' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-mono tabular-nums ${isToday ? 'font-bold text-[#14532D]' : 'text-[#57534E]'}`}>
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-xs font-mono text-[#9A5B13] font-semibold">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt, eIdx) => (
                        <div
                          key={eIdx}
                          onClick={() => navigate(`/ipo/${evt.slug}`)}
                          className="text-xs truncate bg-[#FAF6EE] border border-[#E6DFD3] text-[#1C1917] px-1.5 py-0.5 rounded cursor-pointer hover:border-[#14532D]"
                          title={`${evt.company_name} - ${evt.event_type}`}
                        >
                          {evt.company_name}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-[#78716C] text-center">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return cells;
            })()}
          </div>
        </div>
      )}

      <PageExtraSections sections={pageContent.extra_sections} />
    </div>
  );
};
