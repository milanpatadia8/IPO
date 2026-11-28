import React from 'react';
import { IPO } from '../types/ipo';
import { calculateIndicativeGainPercentage, getFireRatingInfo } from '../lib/calculations';
import { Flame, TrendingUp, ChevronRight } from 'lucide-react';

interface GMPTickerProps {
  ipos: IPO[];
  navigate: (route: string) => void;
}

export const GMPTicker: React.FC<GMPTickerProps> = ({ ipos, navigate }) => {
  const gmpItems = React.useMemo(() => {
    return ipos
      .filter((i) => i.latest_gmp && i.latest_gmp.gmp_amount !== undefined)
      .sort((a, b) => {
        const gainA = calculateIndicativeGainPercentage(a.price_band_max || a.issue_price, a.latest_gmp?.gmp_amount) || 0;
        const gainB = calculateIndicativeGainPercentage(b.price_band_max || b.issue_price, b.latest_gmp?.gmp_amount) || 0;
        return gainB - gainA;
      })
      .slice(0, 8);
  }, [ipos]);

  if (gmpItems.length === 0) return null;

  return (
    <div className="bg-[#fbfbfb] border-y border-[#eeeeee] py-2 px-4 overflow-hidden text-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Ticker Lead Label */}
        <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-[#e0e0e0]">
          <span className="w-2 h-2 rounded-full bg-[#2e7d32] animate-pulse" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#424242]">
            Unlisted Price Radar
          </span>
        </div>

        {/* Scrolling / Flex Items */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap py-0.5">
          {gmpItems.map((item) => {
            const gain = calculateIndicativeGainPercentage(
              item.price_band_max || item.issue_price,
              item.latest_gmp?.gmp_amount
            );
            const fire = getFireRatingInfo(item.latest_gmp?.fire_rating);

            return (
              <button
                key={item.id}
                onClick={() => navigate(`/ipo/${item.slug}`)}
                className="inline-flex items-center gap-2 hover:text-[#387ed1] transition-colors group text-left"
              >
                <span className="text-[11px]">{item.latest_gmp?.fire_rating && item.latest_gmp.fire_rating >= 4 ? '🔥' : '📈'}</span>
                <span className="font-medium text-[#424242] group-hover:text-[#387ed1]">
                  {item.company?.name || item.slug}
                </span>
                <span className="font-mono tabular-nums text-[#666666]">
                  ₹{item.latest_gmp?.gmp_amount}
                </span>
                {gain !== null && (
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      gain >= 0 ? 'text-[#2e7d32]' : 'text-[#df514c]'
                    }`}
                  >
                    ({gain >= 0 ? '+' : ''}{gain}%)
                  </span>
                )}
                <span className="text-[#e0e0e0]" aria-hidden="true">|</span>
              </button>
            );
          })}
        </div>

        {/* View All Unlisted Prices Link */}
        <button
          onClick={() => navigate('/ipo/unlisted-price')}
          className="shrink-0 text-[11px] font-medium text-[#387ed1] hover:underline flex items-center gap-0.5 pl-2"
        >
          <span>All Unlisted Prices</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
