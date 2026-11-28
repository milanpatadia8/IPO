// =====================================================================
// Financial & Date Calculations: src/lib/calculations.ts
// Adheres strictly to SEBI & Indian Exchange accounting conventions
// =====================================================================

import {
  IPO,
  IPOStatus,
  GMPSnapshot,
  ListingResult,
  CategoryLotLimitsMap,
  InvestorLotCategory,
  MinInvestmentMultiples,
} from '../types/ipo';

export const INVESTOR_LOT_CATEGORIES: InvestorLotCategory[] = [
  'Retail',
  'Employee',
  'Shareholder',
  'sHNI',
  'bHNI',
  'QIB',
];

/**
 * Calculates standard Indian SEBI/Exchange default lot limits for Retail, sHNI, and bHNI
 * from the lot size and upper band / issue price.
 */
export function calculateDefaultSEBILotLimits(
  lotSize?: number,
  pricePerShare?: number,
  category: 'Mainboard' | 'SME' = 'Mainboard'
): CategoryLotLimitsMap {
  if (!lotSize || lotSize <= 0 || !pricePerShare || pricePerShare <= 0) {
    return {
      Retail: { min_lots: 1, max_lots: 13 },
      sHNI: { min_lots: 14, max_lots: 66 },
      bHNI: { min_lots: 67 },
    };
  }

  const singleLotValue = lotSize * pricePerShare;

  if (category === 'SME') {
    const retailLots = singleLotValue <= 200000 ? 1 : 1;
    const hniMin = retailLots + 1;
    return {
      Retail: { min_lots: retailLots, max_lots: retailLots },
      sHNI: { min_lots: hniMin },
    };
  }

  const retailMax = Math.max(1, Math.floor(200000 / singleLotValue));
  const sHniMin = retailMax + 1;
  const sHniMax = Math.max(sHniMin, Math.floor(1000000 / singleLotValue));
  const bHniMin = sHniMax + 1;

  return {
    Retail: { min_lots: 1, max_lots: retailMax },
    sHNI: { min_lots: sHniMin, max_lots: sHniMax },
    bHNI: { min_lots: bHniMin },
  };
}

/**
 * Returns normalized category lot limits for display using strictly Admin-configured limits.
 * Returns an empty map if no limits were entered by Admin (no default data injected).
 */
export function getEffectiveCategoryLotLimits(ipo: {
  category?: 'Mainboard' | 'SME';
  lot_size?: number;
  issue_price?: number;
  price_band_max?: number;
  category_lot_limits?: CategoryLotLimitsMap;
}): { limits: CategoryLotLimitsMap; isAdminConfigured: boolean } {
  const configured = ipo.category_lot_limits;
  if (configured) {
    const cleaned: CategoryLotLimitsMap = {};
    let hasAny = false;
    for (const cat of INVESTOR_LOT_CATEGORIES) {
      const entry = configured[cat];
      if (!entry) continue;
      const minLots =
        typeof entry.min_lots === 'number' && Number.isFinite(entry.min_lots) && entry.min_lots > 0
          ? Math.floor(entry.min_lots)
          : undefined;
      const maxLots =
        typeof entry.max_lots === 'number' && Number.isFinite(entry.max_lots) && entry.max_lots > 0
          ? Math.floor(entry.max_lots)
          : undefined;
      if (minLots !== undefined || maxLots !== undefined) {
        cleaned[cat] = { min_lots: minLots, max_lots: maxLots };
        hasAny = true;
      }
    }
    if (hasAny) {
      return { limits: cleaned, isAdminConfigured: true };
    }
  }

  return {
    limits: {},
    isAdminConfigured: false,
  };
}

/**
 * Returns today's calendar date in Asia/Kolkata (IST) as YYYY-MM-DD.
 */
export function getTodayISTDateString(referenceDate: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(referenceDate);
}

/**
 * Extracts a strict YYYY-MM-DD calendar date from a date or ISO string.
 */
export function normalizeDateOnly(dateStr?: string | null): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return getTodayISTDateString(parsed);
}

/**
 * Automatically derives IPO lifecycle status (upcoming, ongoing/open, closed, listed)
 * from the entered Open, Close, and Listing dates against today's IST date.
 */
