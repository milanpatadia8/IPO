import React from 'react';
import { GMPSnapshot } from '../types/ipo';
import {
  calculateIndicativeListingPrice,
  calculateIndicativeGainPercentage,
  isObservationStale,
  formatIndianTimestamp,
  getFireRatingInfo,
} from '../lib/calculations';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface GMPDisplayProps {
  latestGmp?: GMPSnapshot;
  previousGmp?: GMPSnapshot;
  basePrice?: number;
  compact?: boolean;
}

export const GMPDisplay: React.FC<GMPDisplayProps> = ({
  latestGmp,
  previousGmp,
  basePrice,
  compact = false,
}) => {
  if (!latestGmp) {
    return <span className="text-[#4B5563] text-sm">—</span>;
  }

  const gmpAmount = latestGmp.gmp_amount;
  const indicativeGainPct = calculateIndicativeGainPercentage(basePrice, gmpAmount);
  const { price: estListingPrice } = calculateIndicativeListingPrice(basePrice, gmpAmount);

  let changeAmount: number | null = null;
  if (previousGmp && previousGmp.gmp_amount !== undefined) {
    changeAmount = gmpAmount - previousGmp.gmp_amount;
  }

  const isStale = isObservationStale(latestGmp.observed_at, 24);
  const demandInfo = latestGmp.fire_rating ? getFireRatingInfo(latestGmp.fire_rating) : null;

  if (compact) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <div className="flex items-center gap-1.5 tabular-nums text-sm">
          <span className="font-semibold text-[#111827]">₹{gmpAmount}</span>
          {indicativeGainPct !== null && (
            <span
              className={`font-medium ${
                indicativeGainPct > 0
                  ? 'text-[#16A34A]'
                  : indicativeGainPct < 0
                  ? 'text-[#DC2626]'
                  : 'text-[#4B5563]'
              }`}
            >
              ({indicativeGainPct > 0 ? '+' : ''}
              {indicativeGainPct}%)
            </span>
          )}
        </div>
        {isStale && <span className="text-xs text-[#D97706]">Stale quote</span>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-[#111827]">
          ₹{gmpAmount}
        </span>
        <span className="text-sm text-[#4B5563]">per share</span>

        {indicativeGainPct !== null && (
          <span
            className={`text-sm font-semibold tabular-nums ${
              indicativeGainPct > 0
                ? 'text-[#16A34A]'
                : indicativeGainPct < 0
                ? 'text-[#DC2626]'
                : 'text-[#4B5563]'
            }`}
          >
            {indicativeGainPct > 0 ? '+' : ''}
            {indicativeGainPct}%
          </span>
        )}
      </div>

      {estListingPrice && (
        <div className="text-sm text-[#4B5563] tabular-nums">
          <span>Est. Listing: </span>
          <span className="font-semibold text-[#111827]">₹{estListingPrice}</span>
        </div>
      )}

      {(latestGmp.kostak_rate || latestGmp.subject_to_sauda_rate || demandInfo) && (
        <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-[#4B5563]">
          {latestGmp.kostak_rate && (
            <span className="tabular-nums">
              <span>Kostak: </span>
              <strong className="font-medium text-[#111827]">₹{latestGmp.kostak_rate}</strong>
            </span>
          )}
          {latestGmp.subject_to_sauda_rate && (
            <span className="tabular-nums">
              <span>Sauda: </span>
              <strong className="font-medium text-[#111827]">₹{latestGmp.subject_to_sauda_rate}</strong>
            </span>
          )}
          {demandInfo && (
            <span>
              Demand: <strong className="font-medium text-[#111827]">{demandInfo.label}</strong>
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-[#4B5563] pt-0.5">
        {changeAmount !== null && changeAmount !== 0 && (
          <span
            className={`tabular-nums flex items-center gap-0.5 ${
              changeAmount > 0 ? 'text-[#16A34A] font-medium' : 'text-[#DC2626] font-medium'
            }`}
          >
            {changeAmount > 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {changeAmount > 0 ? `+₹${changeAmount}` : `-₹${Math.abs(changeAmount)}`} vs prev
          </span>
        )}

        <span aria-hidden="true">·</span>
        <span>{latestGmp.source_name}</span>

        {isStale ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-[#D97706] flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Older than 24h</span>
            </span>
          </>
        ) : (
          <>
            <span aria-hidden="true">·</span>
            <span>{formatIndianTimestamp(latestGmp.observed_at)}</span>
          </>
        )}
      </div>
    </div>
  );
};
