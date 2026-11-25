import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { SubscriptionSnapshot } from '../types/ipo';
import { formatIndianDate, formatIndianTimestamp } from '../lib/calculations';
import { TrendingUp, CheckCircle, Info, Calendar } from 'lucide-react';

interface SubscriptionTrendChartProps {
  history?: SubscriptionSnapshot[];
  openDate?: string;
  closeDate?: string;
  status?: string;
}

type ViewMode = 'all' | 'total_only' | 'institutions' | 'retail_nii';

interface CategoryToggleState {
  total: boolean;
  qib: boolean;
  nii: boolean;
  retail: boolean;
  employee: boolean;
}

export const SubscriptionTrendChart: React.FC<SubscriptionTrendChartProps> = ({
  history = [],
  openDate,
  closeDate,
  status,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [categories, setCategories] = useState<CategoryToggleState>({
    total: true,
    qib: true,
    nii: true,
    retail: true,
    employee: false,
  });

  // Sort chronologically
  const sortedHistory = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime()
    );
  }, [history]);

  // Check if any snapshot has employee quota subscribed
  const hasEmployeeBids = useMemo(() => {
    return sortedHistory.some((s) => (s.employee_multiple || 0) > 0);
  }, [sortedHistory]);

  // Format data points for Recharts
  const chartData = useMemo(() => {
    return sortedHistory.map((s, idx) => {
      const d = new Date(s.observed_at);
      const dateFormatted = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
      const dayLabel = s.day_number ? `Day ${s.day_number}` : `Obs ${idx + 1}`;

      return {
        id: s.id,
        label: `${dayLabel} (${dateFormatted})`,
        shortLabel: dayLabel,
        date: dateFormatted,
        timestamp: s.observed_at,
        dayNumber: s.day_number || idx + 1,
        total: Number(s.total_multiple.toFixed(2)),
        qib: Number(s.qib_multiple.toFixed(2)),
        nii: Number(s.nii_multiple.toFixed(2)),
        retail: Number(s.retail_multiple.toFixed(2)),
        employee: s.employee_multiple ? Number(s.employee_multiple.toFixed(2)) : 0,
      };
    });
  }, [sortedHistory]);

  const latest = sortedHistory[sortedHistory.length - 1];

  // Dynamic max for Y-Axis
  const maxMultiple = useMemo(() => {
    if (chartData.length === 0) return 5;
    const values = chartData.flatMap((d) => [d.total, d.qib, d.nii, d.retail]);
    const max = Math.max(...values, 1.2);
    return Math.ceil(max * 1.15);
  }, [chartData]);

  // Handle preset view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'all') {
      setCategories({ total: true, qib: true, nii: true, retail: true, employee: hasEmployeeBids });
    } else if (mode === 'total_only') {
      setCategories({ total: true, qib: false, nii: false, retail: false, employee: false });
    } else if (mode === 'institutions') {
      setCategories({ total: true, qib: true, nii: false, retail: false, employee: false });
    } else if (mode === 'retail_nii') {
      setCategories({ total: true, qib: false, nii: true, retail: true, employee: false });
    }
  };

  const toggleCategory = (key: keyof CategoryToggleState) => {
    setCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // If no data or upcoming
  if (chartData.length === 0) {
    return (
      <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl p-6 text-center space-y-2.5">
        <div className="w-9 h-9 rounded-lg bg-white border border-[#EAEAEA] flex items-center justify-center mx-auto text-[#6B7280]">
          <Calendar className="w-4 h-4 text-[#6B7280]" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-semibold text-[#111827]">Subscription Timeline Pending</h4>
          <p className="text-sm text-[#4B5563] max-w-md mx-auto">
            {status === 'upcoming'
              ? `Public bidding has not opened yet. Issue is scheduled to accept bids from ${
                  openDate ? formatIndianDate(openDate) : 'the announced date'
                } until ${closeDate ? formatIndianDate(closeDate) : 'close date'}.`
              : 'Day-wise bidding progression data from official exchange feeds (NSE/BSE) will appear here once observed.'}
          </p>
        </div>
        {openDate && (
          <div className="text-xs font-medium text-[#4B5563] tabular-nums pt-1">
            Bidding Window: {formatIndianDate(openDate)} to {formatIndianDate(closeDate)}
          </div>
        )}
      </div>
    );
  }

  const isSubscribed = latest && latest.total_multiple >= 1.0;

  return (
    <div className="space-y-4">
      {/* Top Controls & Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAEAEA]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#111827]">Demand Progression</span>
            <span className="text-[#D1D5DB]" aria-hidden="true">·</span>
            <span
              className={`text-sm font-medium tabular-nums ${
                isSubscribed ? 'text-[#16A34A]' : 'text-[#4B5563]'
              }`}
            >
              {isSubscribed
                ? `Subscribed ${latest.total_multiple.toFixed(2)}x`
                : `Active ${latest.total_multiple.toFixed(2)}x`}
            </span>
          </div>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Day-by-day subscription multiples across institutional and retail categories
          </p>
        </div>

        {/* View mode segmented buttons */}
        <div className="flex items-center gap-1 p-1 bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg self-start sm:self-auto">
          <button
            onClick={() => handleViewModeChange('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'all'
                ? 'bg-[#111827] text-white'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            All Categories
          </button>
          <button
            onClick={() => handleViewModeChange('total_only')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'total_only'
                ? 'bg-[#111827] text-white'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            Total Only
          </button>
          <button
            onClick={() => handleViewModeChange('institutions')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'institutions'
                ? 'bg-[#111827] text-white'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            QIB
          </button>
          <button
            onClick={() => handleViewModeChange('retail_nii')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'retail_nii'
                ? 'bg-[#111827] text-white'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            Retail &amp; NII
          </button>
        </div>
      </div>

      {/* Interactive Category Legend / Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <span className="text-xs text-[#4B5563] font-medium">Series:</span>

        {/* Total Multiple */}
        <button
          onClick={() => toggleCategory('total')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs tabular-nums transition-opacity border ${
            categories.total
              ? 'bg-white border-[#111827] text-[#111827] font-semibold'
              : 'bg-[#FAFAFA] border-[#EAEAEA] text-[#9CA3AF] opacity-60'
          }`}
          title="Toggle Total Demand line"
        >
          <span className="w-2.5 h-0.5 bg-[#111827] rounded-full" />
          <span>Total: {latest ? `${latest.total_multiple.toFixed(2)}x` : '-'}</span>
        </button>

        {/* QIB */}
        <button
          onClick={() => toggleCategory('qib')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs tabular-nums transition-opacity border ${
            categories.qib
              ? 'bg-white border-[#E5E7EB] text-[#111827] font-medium'
              : 'bg-[#FAFAFA] border-[#EAEAEA] text-[#9CA3AF] opacity-60'
          }`}
          title="Toggle QIB Institutional line"
        >
          <span className="w-2.5 h-0.5 bg-indigo-600 rounded-full" />
          <span>QIB: {latest ? `${latest.qib_multiple.toFixed(2)}x` : '-'}</span>
        </button>

        {/* NII */}
        <button
          onClick={() => toggleCategory('nii')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs tabular-nums transition-opacity border ${
            categories.nii
              ? 'bg-white border-[#E5E7EB] text-[#111827] font-medium'
              : 'bg-[#FAFAFA] border-[#EAEAEA] text-[#9CA3AF] opacity-60'
          }`}
          title="Toggle NII / HNI line"
        >
          <span className="w-2.5 h-0.5 bg-amber-600 rounded-full" />
          <span>NII: {latest ? `${latest.nii_multiple.toFixed(2)}x` : '-'}</span>
        </button>

        {/* Retail */}
        <button
          onClick={() => toggleCategory('retail')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs tabular-nums transition-opacity border ${
            categories.retail
              ? 'bg-white border-[#E5E7EB] text-[#111827] font-medium'
              : 'bg-[#FAFAFA] border-[#EAEAEA] text-[#9CA3AF] opacity-60'
          }`}
          title="Toggle Retail (RII) line"
        >
          <span className="w-2.5 h-0.5 bg-[#16A34A] rounded-full" />
          <span>Retail: {latest ? `${latest.retail_multiple.toFixed(2)}x` : '-'}</span>
        </button>

        {/* Employee (if present) */}
        {hasEmployeeBids && (
          <button
            onClick={() => toggleCategory('employee')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs tabular-nums transition-opacity border ${
              categories.employee
                ? 'bg-white border-[#E5E7EB] text-[#111827] font-medium'
                : 'bg-[#FAFAFA] border-[#EAEAEA] text-[#9CA3AF] opacity-60'
            }`}
            title="Toggle Employee reservation line"
          >
            <span className="w-2.5 h-0.5 bg-purple-600 rounded-full" />
            <span>Employee: {latest ? `${(latest.employee_multiple || 0).toFixed(2)}x` : '-'}</span>
          </button>
        )}
      </div>

      {/* Main Line Chart Canvas */}
      <div className="h-64 sm:h-72 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 25, left: -12, bottom: 5 }}
          >
            <defs>
              <linearGradient id="totalAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#111827" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#111827" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAEA" />

            <XAxis
              dataKey="shortLabel"
              stroke="#4B5563"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />

            <YAxis
              stroke="#4B5563"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, maxMultiple]}
              tickFormatter={(v) => `${v}x`}
            />

            {/* Reference line for 1.0x (Fully Subscribed threshold) */}
            <ReferenceLine
              y={1.0}
              stroke="#16A34A"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '1.0x Target',
                fill: '#16A34A',
                fontSize: 11,
                position: 'insideTopRight',
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3.5 rounded-lg shadow-xl text-sm space-y-2 min-w-[220px] border border-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-semibold text-slate-100">{item.label}</span>
                        <span className="text-xs text-slate-300">
                          {formatIndianTimestamp(item.timestamp).split(',')[1] || ''}
                        </span>
                      </div>

                      <div className="space-y-1.5 tabular-nums">
                        {categories.total && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-200 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                              Total Subscribed:
                            </span>
                            <span className="font-bold text-white">{item.total}x</span>
                          </div>
                        )}

                        {categories.qib && (
                          <div className="flex items-center justify-between text-indigo-300">
                            <span className="text-slate-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                              QIB (Institutions):
                            </span>
                            <span className="font-semibold">{item.qib}x</span>
                          </div>
                        )}

                        {categories.nii && (
                          <div className="flex items-center justify-between text-amber-300">
                            <span className="text-slate-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                              NII / HNI:
                            </span>
                            <span className="font-semibold">{item.nii}x</span>
                          </div>
                        )}

                        {categories.retail && (
                          <div className="flex items-center justify-between text-emerald-300">
                            <span className="text-slate-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                              Retail (RII):
                            </span>
                            <span className="font-semibold">{item.retail}x</span>
                          </div>
                        )}

                        {hasEmployeeBids && categories.employee && (
                          <div className="flex items-center justify-between text-purple-300">
                            <span className="text-slate-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                              Employee:
                            </span>
                            <span className="font-semibold">{item.employee}x</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-1.5 border-t border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                        <span>{item.total >= 1.0 ? '✓ Fully Subscribed' : 'Bidding in progress'}</span>
                        <span>Multiples of shares</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Total Multiple Line with Optional Area Shading in Total Only view */}
            {viewMode === 'total_only' && categories.total && (
              <Area
                type="monotone"
                dataKey="total"
                stroke="none"
                fill="url(#totalAreaGradient)"
              />
            )}

            {/* QIB Line */}
            {categories.qib && (
              <Line
                type="monotone"
                dataKey="qib"
                name="QIB"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3.5, fill: '#6366f1', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
              />
            )}

            {/* NII Line */}
            {categories.nii && (
              <Line
                type="monotone"
                dataKey="nii"
                name="NII"
                stroke="#d97706"
                strokeWidth={2}
                dot={{ r: 3.5, fill: '#d97706', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }}
              />
            )}

            {/* Retail Line */}
            {categories.retail && (
              <Line
                type="monotone"
                dataKey="retail"
                name="Retail"
                stroke="#059669"
                strokeWidth={2}
                dot={{ r: 3.5, fill: '#059669', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
              />
            )}

            {/* Employee Line */}
            {hasEmployeeBids && categories.employee && (
              <Line
                type="monotone"
                dataKey="employee"
                name="Employee"
                stroke="#9333ea"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={{ r: 3, fill: '#9333ea' }}
              />
            )}

            {/* Total Line (Rendered last so it sits on top) */}
            {categories.total && (
              <Line
                type="monotone"
                dataKey="total"
                name="Total"
                stroke="#111827"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#111827', strokeWidth: 1.5, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#111827', stroke: '#fff', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer with Contextual Indian Market Insights */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-[#4B5563] pt-2 border-t border-[#EAEAEA]">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
          <span>
            {chartData.length === 1
              ? 'Showing Day 1 observation. Institutional bids typically accelerate significantly on Day 3.'
              : 'Institutional (QIB) bidding typically accelerates on the final day of bidding.'}
          </span>
        </div>
        <div className="tabular-nums text-right">
          Source: NSE/BSE consolidated feed
        </div>
      </div>
    </div>
  );
};
