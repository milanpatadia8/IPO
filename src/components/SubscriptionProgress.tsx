import React from 'react';
import { SubscriptionSnapshot } from '../types/ipo';
import { formatIndianTimestamp, isObservationStale } from '../lib/calculations';
import { AlertCircle } from 'lucide-react';

interface SubscriptionProgressProps {
  subscription?: SubscriptionSnapshot;
  compact?: boolean;
}

export const SubscriptionProgress: React.FC<SubscriptionProgressProps> = ({
  subscription,
  compact = false,
}) => {
  if (!subscription) {
    return <span className="text-[#78716C] text-sm">Awaiting Bids</span>;
  }

  const { retail_multiple, nii_multiple, qib_multiple, total_multiple, observed_at, day_number } =
    subscription;

  const isStale = isObservationStale(observed_at, 12);

  if (compact) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className="font-mono tabular-nums text-sm font-semibold text-[#1C1917]">
          {total_multiple.toFixed(2)}x
        </span>
        <span className="text-xs text-[#57534E] font-mono tabular-nums">
          R {retail_multiple}x · Q {qib_multiple}x · N {nii_multiple}x
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-mono font-semibold tabular-nums text-[#1C1917]">
            {total_multiple.toFixed(2)}x
          </span>
          <span className="text-sm font-normal text-[#57534E]">Total Subscribed</span>
        </div>
        {day_number && (
          <span className="text-sm font-medium text-[#14532D] font-mono tabular-nums">
            Day {day_number}
          </span>
        )}
      </div>

      {/* Progress Bars for Categories */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {/* QIB */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#57534E]">QIB (50%)</span>
            <span className="font-mono tabular-nums font-semibold text-[#1C1917]">
              {qib_multiple.toFixed(2)}x
            </span>
          </div>
          <div className="w-full bg-[#E6DFD3] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#14532D] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (qib_multiple / 20) * 100)}%` }}
            />
          </div>
        </div>

        {/* NII */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#57534E]">NII / HNI (15%)</span>
            <span className="font-mono tabular-nums font-semibold text-[#1C1917]">
              {nii_multiple.toFixed(2)}x
            </span>
          </div>
          <div className="w-full bg-[#E6DFD3] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#B45309] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (nii_multiple / 20) * 100)}%` }}
            />
          </div>
        </div>

        {/* Retail */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#57534E]">Retail (35%)</span>
            <span className="font-mono tabular-nums font-semibold text-[#1C1917]">
              {retail_multiple.toFixed(2)}x
            </span>
          </div>
          <div className="w-full bg-[#E6DFD3] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#15803D] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (retail_multiple / 20) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Observation freshness */}
      <div className="flex items-center gap-2 text-xs text-[#78716C] pt-0.5">
        <span>Observed {formatIndianTimestamp(observed_at)}</span>
        {isStale && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-[#B45309] flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Data may be delayed</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};
