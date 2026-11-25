import React, { useState, useEffect } from 'react';
import { IPOCategory } from '../types/ipo';
import { api } from '../lib/api';
import { formatIndianDate } from '../lib/calculations';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">
            IPO Event Calendar
          </h1>
          <p className="text-base text-[#4B5563] leading-relaxed">
            Chronological timetable of issue opens, closes, allotment declarations, and exchange listings.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-white border border-[#EAEAEA] rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setViewMode('chronological')}
            className={`px-3.5 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'chronological'
                ? 'bg-[#111827] text-white font-medium'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3.5 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'month'
                ? 'bg-[#111827] text-white font-medium'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            Month Grid
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              categoryFilter === 'all'
                ? 'bg-[#111827] text-white font-medium'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            All Categories
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

        <div className="flex items-center gap-2">
          <span className="text-sm text-[#4B5563]">Filter Event:</span>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="text-sm bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111827] outline-none focus:border-[#111827]"
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
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-12 text-center text-[#4B5563] text-sm">
          Loading calendar schedule...
        </div>
      ) : viewMode === 'chronological' ? (
        <div className="space-y-8">
          {Object.keys(eventsByMonth).length === 0 ? (
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-12 text-center text-[#4B5563] text-sm">
              No calendar events found for the active filter settings.
            </div>
          ) : (
            Object.entries(eventsByMonth).map(([month, monthEvents]) => (
              <div key={month} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2">
                  <CalendarIcon className="w-4 h-4 text-[#111827]" />
                  <h2 className="text-lg font-semibold text-[#111827]">{month}</h2>
                  <span className="text-xs text-[#4B5563]">({monthEvents.length} events)</span>
                </div>

                <div className="overflow-x-auto bg-white border border-[#EAEAEA] rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#FAFAFA] border-b border-[#EAEAEA] text-[#4B5563] font-semibold text-xs">
                      <tr>
                        <th className="py-3 px-4">Event Date</th>
                        <th className="py-3 px-3">Company</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Milestone Event</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAEAEA] bg-white">
                      {monthEvents.map((evt, idx) => (
                        <tr
                          key={`${evt.ipo_id}-${evt.event_type}-${idx}`}
                          onClick={() => navigate(`/ipo/${evt.slug}`)}
                          className="hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 tabular-nums text-[#111827] whitespace-nowrap">
                            {formatIndianDate(evt.event_date)}
                          </td>
                          <td className="py-3.5 px-3 font-medium text-[#111827]">
                            {evt.company_name}
                          </td>
                          <td className="py-3.5 px-3 text-[#4B5563]">
                            {evt.category}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap font-medium text-[#111827]">
                            {evt.event_type}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/ipo/${evt.slug}`);
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
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA]">
            <h2 className="text-lg font-semibold text-[#111827]">
              {currentDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={currentMonthShortcut}
                className="text-sm px-3 py-1.5 border border-[#E5E7EB] hover:bg-[#FAFAFA] text-[#111827] rounded-lg transition-colors font-medium"
              >
                Today
              </button>
              <button
                onClick={prevMonth}
                className="p-2 border border-[#E5E7EB] hover:bg-[#FAFAFA] rounded-lg text-[#4B5563]"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 border border-[#E5E7EB] hover:bg-[#FAFAFA] rounded-lg text-[#4B5563]"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-[#EAEAEA] border border-[#EAEAEA] rounded-xl overflow-hidden text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="bg-[#FAFAFA] p-2.5 text-center font-semibold text-[#4B5563] text-xs">
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
                  <div key={`empty-${i}`} className="bg-white min-h-[90px] p-2 opacity-30" />
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
                    className={`bg-white min-h-[90px] p-2 space-y-1 hover:bg-[#FAFAFA] transition-colors ${
                      isToday ? 'ring-1 ring-[#111827] ring-inset' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className={`tabular-nums ${isToday ? 'font-bold text-[#111827]' : 'text-[#4B5563]'}`}>
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-xs text-[#111827] font-medium">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt, eIdx) => (
                        <div
                          key={eIdx}
                          onClick={() => navigate(`/ipo/${evt.slug}`)}
                          className="text-xs truncate bg-[#FAFAFA] border border-[#EAEAEA] text-[#111827] px-1.5 py-0.5 rounded cursor-pointer hover:border-[#111827]"
                          title={`${evt.company_name} - ${evt.event_type}`}
                        >
                          {evt.company_name}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-[#4B5563] text-center">
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
    </div>
  );
};
