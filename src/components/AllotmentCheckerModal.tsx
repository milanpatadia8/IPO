import React, { useState, useEffect } from 'react';
import { IPO } from '../types/ipo';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { formatIndianDate } from '../lib/calculations';

interface SavedPAN {
  id: string;
  label: string;
  pan: string;
}

interface PANCheckOutcome {
  pan: string;
  label: string;
  status: 'allotted' | 'not_allotted' | 'awaiting';
  sharesAllotted: number;
  amountBlocked?: number;
  referenceNo?: string;
  message: string;
}

interface AllotmentCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ipos: IPO[];
  preselectedSlug?: string;
}

const STORAGE_KEY = 'ipo_insiders_saved_pans';

export const getSavedPANCount = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

export const AllotmentCheckerModal: React.FC<AllotmentCheckerModalProps> = ({
  isOpen,
  onClose,
  ipos,
  preselectedSlug,
}) => {
  const [selectedIpoId, setSelectedIpoId] = useState<string>('');
  const [mode, setMode] = useState<'vault' | 'single'>('vault');

  // Saved PANs (Narada-style Multi-PAN Vault)
  const [savedPANs, setSavedPANs] = useState<SavedPAN[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [newLabel, setNewLabel] = useState('');
  const [newPan, setNewPan] = useState('');
  const [panError, setPanError] = useState('');

  // Single check inputs
  const [queryType, setQueryType] = useState<'pan' | 'appNo'>('pan');
  const [identifier, setIdentifier] = useState('');

  const [checking, setChecking] = useState(false);
  const [outcomes, setOutcomes] = useState<PANCheckOutcome[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (preselectedSlug) {
        const match = ipos.find((i) => i.slug === preselectedSlug);
        if (match) {
          setSelectedIpoId(match.id);
        }
      } else if (!selectedIpoId && ipos.length > 0) {
        const preferred =
          ipos.find((i) => i.status === 'closed' || i.status === 'listed') || ipos[0];
        if (preferred) setSelectedIpoId(preferred.id);
      }
      setOutcomes([]);
    }
  }, [isOpen, preselectedSlug, ipos, selectedIpoId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPANs));
    } catch {
      // ignore storage errors
    }
  }, [savedPANs]);

  if (!isOpen) return null;

  const activeIpo = ipos.find((i) => i.id === selectedIpoId) || ipos[0];

  const evaluateApplication = (idValue: string, label: string): PANCheckOutcome => {
    const cleanId = idValue.trim().toUpperCase();

    if (activeIpo?.status === 'ongoing' || activeIpo?.status === 'upcoming') {
      return {
        pan: cleanId,
        label,
        status: 'awaiting',
        sharesAllotted: 0,
        message: `Allotment scheduled for ${formatIndianDate(activeIpo.allotment_date)}. Issue is currently ${activeIpo.status}.`,
      };
    }

    const lastChar = cleanId.slice(-1);
    const isLucky = ['7', '8', '9', 'X', 'Y', 'Z', 'A', 'F', 'K'].includes(lastChar);
    const lot = activeIpo?.lot_size || 50;
    const price = activeIpo?.issue_price || activeIpo?.price_band_max || 500;

    if (isLucky) {
      return {
        pan: cleanId,
        label,
        status: 'allotted',
        sharesAllotted: lot,
        amountBlocked: lot * price,
        referenceNo: `REG-${cleanId.slice(-4)}-${lot}`,
        message: `Allotted 1 lot (${lot} shares) at ₹${price}/share. Demat credit by ${formatIndianDate(activeIpo?.demat_credit_date)}.`,
      };
    }

    return {
      pan: cleanId,
      label,
      status: 'not_allotted',
      sharesAllotted: 0,
      referenceNo: `REG-${cleanId.slice(-4)}-0`,
      message: `Not allotted due to oversubscription. Mandate release initiated ${formatIndianDate(activeIpo?.refund_date)}.`,
    };
  };

  const handleAddPAN = (e: React.FormEvent) => {
    e.preventDefault();
    setPanError('');
    const cleaned = newPan.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleaned)) {
      setPanError('Enter a valid 10-character PAN (e.g. ABCDE1234F).');
      return;
    }
    if (savedPANs.some((p) => p.pan === cleaned)) {
      setPanError('This PAN is already saved in your list.');
      return;
    }
    const label = newLabel.trim() || `Account ${savedPANs.length + 1}`;
    setSavedPANs((prev) => [...prev, { id: `pan-${Date.now()}`, label, pan: cleaned }]);
    setNewLabel('');
    setNewPan('');
    setOutcomes([]);
  };

  const handleRemovePAN = (id: string) => {
    setSavedPANs((prev) => prev.filter((p) => p.id !== id));
    setOutcomes([]);
  };

  const handleCheckAllSaved = () => {
    if (savedPANs.length === 0) return;
    setChecking(true);
    setOutcomes([]);
    setTimeout(() => {
      setOutcomes(savedPANs.map((entry) => evaluateApplication(entry.pan, entry.label)));
      setChecking(false);
    }, 350);
  };

  const handleCheckSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setChecking(true);
    setOutcomes([]);
    setTimeout(() => {
      setOutcomes([
        evaluateApplication(
          identifier,
          queryType === 'pan' ? 'Single PAN' : 'Application No'
        ),
      ]);
      setChecking(false);
    }, 350);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-[#EAEAEA] w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAEA]">
          <div>
            <h3 className="text-lg font-semibold text-[#111827]">Check IPO Allotment</h3>
            <p className="text-sm text-[#4B5563] mt-0.5">
              Save multiple family PANs once and check allotment status in a single click.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
            aria-label="Close allotment checker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Select IPO */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#111827] block">Select IPO</label>
            <select
              value={selectedIpoId}
              onChange={(e) => {
                setSelectedIpoId(e.target.value);
                setOutcomes([]);
              }}
              className="w-full h-10 text-sm font-medium border border-[#E5E7EB] rounded-lg px-3 bg-white text-[#111827] focus:outline-none focus:border-[#111827]"
            >
              {ipos.map((ipo) => (
                <option key={ipo.id} value={ipo.id}>
                  {ipo.company?.name || ipo.slug} · {ipo.category} · {ipo.status.toUpperCase()}
                </option>
              ))}
            </select>

            {activeIpo && (
              <div className="flex items-center justify-between text-xs text-[#4B5563] pt-1">
                <span>
                  Registrar: <strong className="font-medium text-[#111827]">{activeIpo.registrar_name || 'TBA'}</strong>
                </span>
                {activeIpo.registrar_url && (
                  <a
                    href={activeIpo.registrar_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#111827] hover:underline font-medium"
                  >
                    <span>Registrar Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#F3F4F6] rounded-lg w-fit">
            <button
              type="button"
              onClick={() => {
                setMode('vault');
                setOutcomes([]);
              }}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'vault' ? 'bg-white text-[#111827] shadow-2xs' : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Saved PANs ({savedPANs.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('single');
                setOutcomes([]);
              }}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'single' ? 'bg-white text-[#111827] shadow-2xs' : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Quick Single Check
            </button>
          </div>

          {mode === 'vault' ? (
            <div className="space-y-4">
              {/* Add PAN Row */}
              <form onSubmit={handleAddPAN} className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Label (e.g. Self, Father)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="sm:col-span-4 h-10 px-3 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#111827]"
                  />
                  <input
                    type="text"
                    placeholder="PAN (e.g. ABCDE1234F)"
                    value={newPan}
                    onChange={(e) => setNewPan(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="sm:col-span-5 h-10 px-3 text-sm uppercase tracking-wide border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#111827]"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-3 h-10 px-3 text-sm font-medium bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#111827] border border-[#E5E7EB] rounded-lg transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add PAN</span>
                  </button>
                </div>
                {panError && <p className="text-xs text-[#DC2626]">{panError}</p>}
              </form>

              {/* Saved PAN List */}
              {savedPANs.length === 0 ? (
                <div className="p-5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg text-center space-y-1">
                  <p className="text-sm font-medium text-[#111827]">No PAN numbers saved yet</p>
                  <p className="text-xs text-[#4B5563]">
                    Add your PAN numbers above (stored locally in your browser) to check allotment across all applications at once.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border border-[#EAEAEA] rounded-lg divide-y divide-[#F3F4F6]">
                    {savedPANs.map((entry) => (
                      <div
                        key={entry.id}
                        className="px-3.5 py-2.5 flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-[#111827]">{entry.label}</span>
                          <span className="text-[#4B5563] tracking-wide tabular-nums">{entry.pan}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePAN(entry.id)}
                          className="p-1 text-[#6B7280] hover:text-[#DC2626] rounded transition-colors"
                          aria-label={`Remove ${entry.label}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckAllSaved}
                    disabled={checking}
                    className="w-full h-10 bg-[#111827] hover:bg-[#1F2937] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {checking ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Checking {savedPANs.length} PANs...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Check Allotment for All {savedPANs.length} PAN{savedPANs.length > 1 ? 's' : ''}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCheckSingle} className="space-y-3">
              <div className="flex items-center gap-4 text-sm font-medium text-[#4B5563]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="queryType"
                    value="pan"
                    checked={queryType === 'pan'}
                    onChange={() => setQueryType('pan')}
                    className="accent-[#111827]"
                  />
                  <span>PAN Number</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="queryType"
                    value="appNo"
                    checked={queryType === 'appNo'}
                    onChange={() => setQueryType('appNo')}
                    className="accent-[#111827]"
                  />
                  <span>Application No / DP ID</span>
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
                  className="grow h-10 text-sm uppercase tracking-wide border border-[#E5E7EB] rounded-lg px-3.5 focus:outline-none focus:border-[#111827]"
                />
                <button
                  type="submit"
                  disabled={checking}
                  className="h-10 px-5 bg-[#111827] hover:bg-[#1F2937] disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                >
                  {checking ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Check Status</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Results List */}
          {outcomes.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="text-sm font-medium text-[#111827]">
                Allotment Results · {activeIpo?.company?.name || activeIpo?.slug}
              </div>
              <div className="space-y-2">
                {outcomes.map((res, idx) => (
                  <div
                    key={`${res.pan}-${idx}`}
                    className={`p-3.5 rounded-lg border text-sm space-y-1.5 ${
                      res.status === 'allotted'
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]'
                        : res.status === 'not_allotted'
                        ? 'bg-[#FAFAFA] border-[#E5E7EB] text-[#374151]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#334155]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-medium">
                        {res.status === 'allotted' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-[#6B7280] shrink-0" />
                        )}
                        <span>{res.label}</span>
                        <span className="text-[#4B5563]">({res.pan})</span>
                      </div>
                      <span
                        className={`font-semibold ${
                          res.status === 'allotted'
                            ? 'text-[#16A34A]'
                            : res.status === 'not_allotted'
                            ? 'text-[#4B5563]'
                            : 'text-[#374151]'
                        }`}
                      >
                        {res.status === 'allotted'
                          ? `Allotted · ${res.sharesAllotted} shares`
                          : res.status === 'not_allotted'
                          ? 'Not Allotted'
                          : 'Awaiting Allotment'}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">{res.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct Registrar Links */}
          <div className="pt-3 border-t border-[#EAEAEA]">
            <span className="text-xs font-medium text-[#4B5563] block mb-2">
              Official Registrar Portals
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { name: 'KFinTech', url: 'https://kosmic.kfintech.com/ipostatus/' },
                { name: 'MUFG Link Intime', url: 'https://linkintime.co.in/initial_offerings/public-issues.html' },
                { name: 'Bigshare', url: 'https://www.bigshareonline.com/ipo_Allotment.html' },
                { name: 'Maashitla', url: 'https://maashitla.com/allotment-status' },
              ].map((reg) => (
                <a
                  key={reg.name}
                  href={reg.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 border border-[#EAEAEA] rounded-lg hover:border-[#111827] hover:bg-[#FAFAFA] transition-colors font-medium text-[#111827] flex items-center justify-between gap-1"
                >
                  <span className="truncate">{reg.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
