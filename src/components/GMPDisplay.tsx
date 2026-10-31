import React from 'react';
import { GMPSnapshot } from '../types/ipo';
import {
  formatINR,
  calculateIndicativeListingPrice,
  calculateIndicativeGainPercentage,
  isObservationStale,
  formatIndianTimestamp,
} from '../lib/calculations';
import { TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';

interface GMPDisplayProps {
  latestGmp?: GMPSnapshot;
  previousGmp?: GMPSnapshot;
  basePrice?: number; // Issue price or price band upper limit
  compact?: boolean;
}

export const GMPDisplay: React.FC<GMPDisplayProps> = ({
  latestGmp,
  previousGmp,
  basePrice,
  compact = false,
}) => {
  if (!latestGmp) {
    return <span className="text-slate-400 font-mono text-xs">N/A</span>;
  }

  const gmpAmount = latestGmp.gmp_amount;
  const indicativeGainPct = calculateIndicativeGainPercentage(basePrice, gmpAmount);
  const { price: estListingPrice } = calculateIndicativeListingPrice(basePrice, gmpAmount);

  // Compare with previous quote
  let changeAmount: number | null = null;
  if (previousGmp && previousGmp.gmp_amount !== undefined) {
    changeAmount = gmpAmount - previousGmp.gmp_amount;
  }

  const isStale = isObservationStale(latestGmp.observed_at, 24);

  if (compact) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs">
          <span className="font-semibold text-slate-900">₹{gmpAmount}</span>
          {indicativeGainPct !== null && (
            <span
              className={`font-medium ${
                indicativeGainPct > 0
                  ? 'text-emerald-700'
                  : indicativeGainPct < 0
                  ? 'text-rose-700'
                  : 'text-slate-500'
              }`}
            >
              ({indicativeGainPct > 0 ? '+' : ''}
              {indicativeGainPct}%)
            </span>
          )}
        </div>
        {isStale && (
          <span className="text-[10px] text-amber-700">Stale observation</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
          ₹{gmpAmount}
        </span>
        <span className="text-xs text-slate-500 font-normal">per share</span>

        {indicativeGainPct !== null && (
          <span
            className={`text-sm font-semibold font-mono tabular-nums ${
              indicativeGainPct > 0
                ? 'text-emerald-700'
                : indicativeGainPct < 0
                ? 'text-rose-700'
                : 'text-slate-600'
            }`}
          >
            {indicativeGainPct > 0 ? '+' : ''}
            {indicativeGainPct}%
          </span>
        )}
      </div>

      {/* Indicative listing price */}
      {estListingPrice && (
        <div className="text-xs text-slate-600 font-mono tabular-nums">
          <span>Est. Listing Price: </span>
          <span className="font-semibold text-slate-900">₹{estListingPrice}</span>
          <span className="text-slate-400 text-[11px] font-sans ml-1">(Unofficial)</span>
        </div>
      )}

      {/* Kostak, Subject to Sauda & Fire Rating (IPO Premium metrics) */}
      {(latestGmp.kostak_rate || latestGmp.subject_to_sauda_rate || latestGmp.fire_rating) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {latestGmp.kostak_rate && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded text-[11px] font-mono">
              <span className="font-sans font-medium text-slate-500">Kostak:</span>
              <strong className="font-bold">₹{latestGmp.kostak_rate}</strong>
            </span>
          )}
          {latestGmp.subject_to_sauda_rate && (
            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-900 border border-indigo-200/80 px-2 py-0.5 rounded text-[11px] font-mono">
              <span className="font-sans font-medium text-slate-500">Subject to Sauda:</span>
              <strong className="font-bold">₹{latestGmp.subject_to_sauda_rate}</strong>
            </span>
          )}
          {latestGmp.fire_rating && (
            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200/80 px-2 py-0.5 rounded text-[11px]">
              <span className="font-medium text-slate-500">Demand:</span>
              <span>{'🔥'.repeat(latestGmp.fire_rating)}</span>
            </span>
          )}
        </div>
      )}

      {/* GMP Change & Freshness */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-0.5">
        {changeAmount !== null && changeAmount !== 0 && (
          <span
            className={`font-mono tabular-nums flex items-center gap-0.5 ${
              changeAmount > 0 ? 'text-emerald-700 font-medium' : 'text-rose-700 font-medium'
            }`}
          >
            {changeAmount > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {changeAmount > 0 ? `+₹${changeAmount}` : `-₹${Math.abs(changeAmount)}`} vs prev
          </span>
        )}

        <span className="text-slate-300" aria-hidden="true">·</span>
        <span>{latestGmp.source_name}</span>

        {isStale ? (
          <>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-amber-700 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3" />
              <span>Quote older than 24h</span>
            </span>
          </>
        ) : (
          <>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-slate-400">{formatIndianTimestamp(latestGmp.observed_at)}</span>
          </>
        )}
      </div>
    </div>
  );
};
