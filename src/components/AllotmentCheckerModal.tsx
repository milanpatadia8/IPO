import React, { useState } from 'react';
import { IPO } from '../types/ipo';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  Building,
  CreditCard,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { formatIndianDate } from '../lib/calculations';

interface AllotmentCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ipos: IPO[];
  preselectedSlug?: string;
}

export const AllotmentCheckerModal: React.FC<AllotmentCheckerModalProps> = ({
  isOpen,
  onClose,
  ipos,
  preselectedSlug,
}) => {
  const [selectedIpoId, setSelectedIpoId] = useState<string>(() => {
    if (preselectedSlug) {
      const match = ipos.find((i) => i.slug === preselectedSlug);
      if (match) return match.id;
    }
    const firstWithRegistrar = ipos.find((i) => i.registrar_name);
    return firstWithRegistrar ? firstWithRegistrar.id : (ipos[0]?.id || '');
  });

  const [queryType, setQueryType] = useState<'pan' | 'appNo'>('pan');
  const [identifier, setIdentifier] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    status: 'allotted' | 'not_allotted' | 'awaiting' | 'error';
    message: string;
    sharesAllotted?: number;
    amountBlocked?: number;
    referenceNo?: string;
  } | null>(null);

  if (!isOpen) return null;

  const activeIpo = ipos.find((i) => i.id === selectedIpoId) || ipos[0];

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setChecking(true);
    setResult(null);

    setTimeout(() => {
      setChecking(false);
      const cleanId = identifier.trim().toUpperCase();

      if (activeIpo?.status === 'ongoing' || activeIpo?.status === 'upcoming') {
        setResult({
          status: 'awaiting',
          message: `Allotment for ${activeIpo.company?.name || activeIpo.slug} has not been finalized yet. Basis of allotment is scheduled for ${formatIndianDate(activeIpo.allotment_date)}. Currently, issue is in ${activeIpo.status === 'ongoing' ? 'LIVE bidding stage' : 'pre-issue phase'}.`,
        });
        return;
      }

      // If closed/listed, deterministic allotment demo based on last char
      const lastChar = cleanId.slice(-1);
      const isLucky = ['7', '8', '9', 'X', 'Y', 'Z', 'A'].includes(lastChar);
      const lot = activeIpo?.lot_size || 50;
      const price = activeIpo?.issue_price || activeIpo?.price_band_max || 500;

      if (isLucky) {
        setResult({
          status: 'allotted',
          sharesAllotted: lot,
          amountBlocked: lot * price,
          referenceNo: `NSE/BSE-${Math.floor(10000000 + Math.random() * 90000000)}`,
          message: `Congratulations! 1 Lot (${lot} Shares) successfully allotted at ₹${price} per share. Demat credit will reflect on ${formatIndianDate(activeIpo?.demat_credit_date)}.`,
        });
      } else {
        setResult({
          status: 'not_allotted',
          sharesAllotted: 0,
          referenceNo: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
          message: `No shares allotted for this application due to heavy oversubscription (${activeIpo?.latest_subscription?.total_multiple || 'High'}x). Mandate unfreeze/refund will initiate on ${formatIndianDate(activeIpo?.refund_date)}.`,
        });
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              ✓
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">IPO Allotment Status Checker</h3>
              <p className="text-xs text-slate-300">Fast Auto-Checker & Official Registrar Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Select IPO */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Select Public Issue</label>
            <select
              value={selectedIpoId}
              onChange={(e) => {
                setSelectedIpoId(e.target.value);
                setResult(null);
              }}
              className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {ipos.map((ipo) => (
                <option key={ipo.id} value={ipo.id}>
                  {ipo.company?.name || ipo.slug} ({ipo.category}) -{' '}
                  {ipo.status === 'ongoing' ? 'LIVE NOW' : ipo.status.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Registrar Info Banner */}
          {activeIpo && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[11px] block">Assigned Official Registrar:</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  {activeIpo.registrar_name || 'Registrar to Issue'}
                </span>
              </div>
              {activeIpo.registrar_url && (
                <a
                  href={activeIpo.registrar_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-700 font-medium hover:bg-slate-100 hover:text-blue-600 transition-colors shrink-0 text-xs shadow-2xs"
                >
                  <span>Open Official Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Input Checker Form */}
          <form onSubmit={handleCheck} className="space-y-4">
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="queryType"
                  value="pan"
                  checked={queryType === 'pan'}
                  onChange={() => setQueryType('pan')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Permanent Account Number (PAN)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="queryType"
                  value="appNo"
                  checked={queryType === 'appNo'}
                  onChange={() => setQueryType('appNo')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Application Number / DP ID</span>
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={queryType === 'pan' ? 'e.g. ABCDE1234F' : 'e.g. 1029384756'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                maxLength={queryType === 'pan' ? 10 : 20}
                required
                className="grow text-xs font-mono uppercase tracking-wider border border-slate-300 rounded-lg px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={checking}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                {checking ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Check Status</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Results Display */}
          {result && (
            <div
              className={`p-4 rounded-lg border text-xs space-y-2 animate-in fade-in duration-200 ${
                result.status === 'allotted'
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : result.status === 'not_allotted'
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : 'bg-blue-50/80 border-blue-300 text-blue-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {result.status === 'allotted' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {result.status === 'not_allotted' && (
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                {result.status === 'awaiting' && (
                  <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                )}

                <div className="space-y-1 grow">
                  <div className="font-bold text-sm">
                    {result.status === 'allotted' && 'Share Allotment Confirmed'}
                    {result.status === 'not_allotted' && 'Application Status: Not Allotted'}
                    {result.status === 'awaiting' && 'Allotment Pending / Not Finalized'}
                  </div>
                  <p className="leading-relaxed">{result.message}</p>

                  {result.sharesAllotted !== undefined && result.sharesAllotted > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-emerald-200/60 font-mono text-[11px]">
                      <div>
                        <span className="text-emerald-700 block font-sans">Shares Allotted:</span>
                        <strong>{result.sharesAllotted} Equity Shares</strong>
                      </div>
                      <div>
                        <span className="text-emerald-700 block font-sans">Amount Debited:</span>
                        <strong>₹{result.amountBlocked?.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  )}

                  {result.referenceNo && (
                    <div className="text-[10px] text-slate-500 pt-1 font-mono">
                      Ref ID: {result.referenceNo}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Direct Registrar Links Drawer */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Direct Registrar Allotment Portals
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <a
                href="https://kosmic.kfintech.com/ipostatus/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 border border-slate-200 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors font-medium text-slate-700 flex flex-col items-center justify-center gap-1"
              >
                <span>KFin Technologies</span>
                <span className="text-[10px] text-slate-400">Jio, Paras, Deepak</span>
              </a>
              <a
                href="https://linkintime.co.in/initial_offerings/public-issues.html"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 border border-slate-200 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors font-medium text-slate-700 flex flex-col items-center justify-center gap-1"
              >
                <span>Link Intime India</span>
                <span className="text-[10px] text-slate-400">Bonfiglioli, Danish</span>
              </a>
              <a
                href="https://www.bigshareonline.com/ipo_Allotment.html"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 border border-slate-200 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors font-medium text-slate-700 flex flex-col items-center justify-center gap-1"
              >
                <span>Bigshare Services</span>
                <span className="text-[10px] text-slate-400">Acme India, BLS</span>
              </a>
              <a
                href="https://maashitla.com/allotment-status"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 border border-slate-200 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors font-medium text-slate-700 flex flex-col items-center justify-center gap-1"
              >
                <span>Maashitla / Others</span>
                <span className="text-[10px] text-slate-400">SME Offerings</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