export function deriveIPOStatusFromDates(
  input: {
    open_date?: string | null;
    close_date?: string | null;
    listing_date?: string | null;
    has_listing_result?: boolean;
    fallback_status?: IPOStatus;
  },
  referenceDate: Date = new Date()
): IPOStatus {
  if (input.fallback_status === 'postponed' || input.fallback_status === 'withdrawn') {
    return input.fallback_status;
  }

  if (input.has_listing_result) {
    return 'listed';
  }

  const today = getTodayISTDateString(referenceDate);
  const openDate = normalizeDateOnly(input.open_date);
  const closeDate = normalizeDateOnly(input.close_date);
  const listingDate = normalizeDateOnly(input.listing_date);

  if (!openDate && !closeDate && !listingDate) {
    return input.fallback_status || 'upcoming';
  }

  // 1. Listed: on or after listing date
  if (listingDate && today >= listingDate) {
    return 'listed';
  }

  // 2. Closed: strictly after close date (and before listing date if provided)
  if (closeDate && today > closeDate) {
    return 'closed';
  }

  // 3. Open (ongoing): on or after open date (and on or before close date if provided)
  if (openDate) {
    if (today >= openDate) {
      return 'ongoing';
    }
    return 'upcoming';
  }

  // 4. Only close date provided (no open date): open up through close date
  if (closeDate) {
    return 'ongoing';
  }

  // 5. Only future listing date provided
  return 'upcoming';
}

/**
 * Calculates actual listing gain or loss in Rupees.
 * Listing gain or loss = Actual listing price − Issue price
 */
export function calculateListingGain(issuePrice: number, listingPrice: number): number {
  if (!issuePrice || issuePrice <= 0 || !listingPrice) return 0;
  return Number((listingPrice - issuePrice).toFixed(2));
}

/**
 * Calculates actual listing gain percentage.
 * Listing gain percentage = ((Actual listing price − Issue price) / Issue price) * 100
 */
export function calculateListingGainPercentage(issuePrice: number, listingPrice: number): number {
  if (!issuePrice || issuePrice <= 0 || !listingPrice) return 0;
  const gain = ((listingPrice - issuePrice) / issuePrice) * 100;
  return Number(gain.toFixed(2));
}

/**
 * Calculates indicative listing price based on GMP and applicable issue price.
 * When issue price is not yet finalized, the upper band of the price band is used with explicit disclosure.
 * Indicative estimated listing price = Applicable issue price + GMP
 */
export function calculateIndicativeListingPrice(
  basePrice: number | undefined,
  gmpAmount: number | undefined
): { price: number | null; isEstimatedBand: boolean } {
  if (!basePrice || gmpAmount === undefined || gmpAmount === null) {
    return { price: null, isEstimatedBand: false };
  }
  return {
    price: Number((basePrice + gmpAmount).toFixed(2)),
    isEstimatedBand: true,
  };
}

/**
 * Calculates indicative estimated gain percentage based on GMP.
 * Indicative estimated gain percentage = (GMP / Applicable issue price) * 100
 */
export function calculateIndicativeGainPercentage(
  basePrice: number | undefined,
  gmpAmount: number | undefined
): number | null {
  if (!basePrice || basePrice <= 0 || gmpAmount === undefined || gmpAmount === null) {
    return null;
  }
  return Number(((gmpAmount / basePrice) * 100).toFixed(2));
}

/**
 * Calculates days remaining until confirmed close date.
 * Returns negative if closed, 0 if closing today, or positive count.
 */
