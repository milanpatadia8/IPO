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
    return <span className="text-slate-400 font-mono text-xs">Awaiting Bids</span>;
  }

  const { retail_multiple, nii_multiple, qib_multiple, total_multiple, observed_at, day_number } =
    subscription;

  const isStale = isObservationStale(observed_at, 12);

  if (compact) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
          {total_multiple.toFixed(2)}x
        </span>
        <span className="text-[10px] text-slate-500 font-mono tabular-nums">
          R: {retail_multiple}x · Q: {qib_multiple}x · N: {nii_multiple}x
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {total_multiple.toFixed(2)}x
          </span>
          <span className="text-xs font-medium text-slate-500">Total Subscribed</span>
        </div>
        {day_number && (
          <span className="text-xs font-medium text-slate-600">Day {day_number} Bidding</span>
        )}
      </div>

      {/* Progress Bars for Categories */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {/* QIB */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500 font-medium">QIB (50%)</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800">
              {qib_multiple.toFixed(2)}x
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (qib_multiple / 20) * 100)}%` }}
            />
          </div>
        </div>

        {/* NII */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500 font-medium">NII / HNI (15%)</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800">
              {nii_multiple.toFixed(2)}x
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (nii_multiple / 20) * 100)}%` }}
            />
          </div>
        </div>

        {/* Retail */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Retail (35%)</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800">
              {retail_multiple.toFixed(2)}x
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (retail_multiple / 20) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Observation freshness */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
        <span>Observed: {formatIndianTimestamp(observed_at)}</span>
        {isStale && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-amber-700 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3" />
              <span>Subscription data may be delayed</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};
