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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Indian IPO Event Calendar
          </h1>
          <p className="text-sm text-slate-600">
            Chronological timetable of issue opens, bidding closes, allotment declarations, and exchange listings.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('chronological')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              viewMode === 'chronological'
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chronological Schedule
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              viewMode === 'month'
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Calendar
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md border border-slate-200">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              categoryFilter === 'all'
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Categories
          </button>
          <button
            onClick={() => setCategoryFilter('Mainboard')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              categoryFilter === 'Mainboard'
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mainboard
          </button>
          <button
            onClick={() => setCategoryFilter('SME')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              categoryFilter === 'SME'
                ? 'bg-white font-semibold text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SME Emerge
          </button>
        </div>

        {/* Event Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Event Stage:</span>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 outline-none hover:border-slate-300"
          >
            <option value="all">All Events</option>
            <option value="Issue Opens">Issue Opens</option>
            <option value="Issue Closes">Issue Closes</option>
            <option value="Basis of Allotment">Basis of Allotment</option>
            <option value="Exchange Listing">Exchange Listing</option>
          </select>
        </div>
      </div>

      {/* Chronological List View */}
      {viewMode === 'chronological' && (
        <div className="space-y-8">
          {Object.keys(eventsByMonth).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400 text-xs">
              No calendar events found for this filter.
            </div>
          ) : (
            Object.entries(eventsByMonth).map(([monthTitle, monthEvents]) => (
              <div key={monthTitle} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    {monthTitle}
                  </h3>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>

                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                  {monthEvents.map((ev, idx) => {
                    let badgeColor = 'text-slate-700 bg-slate-50 border-slate-200';
                    if (ev.event_type === 'Issue Opens')
                      badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                    if (ev.event_type === 'Issue Closes')
                      badgeColor = 'text-amber-800 bg-amber-50 border-amber-200';
                    if (ev.event_type === 'Exchange Listing')
                      badgeColor = 'text-indigo-700 bg-indigo-50 border-indigo-200';
                    if (ev.event_type === 'Basis of Allotment')
                      badgeColor = 'text-sky-700 bg-sky-50 border-sky-200';

                    return (
                      <div
                        key={`${ev.ipo_id}-${ev.event_type}-${idx}`}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-start sm:items-center gap-4">
                          <div className="w-24 shrink-0 font-mono tabular-nums text-xs font-semibold text-slate-900">
                            {formatIndianDate(ev.event_date)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeColor}`}
                              >
                                {ev.event_type}
                              </span>
                              <span className="text-xs font-medium text-slate-500">
                                {ev.category}
                              </span>
                            </div>
                            <h4
                              onClick={() => navigate(`/ipo/${ev.slug}`)}
                              className="text-sm font-bold text-slate-900 hover:text-slate-700 cursor-pointer mt-0.5"
                            >
                              {ev.company_name}
                            </h4>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/ipo/${ev.slug}`)}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 self-start sm:self-auto"
                        >
                          View Offering
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Monthly Interactive View */}
      {viewMode === 'month' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900">
                {currentDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={currentMonthShortcut}
                className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 px-2 py-0.5 rounded"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded overflow-hidden text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="bg-slate-50 py-2 font-semibold text-slate-600">
                {d}
              </div>
            ))}

            {/* Simple calendar days generator for current month */}
            {Array.from({ length: 35 }).map((_, i) => {
              const dayNum = i + 1;
              const curMonthStr = `${currentDate.getFullYear()}-${String(
                currentDate.getMonth() + 1
              ).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = filteredEvents.filter((e) => e.event_date === curMonthStr);

              return (
                <div
                  key={i}
                  className="bg-white min-h-[90px] p-1.5 text-left flex flex-col justify-between"
                >
                  <span className="font-mono tabular-nums text-[11px] text-slate-400 font-medium">
                    {dayNum <= 31 ? dayNum : ''}
                  </span>
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayEvents.map((ev, eIdx) => (
                      <div
                        key={eIdx}
                        onClick={() => navigate(`/ipo/${ev.slug}`)}
                        className="text-[10px] p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium truncate cursor-pointer"
                        title={`${ev.event_type}: ${ev.company_name}`}
                      >
                        {ev.event_type.split(' ')[0]}: {ev.company_name.split(' ')[0]}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