export function calculateDaysRemaining(closeDateStr?: string): {
  days: number | null;
  statusText: string;
} {
  if (!closeDateStr) {
    return { days: null, statusText: 'Dates TBA' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const closeDate = new Date(closeDateStr);
  closeDate.setHours(0, 0, 0, 0);

  const diffTime = closeDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { days: diffDays, statusText: 'Closed' };
  } else if (diffDays === 0) {
    return { days: 0, statusText: 'Closes Today' };
  } else if (diffDays === 1) {
    return { days: 1, statusText: '1 day left' };
  } else {
    return { days: diffDays, statusText: `${diffDays} days left` };
  }
}

/**
 * Checks whether an observation is stale based on an hour threshold.
 */
export function isObservationStale(observedAtStr: string, thresholdHours: number = 24): boolean {
  if (!observedAtStr) return true;
  const observedAt = new Date(observedAtStr).getTime();
  const now = Date.now();
  const diffHours = (now - observedAt) / (1000 * 60 * 60);
  return diffHours > thresholdHours;
}

/**
 * Formats a monetary amount in Indian Rupees (INR)
 * Supports Crores and Lakhs conventions for market cap/issue size
 */
export function formatINR(
  amount: number | null | undefined,
  options?: { showSymbol?: boolean; decimals?: number }
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  const showSymbol = options?.showSymbol !== false;
  const decimals = options?.decimals ?? 2;

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Formats issue sizes in Crores (Cr)
 */
export function formatCrores(amountInCrores: number | null | undefined): string {
  if (amountInCrores === null || amountInCrores === undefined || isNaN(amountInCrores)) {
    return 'N/A';
  }
  if (amountInCrores >= 1000) {
    return `₹${(amountInCrores / 1000).toFixed(2)}k Cr`;
  }
  return `₹${amountInCrores.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

/**
 * Formats dates in standard Indian business format: "DD MMM YYYY" (e.g., 28 Oct 2024)
 */
export function formatIndianDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats timestamp to readable date & time in IST (Asia/Kolkata)
 */
export function formatIndianTimestamp(timestampStr?: string | null): string {
  if (!timestampStr) return 'N/A';
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return timestampStr;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }) + ' IST';
  } catch {
    return timestampStr;
  }
}

/**
 * Calculates minimum application amount:
 * Min Application Amount = Lower/Upper band * Lot Size
 */
export function calculateMinApplication(priceBandMax?: number, lotSize?: number): number | null {
  if (!priceBandMax || !lotSize) return null;
  return priceBandMax * lotSize;
}

export interface InvestmentMultipleRow {
  step: number;
  lots: number;
  shares: number;
  amount: number;
  label: string;
}

/**
 * Resolves effective minimum investment (₹) preferring Admin-configured
 * min_investment_multiples.min_amount, otherwise falling back to upper price * lot size.
 */
export function getEffectiveMinInvestment(ipo: {
  price_band_max?: number;
  issue_price?: number;
  lot_size?: number;
  min_investment_multiples?: MinInvestmentMultiples;
}): number | null {
  const m = ipo.min_investment_multiples;
  if (m?.min_amount && m.min_amount > 0) {
    return Math.round(m.min_amount);
  }
  const price = ipo.issue_price || ipo.price_band_max;
  if (m?.min_shares && m.min_shares > 0 && price && price > 0) {
    return Math.round(m.min_shares * price);
  }
  if (m?.min_lots && m.min_lots > 0 && ipo.lot_size && ipo.lot_size > 0 && price && price > 0) {
    return Math.round(m.min_lots * ipo.lot_size * price);
  }
  return calculateMinApplication(price, ipo.lot_size);
}

/**
 * Generates an ordered breakdown table of investment multiples (1x minimum, 2x, 3x, ...)
 * from Admin-configured minimum investment multiples, lot size, and upper/issue price.
 */
export function buildInvestmentMultiplesSchedule(input: {
  min_investment_multiples?: MinInvestmentMultiples;
  lot_size?: number;
  price_per_share?: number;
  previewCount?: number;
}): {
  minLots: number;
  multipleLots: number;
  minShares: number;
  multipleShares: number;
  minAmount: number;
  multipleAmount: number;
  maxMultiples?: number;
  rows: InvestmentMultipleRow[];
} | null {
  const m = input.min_investment_multiples;
  if (!m) return null;

  const lotSize = input.lot_size && input.lot_size > 0 ? Math.floor(input.lot_size) : 0;
  const price = input.price_per_share && input.price_per_share > 0 ? input.price_per_share : 0;

  const minLots = m.min_lots && m.min_lots >= 1 ? Math.floor(m.min_lots) : 1;
  const multipleLots = m.multiple_lots && m.multiple_lots >= 1 ? Math.floor(m.multiple_lots) : 1;

  const minShares =
    m.min_shares && m.min_shares >= 1
      ? Math.floor(m.min_shares)
      : lotSize > 0
      ? minLots * lotSize
      : 0;
  const multipleShares =
    m.multiple_shares && m.multiple_shares >= 1
      ? Math.floor(m.multiple_shares)
      : lotSize > 0
      ? multipleLots * lotSize
      : minShares;

  const minAmount =
    m.min_amount && m.min_amount > 0
      ? Math.round(m.min_amount)
      : minShares > 0 && price > 0
      ? Math.round(minShares * price)
      : 0;
  const multipleAmount =
    m.multiple_amount && m.multiple_amount > 0
      ? Math.round(m.multiple_amount)
      : multipleShares > 0 && price > 0
      ? Math.round(multipleShares * price)
      : minAmount;

  if (minShares <= 0 && minAmount <= 0) {
    return null;
  }

  const maxMultiples =
    m.max_multiples && m.max_multiples >= 1 ? Math.min(100, Math.floor(m.max_multiples)) : undefined;
  const targetCount = maxMultiples
    ? Math.min(maxMultiples, input.previewCount ?? 6)
    : input.previewCount ?? 5;

  const rows: InvestmentMultipleRow[] = [];
  for (let i = 0; i < targetCount; i++) {
    const lots = minLots + i * multipleLots;
    const shares = minShares + i * multipleShares;
    const amount = minAmount + i * multipleAmount;
    rows.push({
      step: i + 1,
      lots,
      shares,
      amount,
      label: i === 0 ? 'Minimum (1x)' : `${i + 1}x Multiple`,
    });
  }

  // If maxMultiples exceeds the preview window, append the maximum cap row as well
  if (maxMultiples && maxMultiples > targetCount) {
    const idx = maxMultiples - 1;
    rows.push({
      step: maxMultiples,
      lots: minLots + idx * multipleLots,
      shares: minShares + idx * multipleShares,
      amount: minAmount + idx * multipleAmount,
      label: `Maximum (${maxMultiples}x)`,
    });
  }

  return {
    minLots,
    multipleLots,
    minShares,
    multipleShares,
    minAmount,
    multipleAmount,
    maxMultiples,
    rows,
  };
}

export const SEBI_PUBLIC_ISSUES_URL = 'https://www.sebi.gov.in/filings/public-issues.html';

/**
 * Validates and preserves an Admin-attached document URL (RHP / DRHP / Registrar).
 * Returns undefined when no link is provided — never injects a default fallback link.
 */
export function getValidDocUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const clean = url.trim();
  if (!clean) return undefined;
  if (/^(javascript|data|vbscript):/i.test(clean)) return undefined;
  if (/^https?:\/\//i.test(clean)) return clean;
  return `https://${clean}`;
}

/**
 * Returns descriptive demand metadata for IPO Premium Fire Rating (1-5 flames)
 */
export function getFireRatingInfo(rating?: number): {
  flames: string;
  label: string;
  badgeClass: string;
  numericRating: number;
} {
  const r = rating && rating >= 1 && rating <= 5 ? Math.round(rating) : 3;
  switch (r) {
    case 5:
      return {
        flames: '🔥🔥🔥🔥🔥',
        label: 'Super Hot / High Demand',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        numericRating: 5,
      };
    case 4:
      return {
        flames: '🔥🔥🔥🔥',
        label: 'Strong Interest',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        numericRating: 4,
      };
    case 3:
      return {
        flames: '🔥🔥🔥',
        label: 'Moderate Demand',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        numericRating: 3,
      };
    case 2:
      return {
        flames: '🔥🔥',
        label: 'Average / Neutral',
        badgeClass: 'bg-neutral-50 text-neutral-700 border-neutral-200',
        numericRating: 2,
      };
    case 1:
    default:
      return {
        flames: '🔥',
        label: 'Low / Discount Caution',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
        numericRating: 1,
      };
  }
}

/**
 * Calculates estimated profit and total return based on number of lots and GMP.
 */
export function calculateIPOProfit(
  lotSize: number,
  lotsCount: number,
  pricePerShare: number,
  gmpAmount: number
): {
  totalShares: number;
  totalInvestment: number;
  estimatedProfit: number;
  totalEstimatedValue: number;
  roiPercentage: number;
} {
  const shares = Math.max(1, lotSize) * Math.max(1, lotsCount);
  const investment = shares * Math.max(1, pricePerShare);
  const profit = shares * (gmpAmount || 0);
  const totalValue = investment + profit;
  const roi = investment > 0 ? (profit / investment) * 100 : 0;

  return {
    totalShares: shares,
    totalInvestment: Math.round(investment),
    estimatedProfit: Math.round(profit),
    totalEstimatedValue: Math.round(totalValue),
    roiPercentage: Number(roi.toFixed(2)),
  };
}


