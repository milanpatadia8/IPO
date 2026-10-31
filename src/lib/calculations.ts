// =====================================================================
// Financial & Date Calculations: src/lib/calculations.ts
// Adheres strictly to SEBI & Indian Exchange accounting conventions
// =====================================================================

import { IPO, GMPSnapshot, ListingResult } from '../types/ipo';

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

export const SEBI_PUBLIC_ISSUES_URL = 'https://www.sebi.gov.in/filings/public-issues.html';

/**
 * Normalizes RHP / DRHP links to ensure they open the active official SEBI Public Issues portal:
 * https://www.sebi.gov.in/filings/public-issues.html
 * Handles dead .pdf links, empty URLs, or outdated SEBI file URLs.
 */
export function getValidDocUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return SEBI_PUBLIC_ISSUES_URL;
  }
  const clean = url.trim();
  // If url contains .pdf, doesn't start with http, or points to any SEBI path (many of which 404),
  // guarantee the user lands on the official active SEBI Public Issues filing repository.
  if (
    clean.toLowerCase().includes('.pdf') ||
    !clean.startsWith('http') ||
    clean.includes('sebi.gov.in')
  ) {
    return SEBI_PUBLIC_ISSUES_URL;
  }
  return clean;
}

