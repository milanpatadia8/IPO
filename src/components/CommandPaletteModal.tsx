import React, { useState, useEffect, useRef } from 'react';
import { IPO } from '../types/ipo';
import { Search, X, ArrowRight } from 'lucide-react';
import { formatIndianDate, calculateIndicativeGainPercentage } from '../lib/calculations';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  ipos: IPO[];
  navigate: (route: string) => void;
  onOpenAllotment: (slug?: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  ipos,
  navigate,
  onOpenAllotment,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? ipos.filter(
          (i) =>
            (i.company?.name || '').toLowerCase().includes(q) ||
            i.slug.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q) ||
            i.exchange.toLowerCase().includes(q)
        )
      : ipos.slice(0, 8);
    return matched.slice(0, 10);
  }, [ipos, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (ipo: IPO) => {
    onClose();
    navigate(`/ipo/${ipo.slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(results.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#EAEAEA] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EAEAEA]">
          <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search IPOs by name, category, or exchange..."
            className="w-full text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#6B7280] hover:text-[#111827] p-1 rounded"
            aria-label="Close quick search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-[#F3F4F6]">
          {results.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-[#4B5563]">
              No matching IPOs found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            results.map((ipo, idx) => {
              const basePrice = ipo.issue_price || ipo.price_band_max;
              const gmpPct =
                ipo.latest_gmp && basePrice
                  ? calculateIndicativeGainPercentage(basePrice, ipo.latest_gmp.gmp_amount)
                  : null;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={ipo.id}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleSelect(ipo)}
                  className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#F9FAFB]' : 'bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#111827] truncate">
                      {ipo.company?.name || ipo.slug}
                    </div>
                    <div className="text-xs text-[#4B5563] flex items-center gap-1.5 mt-0.5">
                      <span>{ipo.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{ipo.status}</span>
                      {ipo.open_date && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{formatIndianDate(ipo.open_date)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {ipo.latest_gmp && (
                      <div className="text-right tabular-nums text-sm">
                        <span className="text-[#16A34A] font-medium">
                          +₹{ipo.latest_gmp.gmp_amount}
                        </span>
                        {gmpPct !== null && (
                          <span className="text-[#4B5563] text-xs ml-1">({gmpPct}%)</span>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        onOpenAllotment(ipo.slug);
                      }}
                      className="text-xs font-medium text-[#4B5563] hover:text-[#111827] px-2.5 py-1 border border-[#E5E7EB] rounded-md bg-white whitespace-nowrap"
                    >
                      Allotment
                    </button>
                    <ArrowRight className="w-4 h-4 text-[#6B7280]" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 bg-[#FAFAFA] border-t border-[#EAEAEA] flex items-center justify-between text-xs text-[#4B5563]">
          <span>Use arrow keys to navigate and Enter to open</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
