import React, { useState, useMemo } from 'react';
import { IPO } from '../types/ipo';
import {
  calculateIPOProfit,
  getEffectiveMinInvestment,
  getFireRatingInfo,
} from '../lib/calculations';
import { Calculator, ShieldAlert } from 'lucide-react';

interface IPOProfitCalculatorProps {
  ipos: IPO[];
  preselectedSlug?: string;
  compact?: boolean;
}

export const IPOProfitCalculator: React.FC<IPOProfitCalculatorProps> = ({
  ipos,
  preselectedSlug,
}) => {
  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    if (preselectedSlug) return preselectedSlug;
    const withGmp = ipos.filter((i) => i.latest_gmp);
    return withGmp[0]?.slug || ipos[0]?.slug || '';
  });

  const [lots, setLots] = useState<number>(1);

  const selectedIpo = useMemo(() => {
    return ipos.find((i) => i.slug === selectedSlug) || ipos[0];
  }, [ipos, selectedSlug]);

  const lotSize = selectedIpo?.lot_size || 100;
  const basePrice = selectedIpo?.price_band_max || selectedIpo?.issue_price || 100;
  const gmpAmount = selectedIpo?.latest_gmp?.gmp_amount ?? 0;
  const customMinAmt = selectedIpo?.min_investment_multiples?.min_amount;
  const customMultAmt = selectedIpo?.min_investment_multiples?.multiple_amount;
  const effectiveMinInv = selectedIpo ? getEffectiveMinInvestment(selectedIpo) : null;

  const result = useMemo(() => {
    const baseCalc = calculateIPOProfit(lotSize, lots, basePrice, gmpAmount);
    if (customMinAmt && customMinAmt > 0) {
      const stepAmt = customMultAmt && customMultAmt > 0 ? customMultAmt : customMinAmt;
      const totalInvestment = Number((customMinAmt + Math.max(0, lots - 1) * stepAmt).toFixed(2));
      const estimatedProfit = baseCalc.estimatedProfit;
      const totalEstimatedValue = Number((totalInvestment + estimatedProfit).toFixed(2));
      const roiPercentage =
        totalInvestment > 0 ? Number(((estimatedProfit / totalInvestment) * 100).toFixed(2)) : 0;
      return {
        ...baseCalc,
        totalInvestment,
        totalEstimatedValue,
        roiPercentage,
      };
    }
    return baseCalc;
  }, [lotSize, lots, basePrice, gmpAmount, customMinAmt, customMultAmt]);

  const fireInfo = selectedIpo?.latest_gmp?.fire_rating
    ? getFireRatingInfo(selectedIpo.latest_gmp.fire_rating)
    : null;

  const kostakYield = selectedIpo?.latest_gmp?.kostak_rate
    ? selectedIpo.latest_gmp.kostak_rate * lots
    : null;

  const saudaYield = selectedIpo?.latest_gmp?.subject_to_sauda_rate
    ? selectedIpo.latest_gmp.subject_to_sauda_rate * lots
    : null;

  const presetLots = [
    { label: '1 Lot (Retail)', value: 1 },
    { label: '2 Lots', value: 2 },
    { label: '5 Lots', value: 5 },
    { label: '14 Lots (sHNI)', value: 14 },
    { label: '30 Lots (bHNI)', value: 30 },
  ];

  if (!selectedIpo) return null;

  return (
    <div className="bg-white border border-[#E6DFD3] rounded-xl p-5 sm:p-6 space-y-6 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE9DD] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#57534E]">
            <span className="font-semibold uppercase tracking-wider text-[#9A5B13]">
              Return Estimator
            </span>
            {fireInfo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#15803D] font-medium">Demand: {fireInfo.label}</span>
              </>
            )}
          </div>
          <h3 className="text-lg font-display font-semibold text-[#1C1917] flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#14532D]" />
            <span>IPO Capital &amp; Unlisted Price Return Estimator</span>
          </h3>
          <p className="text-sm text-[#57534E]">
            Estimate capital required, indicative return based on unlisted price spread, and projected ROI.
          </p>
        </div>

        {/* IPO Selector Dropdown */}
        <div className="w-full sm:w-64">
          <label className="block text-xs font-medium text-[#57534E] mb-1">
            Selected Issue
          </label>
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="w-full h-10 px-3 text-sm bg-[#FAF7F1] border border-[#DFD6C7] focus:border-[#14532D] focus:bg-white rounded-lg outline-none text-[#1C1917] font-medium transition-colors"
          >
            {ipos.map((i) => (
              <option key={i.slug} value={i.slug}>
                {i.company?.name || i.slug} {i.latest_gmp ? `(Unlisted Spread: ₹${i.latest_gmp.gmp_amount})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lot Controls & Presets */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <label className="font-medium text-[#1C1917]">
            Lots Applied: <strong className="text-base font-mono tabular-nums">{lots}</strong> ({lots * lotSize} shares)
          </label>
          <span className="text-xs text-[#57534E] font-mono tabular-nums">
            {effectiveMinInv
              ? `Min Investment: ₹${effectiveMinInv.toLocaleString('en-IN')} · ${lotSize} shares @ ₹${basePrice}`
              : `1 Lot = ${lotSize} shares @ ₹${basePrice}`}
          </span>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {presetLots.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setLots(preset.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors border ${
                lots === preset.value
                  ? 'bg-[#14532D] border-[#14532D] text-white font-medium'
                  : 'bg-[#FAF7F1] border-[#E6DFD3] text-[#57534E] hover:bg-[#EFE9DD] hover:text-[#1C1917]'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[#57534E]">Custom:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={lots}
              onChange={(e) => setLots(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-16 h-9 px-2 text-sm font-mono border border-[#DFD6C7] bg-[#FAF7F1] focus:bg-white rounded-lg text-center tabular-nums outline-none focus:border-[#14532D]"
            />
          </div>
        </div>
      </div>

      {/* Primary Calculated Return Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#FAF6EE] border border-[#E6DFD3] rounded-xl font-mono tabular-nums">
        <div>
          <span className="font-sans text-xs text-[#57534E] block mb-1">
            Total Investment
          </span>
          <div className="text-lg font-semibold text-[#1C1917]">
            ₹{result.totalInvestment.toLocaleString('en-IN')}
          </div>
          <span className="font-sans text-xs text-[#78716C]">
            Blocked via UPI
          </span>
        </div>

        <div>
          <span className="font-sans text-xs text-[#57534E] block mb-1">
            Est. Return (Unlisted)
          </span>
          <div className={`text-lg font-semibold ${result.estimatedProfit >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
            {result.estimatedProfit >= 0 ? '+' : ''}₹{result.estimatedProfit.toLocaleString('en-IN')}
          </div>
          <span className={`font-sans text-xs font-medium ${gmpAmount >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
            {gmpAmount > 0 ? `+₹${gmpAmount}/share` : 'No spread'}
          </span>
        </div>

        <div>
          <span className="font-sans text-xs text-[#57534E] block mb-1">
            Est. Debut Value
          </span>
          <div className="text-lg font-semibold text-[#1C1917]">
            ₹{result.totalEstimatedValue.toLocaleString('en-IN')}
          </div>
          <span className="font-sans text-xs text-[#78716C]">
            Issue + Estimated Gain
          </span>
        </div>

        <div>
          <span className="font-sans text-xs text-[#57534E] block mb-1">
            Indicative ROI
          </span>
          <div className={`text-lg font-semibold ${result.roiPercentage >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
            {result.roiPercentage >= 0 ? '+' : ''}{result.roiPercentage}%
          </div>
          <span className="font-sans text-xs text-[#78716C]">
            Expected listing gain
          </span>
        </div>
      </div>

      {/* Pre-Listing Indicative Quote Scenarios */}
      {(kostakYield || saudaYield) && (
        <div className="p-4 bg-white border border-[#E6DFD3] rounded-xl space-y-3 text-sm">
          <div className="flex items-center justify-between text-xs font-medium text-[#1C1917] border-b border-[#EFE9DD] pb-2">
            <span className="text-[#57534E]">Pre-Listing Reference Scenarios</span>
            <span className="text-[#78716C] font-normal">Based on {lots} lot(s)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
            {kostakYield !== null && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAF7F1] border border-[#E6DFD3]">
                <div>
                  <span className="font-medium text-[#1C1917] block">Application Quote Value</span>
                  <span className="text-xs text-[#57534E]">Indicative per-application figure</span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-base text-[#1C1917]">
                  ₹{kostakYield.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {saudaYield !== null && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAF7F1] border border-[#E6DFD3]">
                <div>
                  <span className="font-medium text-[#1C1917] block">Allotment-Linked Quote</span>
                  <span className="text-xs text-[#57534E]">Indicative value upon share allotment</span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-base text-[#15803D]">
                  ₹{saudaYield.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statutory Disclaimer */}
      <div className="flex items-start gap-2 text-xs text-[#57534E] leading-relaxed pt-1">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#9A5B13]" />
        <span>
          As per SEBI guidelines, we do not display Grey Market Premium (GMP). Unlisted price references shown above are strictly informational indicators; actual listing prices are determined solely by exchange demand on listing day.
        </span>
      </div>
    </div>
  );
};
