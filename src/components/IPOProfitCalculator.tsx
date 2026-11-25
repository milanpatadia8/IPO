import React, { useState, useMemo } from 'react';
import { IPO } from '../types/ipo';
import { calculateIPOProfit, getFireRatingInfo, formatINR } from '../lib/calculations';
import { Calculator, TrendingUp, ShieldAlert, Sparkles, Check } from 'lucide-react';

interface IPOProfitCalculatorProps {
  ipos: IPO[];
  preselectedSlug?: string;
  compact?: boolean;
}

export const IPOProfitCalculator: React.FC<IPOProfitCalculatorProps> = ({
  ipos,
  preselectedSlug,
  compact = false,
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

  const result = useMemo(() => {
    return calculateIPOProfit(lotSize, lots, basePrice, gmpAmount);
  }, [lotSize, lots, basePrice, gmpAmount]);

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
    <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAEAEA] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#4B5563]">
            <span className="font-medium text-[#111827]">Return Estimator</span>
            {fireInfo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#16A34A] font-medium">Demand: {fireInfo.label}</span>
              </>
            )}
          </div>
          <h3 className="text-lg font-semibold text-[#111827] flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#111827]" />
            <span>IPO Profit &amp; GMP Return Estimator</span>
          </h3>
          <p className="text-sm text-[#4B5563]">
            Estimate capital required, expected debut profit from grey market premium, and indicative ROI.
          </p>
        </div>

        {/* IPO Selector Dropdown */}
        <div className="w-full sm:w-64">
          <label className="block text-xs font-medium text-[#4B5563] mb-1">
            Selected Issue
          </label>
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-[#111827] font-medium transition-colors"
          >
            {ipos.map((i) => (
              <option key={i.slug} value={i.slug}>
                {i.company?.name || i.slug} {i.latest_gmp ? `(GMP: ₹${i.latest_gmp.gmp_amount})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lot Controls & Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <label className="font-medium text-[#111827]">
            Lots Applied: <strong className="text-base tabular-nums">{lots}</strong> ({lots * lotSize} shares)
          </label>
          <span className="text-xs text-[#4B5563] tabular-nums">
            1 Lot = {lotSize} shares @ ₹{basePrice}
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
                  ? 'bg-[#111827] border-[#111827] text-white font-medium'
                  : 'bg-white border-[#E5E7EB] text-[#4B5563] hover:bg-[#FAFAFA] hover:text-[#111827]'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[#4B5563]">Custom:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={lots}
              onChange={(e) => setLots(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-16 h-9 px-2 text-sm border border-[#E5E7EB] rounded-lg text-center tabular-nums outline-none focus:border-[#111827]"
            />
          </div>
        </div>
      </div>

      {/* Primary Calculated Return Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl tabular-nums">
        <div>
          <span className="text-xs text-[#4B5563] block mb-1">
            Total Investment
          </span>
          <div className="text-lg font-semibold text-[#111827]">
            ₹{result.totalInvestment.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-[#6B7280]">
            Blocked via UPI
          </span>
        </div>

        <div>
          <span className="text-xs text-[#4B5563] block mb-1">
            Est. Profit (GMP)
          </span>
          <div className={`text-lg font-semibold ${result.estimatedProfit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {result.estimatedProfit >= 0 ? '+' : ''}₹{result.estimatedProfit.toLocaleString('en-IN')}
          </div>
          <span className={`text-xs font-medium ${gmpAmount >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {gmpAmount > 0 ? `+₹${gmpAmount}/share` : 'No premium'}
          </span>
        </div>

        <div>
          <span className="text-xs text-[#4B5563] block mb-1">
            Est. Debut Value
          </span>
          <div className="text-lg font-semibold text-[#111827]">
            ₹{result.totalEstimatedValue.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-[#6B7280]">
            Issue + Estimated Gain
          </span>
        </div>

        <div>
          <span className="text-xs text-[#4B5563] block mb-1">
            Indicative ROI
          </span>
          <div className={`text-lg font-semibold ${result.roiPercentage >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {result.roiPercentage >= 0 ? '+' : ''}{result.roiPercentage}%
          </div>
          <span className="text-xs text-[#6B7280]">
            Expected listing gain
          </span>
        </div>
      </div>

      {/* Kostak / Subject to Sauda Alternative Scenarios */}
      {(kostakYield || saudaYield) && (
        <div className="p-4 bg-white border border-[#EAEAEA] rounded-xl space-y-3 text-sm">
          <div className="flex items-center justify-between text-xs font-medium text-[#111827] border-b border-[#EAEAEA] pb-2">
            <span className="text-[#4B5563]">Grey Market Deal Alternatives (Kostak vs Sauda)</span>
            <span className="text-[#6B7280] font-normal">Based on {lots} lot(s)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
            {kostakYield !== null && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAFA] border border-[#EAEAEA]">
                <div>
                  <span className="font-medium text-[#111827] block">Kostak Realization</span>
                  <span className="text-xs text-[#4B5563]">Per application (allotment not required)</span>
                </div>
                <span className="tabular-nums font-semibold text-base text-[#111827]">
                  ₹{kostakYield.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {saudaYield !== null && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAFA] border border-[#EAEAEA]">
                <div>
                  <span className="font-medium text-[#111827] block">Subject to Sauda Yield</span>
                  <span className="text-xs text-[#4B5563]">Applicable if allotment is confirmed</span>
                </div>
                <span className="tabular-nums font-semibold text-base text-[#16A34A]">
                  ₹{saudaYield.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statutory Disclaimer */}
      <div className="flex items-start gap-2 text-xs text-[#4B5563] leading-relaxed pt-1">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#6B7280]" />
        <span>
          Grey Market Premium (GMP) and Kostak figures are unofficial over-the-counter observations. Actual listing prices are determined by exchange demand on listing morning.
        </span>
      </div>
    </div>
  );
};
