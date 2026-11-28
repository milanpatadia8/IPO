import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { GMPSnapshot } from '../types/ipo';
import { formatIndianDate } from '../lib/calculations';

interface GMPTrendChartProps {
  history?: GMPSnapshot[];
  basePrice?: number;
}

export const GMPTrendChart: React.FC<GMPTrendChartProps> = ({ history, basePrice }) => {
  if (!history || history.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center border border-dashed border-[#E5E7EB] rounded-xl text-[#4B5563] text-sm">
        No historical unlisted price snapshots recorded yet
      </div>
    );
  }

  // Format data points
  const data = history.map((snapshot) => {
    const d = new Date(snapshot.observed_at);
    const dateFormatted = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
    const gainPct = basePrice ? Number(((snapshot.gmp_amount / basePrice) * 100).toFixed(1)) : 0;

    return {
      date: dateFormatted,
      fullTime: snapshot.observed_at,
      gmp: snapshot.gmp_amount,
      source: snapshot.source_name,
      gainPct,
    };
  });

  return (
    <div className="w-full">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gmpGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#111827" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#111827" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAEA" />
            <XAxis
              dataKey="date"
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
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-[#111827] text-white p-3 rounded-lg shadow-lg text-sm space-y-1.5">
                      <div className="font-medium text-neutral-200">{item.date}</div>
                      <div className="flex items-center justify-between gap-4 tabular-nums">
                        <span className="text-neutral-300">Unlisted Spread:</span>
                        <span className="font-semibold text-white">₹{item.gmp}</span>
                      </div>
                      {basePrice && (
                        <div className="flex items-center justify-between gap-4 tabular-nums">
                          <span className="text-neutral-300">Est. Gain:</span>
                          <span className="font-semibold text-[#4ADE80]">+{item.gainPct}%</span>
                        </div>
                      )}
                      <div className="text-xs text-neutral-300 border-t border-neutral-800 pt-1.5 mt-1">
                        Source: {item.source}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="gmp"
              stroke="#111827"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#gmpGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between text-xs text-[#4B5563] pt-2 px-1">
        <span>Timeline of recorded unlisted price observations</span>
        <span>All amounts in INR</span>
      </div>
    </div>
  );
};
