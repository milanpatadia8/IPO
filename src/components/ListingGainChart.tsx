import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

interface ListingPerformanceItem {
  company: string;
  gainPct: number;
  issuePrice: number;
  listingPrice: number;
}

interface ListingGainChartProps {
  data: ListingPerformanceItem[];
}

export const ListingGainChart: React.FC<ListingGainChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
        No listing performance data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="company"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as ListingPerformanceItem;
                  return (
                    <div className="bg-slate-900 text-white p-2.5 rounded shadow-lg text-xs space-y-1">
                      <div className="font-semibold text-slate-200">{item.company}</div>
                      <div className="flex items-center justify-between gap-4 font-mono tabular-nums">
                        <span className="text-slate-400">Issue Price:</span>
                        <span>₹{item.issuePrice}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 font-mono tabular-nums">
                        <span className="text-slate-400">Listing Price:</span>
                        <span>₹{item.listingPrice}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 font-mono tabular-nums border-t border-slate-800 pt-1">
                        <span className="text-slate-400">Listing Gain:</span>
                        <span
                          className={`font-bold ${
                            item.gainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.gainPct >= 0 ? '+' : ''}
                          {item.gainPct}%
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="gainPct" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.gainPct >= 0 ? '#10b981' : '#f43f5e'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <span>Actual first-day listing gain/loss percentage</span>
        <span>Source: NSE / BSE Official Feeds</span>
      </div>
    </div>
  );
};
