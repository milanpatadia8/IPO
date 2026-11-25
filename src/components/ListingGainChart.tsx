import React, { useMemo } from 'react';
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
import { IPO } from '../types/ipo';

export interface ListingPerformanceItem {
  company: string;
  gainPct: number;
  issuePrice: number;
  listingPrice: number;
}

export interface ListingGainChartProps {
  data?: ListingPerformanceItem[];
  ipos?: IPO[];
}

export const ListingGainChart: React.FC<ListingGainChartProps> = ({ data, ipos }) => {
  const chartData: ListingPerformanceItem[] = useMemo(() => {
    if (data && data.length > 0) return data;
    if (!ipos || ipos.length === 0) return [];
    return ipos
      .filter((ipo) => ipo.listing_result && ipo.listing_result.listing_price && (ipo.listing_result.issue_price || ipo.issue_price))
      .map((ipo) => {
        const issuePrice = ipo.listing_result?.issue_price || ipo.issue_price || ipo.price_band_max || 100;
        const listingPrice = ipo.listing_result?.listing_price || issuePrice;
        const gainPct = Math.round(((listingPrice - issuePrice) / issuePrice) * 1000) / 10;
        return {
          company: ipo.company?.name || ipo.slug,
          gainPct,
          issuePrice,
          listingPrice,
        };
      });
  }, [data, ipos]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center border border-dashed border-[#E5E7EB] rounded-xl text-[#4B5563] text-sm">
        No listing performance data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -16, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAEA" />
            <XAxis
              dataKey="company"
              stroke="#4B5563"
              fontSize={12}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              stroke="#4B5563"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as ListingPerformanceItem;
                  return (
                    <div className="bg-white border border-[#EAEAEA] rounded-lg p-3 shadow-sm text-sm space-y-1.5">
                      <div className="font-semibold text-[#111827]">{item.company}</div>
                      <div className="flex items-center justify-between gap-4 tabular-nums">
                        <span className="text-[#4B5563]">Issue Price:</span>
                        <span className="text-[#111827] font-medium">₹{item.issuePrice}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 tabular-nums">
                        <span className="text-[#4B5563]">Listing Price:</span>
                        <span className="text-[#111827] font-medium">₹{item.listingPrice}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 tabular-nums border-t border-[#EAEAEA] pt-1.5">
                        <span className="text-[#4B5563]">Listing Gain:</span>
                        <span
                          className={`font-semibold ${
                            item.gainPct >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
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
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.gainPct >= 0 ? '#16A34A' : '#DC2626'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between text-xs text-[#4B5563] pt-1">
        <span>Actual first-day listing gain/loss percentage</span>
        <span>Source: NSE / BSE Official Feeds</span>
      </div>
    </div>
  );
};

