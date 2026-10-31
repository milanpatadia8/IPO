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
      <div className="h-56 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
        No historical GMP snapshots recorded yet
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
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gmpGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-2.5 rounded shadow-lg text-xs space-y-1">
                      <div className="font-semibold text-slate-200">{item.date}</div>
                      <div className="flex items-center justify-between gap-4 font-mono tabular-nums">
                        <span className="text-slate-400">GMP Quote:</span>
                        <span className="font-bold text-sky-400">₹{item.gmp}</span>
                      </div>
                      {basePrice && (
                        <div className="flex items-center justify-between gap-4 font-mono tabular-nums">
                          <span className="text-slate-400">Est. Gain:</span>
                          <span className="font-bold text-emerald-400">+{item.gainPct}%</span>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 mt-1">
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
              stroke="#0284c7"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#gmpGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 px-1">
        <span>Timeline of accepted dealer observations</span>
        <span>All amounts in INR</span>
      </div>
    </div>
  );
};
