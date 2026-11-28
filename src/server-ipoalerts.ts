// =====================================================================
// Server-Side IPO Data Sync & Proxy: src/server-ipoalerts.ts
// Combines ipoalerts.in API (reads IPOALERTS_API_KEY strictly from
// server-side process.env) with Live Public Indian IPO Feed fallback
// so Upcoming, Open, Closed, Listed, and Announced IPOs always work
// even on the ipoalerts.in Free Plan (which restricts non-open statuses).
// =====================================================================

import type { AnnouncementStatus, IPOCategory, IPOExchange, IPOStatus } from './types/ipo';

const IPOALERTS_BASE_URL = 'https://api.ipoalerts.in';
const CHITTORGARH_BASE_URL = 'https://webnodejs.chittorgarh.com';
const DAILY_QUOTA_LIMIT = 25;
const MINUTE_QUOTA_LIMIT = 6;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const UPSTREAM_TIMEOUT_MS = 12_000;

const ALLOWED_STATUSES = new Set(['open', 'upcoming', 'announced', 'closed', 'listed']);
const ALLOWED_TYPES = new Set(['EQ', 'SME', 'EQ,SME', 'DEBT']);
const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_\-\s]{1,120}$/;

export type SyncProviderSource = 'auto' | 'ipoalerts' | 'public_feed';

export interface IpoAlertsMappedRecord {
  external_id: string;
  symbol?: string;
  companyName: string;
  slug: string;
  sourceType: string;
  category: IPOCategory;
  exchange: IPOExchange;
  status: IPOStatus;
  announcement_status?: AnnouncementStatus;
  industry?: string;
  pipeline_stage?: 'dated' | 'approval_received' | 'drhp_filed';
  drhp_filing_date?: string;
  sebi_approval_date?: string;
  open_date?: string;
  close_date?: string;
  allotment_date?: string;
  refund_date?: string;
  demat_credit_date?: string;
  listing_date?: string;
  price_band_min?: number;
  price_band_max?: number;
  lot_size?: number;
  issue_size?: number;
  fresh_issue_size?: number;
  offer_for_sale_size?: number;
  description?: string;
  drhp_url?: string;
  rhp_url?: string;
  official_source_url?: string;
  logo_url?: string;
  data_source?: 'ipoalerts' | 'public_feed';
}

export interface IpoAlertsQuotaInfo {
  configured: boolean;
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  minuteLimit: number;
  minuteUsed: number;
  cacheTtlSeconds: number;
  quotaDateUtc: string;
}

export interface IpoAlertsFetchResult {
  ipos: IpoAlertsMappedRecord[];
  meta: {
    count: number;
    countOnPage: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  cached: boolean;
  fetchedAt: string;
  quota: IpoAlertsQuotaInfo;
  provider?: 'ipoalerts' | 'public_feed' | 'hybrid';
  upstreamNotice?: string;
}

interface CacheEntry {
  expiresAt: number;
  fetchedAt: string;
  ipos: IpoAlertsMappedRecord[];
  meta: IpoAlertsFetchResult['meta'];
  provider?: 'ipoalerts' | 'public_feed' | 'hybrid';
  upstreamNotice?: string;
}

interface PublicFeedCacheEntry {
  expiresAt: number;
  fetchedAt: string;
  records: Array<{
    record: IpoAlertsMappedRecord;
    bucket: 'open' | 'upcoming' | 'announced' | 'closed' | 'listed';
    sortDate: string;
  }>;
}

// In-memory Free-Plan quota tracker, restricted-status memory, and caches
let quotaDateUtc = new Date().toISOString().slice(0, 10);
let dailyRequestsUsed = 0;
let minuteTimestamps: number[] = [];
const responseCache = new Map<string, CacheEntry>();
const freePlanBlockedStatuses = new Set<string>();
let publicFeedCache: PublicFeedCacheEntry | null = null;

function syncQuotaWindows(nowMs: number): void {
  const todayUtc = new Date(nowMs).toISOString().slice(0, 10);
  if (todayUtc !== quotaDateUtc) {
    quotaDateUtc = todayUtc;
    dailyRequestsUsed = 0;
    freePlanBlockedStatuses.clear();
  }
  const oneMinuteAgo = nowMs - 60_000;
  minuteTimestamps = minuteTimestamps.filter((ts) => ts > oneMinuteAgo);
}

function getApiKey(): string {
  return (process.env.IPOALERTS_API_KEY || '').trim();
}

function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function getIpoAlertsQuotaStatus(): IpoAlertsQuotaInfo {
  const nowMs = Date.now();
  syncQuotaWindows(nowMs);
  const configured = getApiKey().length > 0;
  return {
    configured,
    dailyLimit: DAILY_QUOTA_LIMIT,
    dailyUsed: dailyRequestsUsed,
    dailyRemaining: Math.max(0, DAILY_QUOTA_LIMIT - dailyRequestsUsed),
    minuteLimit: MINUTE_QUOTA_LIMIT,
    minuteUsed: minuteTimestamps.length,
    cacheTtlSeconds: Math.floor(CACHE_TTL_MS / 1000),
    quotaDateUtc,
  };
}

function sanitizeHttpUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 1800) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function stripHtmlTags(raw: unknown, maxLen: number): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLen);
}

function extractAnchorHref(rawHtml: unknown): string | undefined {
  if (typeof rawHtml !== 'string') return undefined;
  const match = rawHtml.match(/href\s*=\s*["']([^"']+)["']/i);
  if (!match) return undefined;
  return sanitizeHttpUrl(match[1]);
}

function toSafeSlug(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 130);
  return cleaned || `ipo-${Date.now()}`;
}

function normalizeDateString(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function parsePriceBand(item: Record<string, unknown>): { min?: number; max?: number } {
  const directMin = Number(item.minPrice ?? item.priceBandMin ?? item.price_band_min);
  const directMax = Number(item.maxPrice ?? item.priceBandMax ?? item.price_band_max);
  if (Number.isFinite(directMin) && directMin > 0 && Number.isFinite(directMax) && directMax > 0) {
    return {
      min: Math.min(directMin, directMax),
      max: Math.max(directMin, directMax),
    };
  }

  const rawRange =
    item.priceRange ?? item.price_range ?? item.issuePrice ?? item.price ?? item['Issue Price (Rs.)'];
  if (typeof rawRange === 'number' && Number.isFinite(rawRange) && rawRange > 0) {
    return { min: rawRange, max: rawRange };
  }
  if (typeof rawRange === 'string') {
    const matches = rawRange.replace(/,/g, '').match(/\d+(?:\.\d+)?/g);
    if (matches && matches.length >= 2) {
      const a = Number(matches[0]);
      const b = Number(matches[1]);
      if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
        return { min: Math.min(a, b), max: Math.max(a, b) };
      }
    } else if (matches && matches.length === 1) {
      const single = Number(matches[0]);
      if (Number.isFinite(single) && single > 0) {
        return { min: single, max: single };
      }
    }
  }
  return {};
}

function parseIssueSizeCrores(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Number(raw.toFixed(2));
  }
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.replace(/,/g, '').trim();
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  if (/lakh/i.test(cleaned)) {
    return Number((value / 100).toFixed(2));
  }
  return Number(value.toFixed(2));
}

function extractScheduleDates(schedule: unknown): {
  allotment_date?: string;
  refund_date?: string;
  demat_credit_date?: string;
  listing_date?: string;
} {
  const result: {
    allotment_date?: string;
    refund_date?: string;
    demat_credit_date?: string;
    listing_date?: string;
  } = {};
  if (!Array.isArray(schedule)) return result;

  for (const entry of schedule) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const label = String(obj.event ?? obj.title ?? obj.name ?? obj.label ?? '').toLowerCase();
    const dateVal = normalizeDateString(obj.date ?? obj.eventDate ?? obj.startDate);
    if (!dateVal) continue;

    if (label.includes('allot') && !result.allotment_date) {
      result.allotment_date = dateVal;
    } else if (label.includes('refund') && !result.refund_date) {
      result.refund_date = dateVal;
    } else if ((label.includes('demat') || label.includes('credit')) && !result.demat_credit_date) {
      result.demat_credit_date = dateVal;
    } else if (label.includes('list') && !result.listing_date) {
      result.listing_date = dateVal;
    }
  }

  return result;
}

function mapStatus(raw: unknown): IPOStatus {
  const val = String(raw || '').trim().toLowerCase();
  if (val === 'open' || val === 'ongoing' || val === 'active') return 'ongoing';
  if (val === 'closed') return 'closed';
  if (val === 'listed') return 'listed';
  if (val === 'withdrawn') return 'withdrawn';
  if (val === 'postponed') return 'postponed';
  // Both 'upcoming' and 'announced' map to 'upcoming' on the website
  return 'upcoming';
}

function mapAnnouncementStatus(
  rawStatus: unknown,
  hasDates: boolean,
  hasPrice: boolean
): AnnouncementStatus {
  const val = String(rawStatus || '').trim().toLowerCase();
  if (val === 'withdrawn') return 'withdrawn';
  if (val === 'postponed') return 'postponed';
  if (val === 'announced') {
    return hasDates ? 'dates_announced' : 'expected';
  }
  if (val === 'upcoming') {
    if (hasDates && hasPrice) return 'confirmed';
    if (hasDates) return 'dates_announced';
    return 'expected';
  }
  return hasDates ? 'confirmed' : 'awaiting_details';
}

function mapCategoryAndExchange(item: Record<string, unknown>): {
  sourceType: string;
  category: IPOCategory;
  exchange: IPOExchange;
} {
  const rawType = String(item.type ?? item.category ?? item['Issue Category'] ?? 'EQ')
    .trim()
    .toUpperCase();
  const rawExchange = String(item.exchange ?? item['Listing at'] ?? '')
    .trim()
    .toUpperCase();
  const nseUrl = String(item.nseInfoUrl ?? '').toLowerCase();
  const infoUrl = String(item.infoUrl ?? '').toLowerCase();
  const isSme =
    rawType === 'SME' ||
    rawExchange.includes('SME') ||
    rawExchange.includes('EMERGE');

  if (isSme) {
    const isBseSme =
      rawExchange.includes('BSE') || (!rawExchange.includes('NSE') && infoUrl.includes('bse'));
    return {
      sourceType: 'SME',
      category: 'SME',
      exchange: isBseSme ? 'BSE SME' : 'NSE Emerge',
    };
  }

  let exchange: IPOExchange = 'NSE, BSE';
  if (
    (rawExchange.includes('NSE') && !rawExchange.includes('BSE')) ||
    (nseUrl.includes('nseindia.com') && rawExchange && !rawExchange.includes('BSE'))
  ) {
    exchange = 'NSE';
  } else if (rawExchange.includes('BSE') && !rawExchange.includes('NSE')) {
    exchange = 'BSE';
  }

  return {
    sourceType: rawType === 'DEBT' ? 'DEBT' : 'EQ',
    category: 'Mainboard',
    exchange,
  };
}

function mapRawIpoRecord(raw: unknown): IpoAlertsMappedRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const nameRaw = String(item.name ?? item.companyName ?? item.symbol ?? '').trim();
  if (!nameRaw) return null;

  const { sourceType, category, exchange } = mapCategoryAndExchange(item);
  const priceBand = parsePriceBand(item);
  const scheduleDates = extractScheduleDates(item.schedule);

  const rawMinQty = Number(item.minQty ?? item.lotSize ?? item.lot_size);
  const lotSize =
    Number.isFinite(rawMinQty) && rawMinQty >= 1 ? Math.floor(rawMinQty) : undefined;

  const prospectusUrl = sanitizeHttpUrl(item.prospectusUrl ?? item.rhpUrl ?? item.drhpUrl);
  const isDrhp = Boolean(prospectusUrl && /drhp/i.test(prospectusUrl));

  const slugBase = String(item.slug || nameRaw);
  const normalizedSlug = toSafeSlug(slugBase.endsWith('-ipo') ? slugBase : `${slugBase}-ipo`);

  const openDate = normalizeDateString(item.startDate ?? item.openDate ?? item.open_date);
  const closeDate = normalizeDateString(item.endDate ?? item.closeDate ?? item.close_date);
  const hasDates = Boolean(openDate || closeDate);
  const hasPrice = Boolean(priceBand.min || priceBand.max);

  return {
    external_id: String(item.id ?? item._id ?? item.slug ?? normalizedSlug).slice(0, 128),
    symbol:
      typeof item.symbol === 'string' && item.symbol.trim()
        ? item.symbol.trim().slice(0, 40)
        : undefined,
    companyName: nameRaw.slice(0, 250),
    slug: normalizedSlug,
    sourceType,
    category,
    exchange,
    status: mapStatus(item.status),
    announcement_status: mapAnnouncementStatus(item.status, hasDates, hasPrice),
    open_date: openDate,
    close_date: closeDate,
    allotment_date: normalizeDateString(item.allotmentDate) ?? scheduleDates.allotment_date,
    refund_date: normalizeDateString(item.refundDate) ?? scheduleDates.refund_date,
    demat_credit_date:
      normalizeDateString(item.dematDate ?? item.creditDate) ?? scheduleDates.demat_credit_date,
    listing_date: normalizeDateString(item.listingDate ?? item.listing_date) ?? scheduleDates.listing_date,
    price_band_min: priceBand.min,
    price_band_max: priceBand.max,
    lot_size: lotSize,
    issue_size: parseIssueSizeCrores(item.issueSize ?? item.issue_size),
    description: stripHtmlTags(item.about ?? item.description, 8000),
    drhp_url: isDrhp ? prospectusUrl : undefined,
    rhp_url: prospectusUrl && !isDrhp ? prospectusUrl : undefined,
    official_source_url: sanitizeHttpUrl(item.nseInfoUrl ?? item.infoUrl),
    logo_url: sanitizeHttpUrl(item.logo),
    data_source: 'ipoalerts',
  };
}

// =====================================================================
// Live Public Indian IPO Feed (Mainboard & SME, All Statuses, No Quota)
// =====================================================================

function parseEstimatedSizeHtml(raw: unknown): {
  issue_size?: number;
  fresh_issue_size?: number;
  offer_for_sale_size?: number;
} {
  if (typeof raw !== 'string' || !raw.trim()) return {};
  const text = raw.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let freshAmt: number | undefined;
  let ofsAmt: number | undefined;
  let genericAmt: number | undefined;

  for (const line of lines) {
    // Only capture Rupee crore/lakh amounts (ignore pure share counts like "2.685 cr. shares")
    const rsMatch = line.match(/rs\.?\s*([0-9,]+(?:\.[0-9]+)?)\s*(cr|crore|crores|lakh|lakhs)?/i);
    if (!rsMatch) continue;
    const rawNum = Number(rsMatch[1].replace(/,/g, ''));
    if (!Number.isFinite(rawNum) || rawNum <= 0) continue;
    const unit = (rsMatch[2] || 'cr').toLowerCase();
    const crores = unit.startsWith('lakh') ? Number((rawNum / 100).toFixed(2)) : Number(rawNum.toFixed(2));

    if (/fresh/i.test(line)) {
      freshAmt = crores;
    } else if (/ofs|offer\s*for\s*sale/i.test(line)) {
      ofsAmt = crores;
    } else if (genericAmt === undefined) {
      genericAmt = crores;
    }
  }

  let total: number | undefined;
  if (freshAmt !== undefined && ofsAmt !== undefined) {
    total = Number((freshAmt + ofsAmt).toFixed(2));
  } else if (freshAmt !== undefined) {
    total = freshAmt;
  } else if (ofsAmt !== undefined) {
    total = ofsAmt;
  } else if (genericAmt !== undefined) {
    total = genericAmt;
  }

  return {
    issue_size: total,
    fresh_issue_size: freshAmt,
    offer_for_sale_size: ofsAmt,
  };
}

function mapChittorgarhRow(
  raw: unknown,
  todayIst: string
): {
  record: IpoAlertsMappedRecord;
  bucket: 'open' | 'upcoming' | 'announced' | 'closed' | 'listed';
  sortDate: string;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;

  const rawCompanyHtml =
    typeof row['Company'] === 'string'
      ? row['Company'].replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, ' ')
      : row['Company'];
  const companyName =
    stripHtmlTags(rawCompanyHtml, 250) ||
    stripHtmlTags(row['~IPO'], 250);
  if (!companyName) return null;

  const { sourceType, category, exchange } = mapCategoryAndExchange(row);
  const priceBand = parsePriceBand(row);

  // Only trust ISO dates when display date is populated (prevents synthetic TBA sort dates)
  const openDisp = String(row['Opening Date'] || '').trim();
  const closeDisp = String(row['Closing Date'] || '').trim();
  const listDisp = String(row['Listing Date'] || '').trim();

  const openDate = openDisp
    ? normalizeDateString(row['~Issue_Open_Date']) ?? normalizeDateString(openDisp)
    : undefined;
  const closeDate = closeDisp
    ? normalizeDateString(row['~IssueCloseDate']) ?? normalizeDateString(closeDisp)
    : undefined;
  const listingDate = listDisp
    ? normalizeDateString(row['~ListingDate']) ?? normalizeDateString(listDisp)
    : openDate || closeDate
    ? normalizeDateString(row['~ListingDate'])
    : undefined;

  let bucket: 'open' | 'upcoming' | 'announced' | 'closed' | 'listed' = 'announced';
  if (!openDate && !closeDate) {
    bucket = 'announced';
  } else if (listDisp && listingDate && todayIst >= listingDate) {
    bucket = 'listed';
  } else if (listingDate && todayIst >= listingDate && closeDate && todayIst > closeDate) {
    bucket = 'listed';
  } else if (closeDate && todayIst > closeDate) {
    bucket = 'closed';
  } else if (openDate && todayIst >= openDate) {
    bucket = 'open';
  } else if (openDate && todayIst < openDate) {
    bucket = 'upcoming';
  }

  const slugBase = String(row['~URLRewrite_Folder_Name'] || row['~IPO'] || companyName);
  const normalizedSlug = toSafeSlug(slugBase.endsWith('-ipo') ? slugBase : `${slugBase}-ipo`);
  const issueSize =
    parseIssueSizeCrores(row['Total Issue Amount (Incl.Firm reservations) (Rs.cr.)']) ??
    parseIssueSizeCrores(row['Issue Amount (Rs.cr.)']);
  const freshIssueSize = parseIssueSizeCrores(row['Fresh Capital (Rs.cr.)']);
  const ofsSize = parseIssueSizeCrores(row['Offer for sale (Rs.cr.)']);

  const nseSymbol = typeof row['~nse_symbol'] === 'string' ? row['~nse_symbol'].trim() : '';
  const officialUrl = extractAnchorHref(row['Company']);
  const logoUrl = sanitizeHttpUrl(row['~compare_image']);
  const hasDates = Boolean(openDate || closeDate);
  const hasPrice = Boolean(priceBand.min || priceBand.max);

  const record: IpoAlertsMappedRecord = {
    external_id: `cg-${normalizedSlug}`.slice(0, 128),
    symbol: nseSymbol ? nseSymbol.slice(0, 40) : undefined,
    companyName,
    slug: normalizedSlug,
    sourceType,
    category,
    exchange,
    status: mapStatus(bucket),
    announcement_status: mapAnnouncementStatus(bucket, hasDates, hasPrice),
    pipeline_stage: hasDates ? 'dated' : 'drhp_filed',
    open_date: openDate,
    close_date: closeDate,
    listing_date: listingDate,
    price_band_min: priceBand.min,
    price_band_max: priceBand.max,
    issue_size: issueSize,
    fresh_issue_size: freshIssueSize,
    offer_for_sale_size: ofsSize,
    official_source_url: officialUrl,
    logo_url: logoUrl,
    data_source: 'public_feed',
  };

  return {
    record,
    bucket,
    sortDate: openDate || listingDate || closeDate || '0000-01-01',
  };
}

function mapChittorgarhPipelineRow(
  raw: unknown,
  defaultCategory: IPOCategory
): {
  record: IpoAlertsMappedRecord;
  bucket: 'upcoming' | 'announced';
  sortDate: string;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;

  const rawCompanyHtml =
    typeof row['Company'] === 'string'
      ? row['Company'].replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, ' ')
      : row['Company'];
  const companyName = stripHtmlTags(rawCompanyHtml, 250) || stripHtmlTags(row['~IPO'], 250);
  if (!companyName) return null;

  const rawExchange = String(row['Exchange'] || '').trim().toUpperCase();
  const isSme =
    defaultCategory === 'SME' ||
    rawExchange.includes('SME') ||
    rawExchange.includes('EMERGE');

  let category: IPOCategory = isSme ? 'SME' : 'Mainboard';
  let exchange: IPOExchange;
  if (isSme) {
    if (rawExchange.includes('BSE') && !rawExchange.includes('NSE')) {
      exchange = 'BSE SME';
    } else if (rawExchange.includes('NSE') && !rawExchange.includes('BSE')) {
      exchange = 'NSE Emerge';
    } else if (rawExchange.includes('BSE')) {
      exchange = 'BSE SME';
    } else {
      exchange = 'NSE Emerge';
    }
  } else {
    if (rawExchange.includes('NSE') && !rawExchange.includes('BSE')) {
      exchange = 'NSE';
    } else if (rawExchange.includes('BSE') && !rawExchange.includes('NSE')) {
      exchange = 'BSE';
    } else {
      exchange = 'NSE, BSE';
    }
  }

  const slugBase = String(row['~URLRewrite_Folder_Name'] || row['~IPO'] || companyName);
  const normalizedSlug = toSafeSlug(slugBase.endsWith('-ipo') ? slugBase : `${slugBase}-ipo`);

  const statusRaw = String(row['Status'] || '').trim();
  const isApproved = /approv(al|ed)\s*received/i.test(statusRaw);
  const drhpDate = normalizeDateString(row['DRHP Filing Date']);
  const approvalDate = normalizeDateString(row['Approval Date']);
  const industry = stripHtmlTags(row['Industry'], 180);
  const leadManager = stripHtmlTags(row['Left Lead Manager'], 180);
  const saleType = stripHtmlTags(row['Sale Type'], 120);
  const sizeInfo = parseEstimatedSizeHtml(row['Estimated Issue Size']);
  const logoUrl = sanitizeHttpUrl(row['~compare_image']);
  const rawId = row['~id'];
  const officialUrl =
    rawId && normalizedSlug
      ? sanitizeHttpUrl(`https://www.chittorgarh.com/ipo/${normalizedSlug}/${String(rawId)}/`)
      : extractAnchorHref(row['Company']);

  const descParts: string[] = [];
  if (statusRaw) descParts.push(`SEBI/Exchange Status: ${statusRaw}.`);
  if (saleType) descParts.push(`Issue Structure: ${saleType}.`);
  if (drhpDate) descParts.push(`DRHP Filed: ${drhpDate}.`);
  if (approvalDate) descParts.push(`Approval Received: ${approvalDate}.`);
  if (leadManager) descParts.push(`Lead Manager: ${leadManager}.`);

  const record: IpoAlertsMappedRecord = {
    external_id: `cg-pipe-${defaultCategory.toLowerCase()}-${normalizedSlug}`.slice(0, 128),
    companyName,
    slug: normalizedSlug,
    sourceType: category === 'SME' ? 'SME' : 'EQ',
    category,
    exchange,
    status: 'upcoming',
    announcement_status: 'expected',
    industry,
    pipeline_stage: isApproved ? 'approval_received' : 'drhp_filed',
    drhp_filing_date: drhpDate,
    sebi_approval_date: approvalDate,
    issue_size: sizeInfo.issue_size,
    fresh_issue_size: sizeInfo.fresh_issue_size,
    offer_for_sale_size: sizeInfo.offer_for_sale_size,
    description: descParts.length > 0 ? descParts.join(' ') : undefined,
    official_source_url: officialUrl,
    logo_url: logoUrl,
    data_source: 'public_feed',
  };

  return {
    record,
    bucket: isApproved ? 'upcoming' : 'announced',
    sortDate: approvalDate || drhpDate || '0000-01-01',
  };
}

async function fetchChittorgarhReport(reportId: number, month: number, year: number, fy: string): Promise<unknown[]> {
  // Hardcoded upstream origin — no user-controlled host (prevents SSRF)
  const targetUrl = `${CHITTORGARH_BASE_URL}/cloud/report/data-read/${reportId}/1/${month}/${year}/${fy}/0/all/0?search=&v=16-01`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        Referer: 'https://www.chittorgarh.com/',
        Origin: 'https://www.chittorgarh.com',
      },
      signal: controller.signal,
    });
    if (!upstreamRes.ok) {
      throw new Error(`HTTP ${upstreamRes.status}`);
    }
    const rawBody = (await upstreamRes.json().catch(() => null)) as {
      reportTableData?: unknown[];
    } | null;
    return Array.isArray(rawBody?.reportTableData) ? rawBody.reportTableData : [];
  } finally {
    clearTimeout(timeout);
  }
}

async function loadChittorgarhFeedRows(bypassCache: boolean): Promise<{
  records: PublicFeedCacheEntry['records'];
  cached: boolean;
  fetchedAt: string;
}> {
  const nowMs = Date.now();
  if (!bypassCache && publicFeedCache && publicFeedCache.expiresAt > nowMs) {
    return {
      records: publicFeedCache.records,
      cached: true,
      fetchedAt: publicFeedCache.fetchedAt,
    };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const fyStart = month >= 4 ? year : year - 1;
  const fy = `${fyStart}-${String(fyStart + 1).slice(-2)}`;

  // Fetch all 3 live Indian IPO feeds in parallel:
  // - Report 82: Mainboard & SME IPO Calendar (Open, Dated Upcoming, Closed, Listed)
  // - Report 158: Upcoming Mainboard IPOs (SEBI Approved & DRHP Filed — NSE/BSE)
  // - Report 154: Upcoming SME IPOs (Exchange Approved & DRHP Filed — NSE Emerge & BSE SME)
  const [calendarRes, mainPipelineRes, smePipelineRes] = await Promise.allSettled([
    fetchChittorgarhReport(82, month, year, fy),
    fetchChittorgarhReport(158, month, year, fy),
    fetchChittorgarhReport(154, month, year, fy),
  ]);

  if (
    calendarRes.status === 'rejected' &&
    mainPipelineRes.status === 'rejected' &&
    smePipelineRes.status === 'rejected'
  ) {
    throw Object.assign(
      new Error('Could not reach the live Indian IPO feeds right now. Please try again shortly.'),
      { statusCode: 502 }
    );
  }

  const todayIst = getTodayIST();
  const mapped: PublicFeedCacheEntry['records'] = [];
  const seenSlugs = new Set<string>();
  const seenNames = new Set<string>();

  const registerRecord = (entry: PublicFeedCacheEntry['records'][number] | null) => {
    if (!entry) return;
    const slugKey = entry.record.slug.toLowerCase();
    const nameKey = entry.record.companyName
      .toLowerCase()
      .replace(/\b(limited|ltd|ipo)\b/g, '')
      .replace(/[^a-z0-9]/g, '');
    if (seenSlugs.has(slugKey) || (nameKey.length >= 4 && seenNames.has(nameKey))) {
      return;
    }
    seenSlugs.add(slugKey);
    if (nameKey.length >= 4) seenNames.add(nameKey);
    mapped.push(entry);
  };

  if (calendarRes.status === 'fulfilled') {
    for (const row of calendarRes.value) {
      registerRecord(mapChittorgarhRow(row, todayIst));
    }
  }
  if (mainPipelineRes.status === 'fulfilled') {
    for (const row of mainPipelineRes.value) {
      registerRecord(mapChittorgarhPipelineRow(row, 'Mainboard'));
    }
  }
  if (smePipelineRes.status === 'fulfilled') {
    for (const row of smePipelineRes.value) {
      registerRecord(mapChittorgarhPipelineRow(row, 'SME'));
    }
  }

  const fetchedAt = new Date().toISOString();
  publicFeedCache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    fetchedAt,
    records: mapped,
  };

  return { records: mapped, cached: false, fetchedAt };
}

async function fetchFromPublicIndianFeed(params: {
  status: string;
  typeParam: string;
  exchangeParam?: string;
  searchParam?: string;
  page: number;
  limit: number;
  identifier?: string;
  bypassCache: boolean;
  notice?: string;
}): Promise<IpoAlertsFetchResult> {
  const { records, cached, fetchedAt } = await loadChittorgarhFeedRows(params.bypassCache);

  let filtered = records;

  if (params.identifier) {
    const q = params.identifier.trim().toLowerCase();
    const qSlug = toSafeSlug(q);
    filtered = records.filter(
      ({ record }) =>
        record.slug.toLowerCase().includes(q) ||
        record.slug.toLowerCase().includes(qSlug) ||
        record.companyName.toLowerCase().includes(q) ||
        (record.symbol && record.symbol.toLowerCase() === q)
    );
  } else {
    if (params.status === 'open_and_upcoming') {
      filtered = filtered.filter(
        ({ bucket }) => bucket === 'open' || bucket === 'upcoming' || bucket === 'announced'
      );
    } else if (params.status === 'upcoming') {
      // Include dated upcoming, SEBI/Exchange Approval Received, AND DRHP Filed pipeline IPOs
      filtered = filtered.filter(({ bucket }) => bucket === 'upcoming' || bucket === 'announced');
    } else {
      filtered = filtered.filter(({ bucket }) => bucket === params.status);
    }

    if (params.typeParam === 'EQ') {
      filtered = filtered.filter(({ record }) => record.category === 'Mainboard');
    } else if (params.typeParam === 'SME') {
      filtered = filtered.filter(({ record }) => record.category === 'SME');
    }

    if (params.exchangeParam && params.exchangeParam !== 'all') {
      const exFilter = params.exchangeParam.toLowerCase();
      filtered = filtered.filter(({ record }) => {
        const recEx = record.exchange.toLowerCase();
        if (exFilter === 'nse_emerge') return recEx === 'nse emerge';
        if (exFilter === 'bse_sme') return recEx === 'bse sme';
        if (exFilter === 'nse_bse') return record.category === 'Mainboard';
        return recEx.includes(exFilter);
      });
    }

    if (params.searchParam) {
      const q = params.searchParam.toLowerCase();
      filtered = filtered.filter(
        ({ record }) =>
          record.companyName.toLowerCase().includes(q) ||
          record.slug.toLowerCase().includes(q) ||
          (record.industry && record.industry.toLowerCase().includes(q)) ||
          record.exchange.toLowerCase().includes(q)
      );
    }
  }

  // Smart ordering:
  // - For upcoming / open_and_upcoming:
  //   1. Open issues first (by nearest close_date)
  //   2. Dated upcoming issues next (by nearest open_date)
  //   3. SEBI/Exchange Approval Received pipeline next (newest approval/DRHP date first)
  //   4. DRHP Filed / Awaiting Approval pipeline last (newest DRHP date first)
  // - For closed / listed: descending by newest listing/close date
  const stageRank = (entry: PublicFeedCacheEntry['records'][number]): number => {
    if (entry.bucket === 'open') return 0;
    if (entry.record.pipeline_stage === 'dated' && entry.record.open_date) return 1;
    if (entry.record.pipeline_stage === 'approval_received') return 2;
    return 3;
  };

  const sorted = [...filtered].sort((a, b) => {
    if (
      params.status === 'upcoming' ||
      params.status === 'open' ||
      params.status === 'open_and_upcoming'
    ) {
      const ra = stageRank(a);
      const rb = stageRank(b);
      if (ra !== rb) return ra - rb;
      if (ra <= 1) {
        const da = a.record.open_date || '9999-12-31';
        const db = b.record.open_date || '9999-12-31';
        return da.localeCompare(db);
      }
      // Within Approval Received or DRHP Filed, show newest approval/DRHP date first
      return b.sortDate.localeCompare(a.sortDate);
    }
    if (params.status === 'announced') {
      return b.sortDate.localeCompare(a.sortDate);
    }
    const da = a.record.listing_date || a.record.close_date || a.record.open_date || '0000-01-01';
    const db = b.record.listing_date || b.record.close_date || b.record.open_date || '0000-01-01';
    return db.localeCompare(da);
  });

  const totalCount = sorted.length;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / params.limit) : 0;
  const safePage = totalPages > 0 ? Math.min(params.page, totalPages) : 1;
  const startIdx = (safePage - 1) * params.limit;
  const slice = sorted.slice(startIdx, startIdx + params.limit).map((x) => x.record);

  return {
    ipos: slice,
    meta: {
      count: totalCount,
      countOnPage: slice.length,
      totalPages,
      page: safePage,
      limit: params.limit,
    },
    cached,
    fetchedAt,
    quota: getIpoAlertsQuotaStatus(),
    provider: 'public_feed',
    upstreamNotice: params.notice,
  };
}

// =====================================================================
// Direct ipoalerts.in Upstream Request
// =====================================================================

async function fetchDirectFromIpoAlerts(params: {
  status: string;
  typeParam: string;
  page: number;
  limit: number;
  identifier: string;
  bypassCache: boolean;
}): Promise<IpoAlertsFetchResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw Object.assign(
      new Error(
        'IPOALERTS_API_KEY is not configured on the server. Add IPOALERTS_API_KEY in AI Studio Settings → Secrets.'
      ),
      { statusCode: 503 }
    );
  }

  const cacheKey = params.identifier
    ? `id:${params.identifier.toLowerCase()}`
    : `list:${params.status}:t${params.typeParam || 'all'}:p${params.page}:l${params.limit}`;

  const nowMs = Date.now();
  syncQuotaWindows(nowMs);

  if (!params.bypassCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > nowMs) {
      return {
        ipos: cached.ipos,
        meta: cached.meta,
        cached: true,
        fetchedAt: cached.fetchedAt,
        quota: getIpoAlertsQuotaStatus(),
        provider: cached.provider || 'ipoalerts',
        upstreamNotice: cached.upstreamNotice,
      };
    }
  }

  if (dailyRequestsUsed >= DAILY_QUOTA_LIMIT) {
    throw Object.assign(
      new Error(
        `Daily ipoalerts.in Free Plan quota reached (${DAILY_QUOTA_LIMIT}/${DAILY_QUOTA_LIMIT} requests used today). Quota resets at 00:00 UTC.`
      ),
      { statusCode: 429 }
    );
  }
  if (minuteTimestamps.length >= MINUTE_QUOTA_LIMIT) {
    throw Object.assign(
      new Error(
        `Rate limit guard active (${MINUTE_QUOTA_LIMIT} requests/minute on Free Plan). Please wait a few seconds and try again.`
      ),
      { statusCode: 429 }
    );
  }

  // Hardcoded upstream origin — no user-controlled host (prevents SSRF)
  let targetUrl: string;
  if (params.identifier) {
    targetUrl = `${IPOALERTS_BASE_URL}/ipos/${encodeURIComponent(params.identifier)}`;
  } else {
    const qs = new URLSearchParams({
      status: params.status,
      page: String(params.page),
      limit: String(Math.min(params.limit, 10)),
    });
    if (params.typeParam) {
      qs.set('type', params.typeParam);
    }
    targetUrl = `${IPOALERTS_BASE_URL}/ipos?${qs.toString()}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstreamRes: globalThis.Response;
  try {
    dailyRequestsUsed += 1;
    minuteTimestamps.push(Date.now());

    upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    throw Object.assign(
      new Error(
        isAbort
          ? 'ipoalerts.in API request timed out. Please try again.'
          : 'Could not reach ipoalerts.in API right now. Please try again shortly.'
      ),
      { statusCode: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = (await upstreamRes.json().catch(() => null)) as Record<string, unknown> | null;

  if (!upstreamRes.ok) {
    const upstreamMsg =
      typeof rawBody?.message === 'string'
        ? rawBody.message
        : typeof rawBody?.error === 'string'
        ? rawBody.error
        : '';

    if (upstreamRes.status === 401) {
      throw Object.assign(
        new Error(
          'ipoalerts.in rejected the API key (401 Unauthorized). Check IPOALERTS_API_KEY in Secrets.'
        ),
        { statusCode: 401 }
      );
    }
    if (upstreamRes.status === 403) {
      throw Object.assign(
        new Error(
          upstreamMsg ||
            `Query (status=${params.status}) is restricted on the ipoalerts.in Free Plan (which only permits status=open, limit=1).`
        ),
        { statusCode: 403 }
      );
    }
    if (upstreamRes.status === 404) {
      throw Object.assign(
        new Error('No matching IPO found on ipoalerts.in for that slug/symbol.'),
        { statusCode: 404 }
      );
    }
    if (upstreamRes.status === 429) {
      throw Object.assign(
        new Error(
          'ipoalerts.in rate limit reached (Free Plan: 6 req/min, 25 req/day). Please try again later.'
        ),
        { statusCode: 429 }
      );
    }
    throw Object.assign(
      new Error(upstreamMsg || `ipoalerts.in API returned HTTP ${upstreamRes.status}.`),
      { statusCode: 502 }
    );
  }

  let rawItems: unknown[] = [];
  if (Array.isArray(rawBody?.ipos)) {
    rawItems = rawBody.ipos;
  } else if (Array.isArray(rawBody?.data)) {
    rawItems = rawBody.data;
  } else if (rawBody?.ipo && typeof rawBody.ipo === 'object') {
    rawItems = [rawBody.ipo];
  } else if (rawBody && typeof rawBody === 'object' && ('name' in rawBody || 'symbol' in rawBody)) {
    rawItems = [rawBody];
  }

  const mapped = rawItems
    .map(mapRawIpoRecord)
    .filter((rec): rec is IpoAlertsMappedRecord => rec !== null);

  const rawMeta = (rawBody?.meta as Record<string, unknown> | undefined) || {};
  const meta = {
    count: Number(rawMeta.count) || mapped.length,
    countOnPage: Number(rawMeta.countOnPage) || mapped.length,
    totalPages: Number(rawMeta.totalPages) || (mapped.length > 0 ? 1 : 0),
    page: Number(rawMeta.page) || params.page,
    limit: Number(rawMeta.limit) || params.limit,
  };

  const upstreamNotice =
    typeof rawBody?.message === 'string' && rawBody.message.trim()
      ? rawBody.message.trim().slice(0, 300)
      : undefined;

  const fetchedAt = new Date().toISOString();
  responseCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    fetchedAt,
    ipos: mapped,
    meta,
    provider: 'ipoalerts',
    upstreamNotice,
  });

  if (responseCache.size > 50) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }

  return {
    ipos: mapped,
    meta,
    cached: false,
    fetchedAt,
    quota: getIpoAlertsQuotaStatus(),
    provider: 'ipoalerts',
    upstreamNotice,
  };
}

// =====================================================================
// Unified Entrypoint (Auto Hybrid: ipoalerts.in + Live Indian IPO Feed)
// =====================================================================

export async function fetchFromIpoAlerts(params: {
  status?: unknown;
  type?: unknown;
  page?: unknown;
  limit?: unknown;
  identifier?: unknown;
  bypassCache?: unknown;
  source?: unknown;
  search?: unknown;
  exchange?: unknown;
}): Promise<IpoAlertsFetchResult> {
  const rawStatusCheck =
    typeof params.status === 'string' ? params.status.trim().toLowerCase() : 'open';
  const rawSource =
    typeof params.source === 'string' ? params.source.trim().toLowerCase() : 'auto';
  const source: SyncProviderSource =
    rawSource === 'ipoalerts' || rawSource === 'public_feed' ? rawSource : 'auto';

  const identifierRaw =
    typeof params.identifier === 'string' ? params.identifier.trim() : '';
  if (identifierRaw && !IDENTIFIER_PATTERN.test(identifierRaw)) {
    throw Object.assign(
      new Error('Invalid IPO slug or symbol. Use letters, numbers, spaces, hyphens, or underscores only.'),
      { statusCode: 400 }
    );
  }

  const rawType =
    typeof params.type === 'string' ? params.type.trim().toUpperCase() : '';
  const typeParam = ALLOWED_TYPES.has(rawType) ? rawType : '';

  const searchParam =
    typeof params.search === 'string' ? params.search.trim().slice(0, 120) : '';
  const exchangeParam =
    typeof params.exchange === 'string' ? params.exchange.trim().slice(0, 40) : '';

  const pageNum = Number(params.page);
  const page = Number.isFinite(pageNum) ? Math.min(100, Math.max(1, Math.floor(pageNum))) : 1;

  const limitNum = Number(params.limit);
  const limit = Number.isFinite(limitNum) ? Math.min(200, Math.max(1, Math.floor(limitNum))) : 30;

  const bypassCache = Boolean(params.bypassCache);

  // Explicit Public Indian Feed mode — handles all statuses with zero ipoalerts quota
  if (source === 'public_feed') {
    const normalizedStatus =
      rawStatusCheck === 'open_and_upcoming'
        ? 'open_and_upcoming'
        : ALLOWED_STATUSES.has(rawStatusCheck)
        ? rawStatusCheck
        : 'upcoming';

    return fetchFromPublicIndianFeed({
      status: normalizedStatus,
      typeParam,
      exchangeParam,
      searchParam,
      page,
      limit,
      identifier: identifierRaw || undefined,
      bypassCache,
    });
  }

  // Combined one-click sync for Open + Upcoming together
  if (rawStatusCheck === 'open_and_upcoming' && !identifierRaw) {
    const settled = await Promise.allSettled([
      fetchFromIpoAlerts({ ...params, status: 'open', source }),
      fetchFromIpoAlerts({ ...params, status: 'upcoming', source }),
    ]);

    const combined: IpoAlertsMappedRecord[] = [];
    const seen = new Set<string>();
    const notices: string[] = [];
    let totalCount = 0;
    let maxPages = 1;
    let allCached = true;
    let anySucceeded = false;
    const providersUsed = new Set<string>();

    const labels = ['Open', 'Upcoming'];
    settled.forEach((outcome, idx) => {
      if (outcome.status === 'fulfilled') {
        anySucceeded = true;
        const r = outcome.value;
        if (!r.cached) allCached = false;
        if (r.provider) providersUsed.add(r.provider);
        totalCount += r.meta.count;
        maxPages = Math.max(maxPages, r.meta.totalPages);
        if (r.upstreamNotice) notices.push(`${labels[idx]}: ${r.upstreamNotice}`);
        for (const ipo of r.ipos) {
          const dedupeKey = ipo.slug.toLowerCase();
          if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            combined.push(ipo);
          }
        }
      } else {
        allCached = false;
        const msg =
          outcome.reason instanceof Error
            ? outcome.reason.message
            : `Could not fetch ${labels[idx].toLowerCase()} IPOs.`;
        notices.push(`${labels[idx]}: ${msg}`);
      }
    });

    if (!anySucceeded) {
      const firstErr = settled[0].status === 'rejected' ? settled[0].reason : settled[1];
      throw firstErr instanceof Error
        ? firstErr
        : new Error('Unable to fetch Open or Upcoming IPOs.');
    }

    const provider: 'ipoalerts' | 'public_feed' | 'hybrid' =
      providersUsed.size > 1
        ? 'hybrid'
        : providersUsed.has('public_feed')
        ? 'public_feed'
        : 'ipoalerts';

    return {
      ipos: combined,
      meta: {
        count: Math.max(totalCount, combined.length),
        countOnPage: combined.length,
        totalPages: maxPages,
        page,
        limit,
      },
      cached: allCached,
      fetchedAt: new Date().toISOString(),
      quota: getIpoAlertsQuotaStatus(),
      provider,
      upstreamNotice: notices.length > 0 ? notices.join(' | ').slice(0, 450) : undefined,
    };
  }

  const status = ALLOWED_STATUSES.has(rawStatusCheck) ? rawStatusCheck : 'open';

  // Explicit ipoalerts.in-only mode (no fallback)
  if (source === 'ipoalerts') {
    return fetchDirectFromIpoAlerts({
      status,
      typeParam,
      page,
      limit: Math.min(limit, 10),
      identifier: identifierRaw,
      bypassCache,
    });
  }

  // ===================================================================
  // AUTO HYBRID MODE (Default):
  // 1) Slug/Symbol lookup: try ipoalerts.in first, fall back to live Indian feed.
  // 2) Upcoming / Closed / Listed / Announced: ipoalerts.in Free Plan restricts
  //    these statuses (HTTP 403). Try once if not yet known blocked; on 403 or
  //    missing key/quota, seamlessly serve from Live Indian IPO Feeds (Calendar +
  //    Mainboard SEBI-Approved/DRHP + SME NSE Emerge & BSE SME pipelines)!
  // 3) Open: try ipoalerts.in (Free-Plan compatible) and merge/fallback to Live
  //    Indian IPO Feed when 403/quota/1-per-request cap prevents full list.
  // ===================================================================

  const apiKey = getApiKey();
  const isNonOpenList = !identifierRaw && status !== 'open';

  if (isNonOpenList) {
    // If search/exchange filter is applied OR Free Plan blocks this status OR no key/quota, use live multi-exchange Indian feed directly
    if (
      !apiKey ||
      dailyRequestsUsed >= DAILY_QUOTA_LIMIT ||
      freePlanBlockedStatuses.has(status) ||
      Boolean(searchParam) ||
      Boolean(exchangeParam && exchangeParam !== 'all')
    ) {
      const reason = !apiKey
        ? 'IPOALERTS_API_KEY not set — loaded live Indian IPO data (NSE, BSE, NSE Emerge & BSE SME) from Public Exchange Feeds.'
        : freePlanBlockedStatuses.has(status)
        ? `ipoalerts.in Free Plan restricts "${status}" to paid tiers — automatically loaded live Mainboard, NSE Emerge & BSE SME IPO pipeline (0 ipoalerts quota used).`
        : searchParam || (exchangeParam && exchangeParam !== 'all')
        ? 'Filtered live Mainboard, NSE Emerge & BSE SME IPO feeds (0 ipoalerts quota used).'
        : 'ipoalerts.in daily quota reached — automatically loaded live Indian IPO data from Public Exchange Feeds.';
      return fetchFromPublicIndianFeed({
        status,
        typeParam,
        exchangeParam,
        searchParam,
        page,
        limit,
        bypassCache,
        notice: reason,
      });
    }

    try {
      return await fetchDirectFromIpoAlerts({
        status,
        typeParam,
        page,
        limit: Math.min(limit, 10),
        identifier: '',
        bypassCache,
      });
    } catch (err) {
      const code = (err as { statusCode?: number })?.statusCode;
      if (code === 403) {
        freePlanBlockedStatuses.add(status);
      }
      if (code === 403 || code === 429 || code === 502 || code === 503) {
        return fetchFromPublicIndianFeed({
          status,
          typeParam,
          exchangeParam,
          searchParam,
          page,
          limit,
          bypassCache,
          notice:
            code === 403
              ? `ipoalerts.in Free Plan only allows "open" IPOs — automatically loaded live "${status}" Mainboard, NSE Emerge & BSE SME IPOs from Public Exchange Feeds.`
              : `ipoalerts.in unavailable (${err instanceof Error ? err.message : 'fallback'}) — loaded live "${status}" Indian IPOs from Public Exchange Feeds.`,
        });
      }
      throw err;
    }
  }

  // Slug / Symbol lookup in Auto mode
  if (identifierRaw) {
    if (apiKey && dailyRequestsUsed < DAILY_QUOTA_LIMIT) {
      try {
        return await fetchDirectFromIpoAlerts({
          status,
          typeParam: '',
          page: 1,
          limit: 1,
          identifier: identifierRaw,
          bypassCache,
        });
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code !== 401) {
          return fetchFromPublicIndianFeed({
            status: 'open',
            typeParam: '',
            page: 1,
            limit: 30,
            identifier: identifierRaw,
            bypassCache,
            notice: `Not returned by ipoalerts.in — searched Live Indian IPO Feeds (Calendar + Mainboard & SME DRHP pipeline) for "${identifierRaw}".`,
          });
        }
        throw err;
      }
    }
    return fetchFromPublicIndianFeed({
      status: 'open',
      typeParam: '',
      page: 1,
      limit: 30,
      identifier: identifierRaw,
      bypassCache,
    });
  }

  // Status === 'open' in Auto mode:
  if (!apiKey || dailyRequestsUsed >= DAILY_QUOTA_LIMIT) {
    return fetchFromPublicIndianFeed({
      status: 'open',
      typeParam,
      exchangeParam,
      searchParam,
      page,
      limit,
      bypassCache,
      notice: !apiKey
        ? 'IPOALERTS_API_KEY not set — loaded live Open IPOs from Public Exchange Feeds.'
        : 'ipoalerts.in daily quota reached — loaded live Open IPOs from Public Exchange Feeds.',
    });
  }

  try {
    const ipoAlertsRes = await fetchDirectFromIpoAlerts({
      status: 'open',
      typeParam: '',
      page,
      limit: Math.min(limit, 1),
      identifier: '',
      bypassCache,
    });

    if (limit > 1 || typeParam || searchParam || (exchangeParam && exchangeParam !== 'all')) {
      try {
        const publicRes = await fetchFromPublicIndianFeed({
          status: 'open',
          typeParam,
          exchangeParam,
          searchParam,
          page,
          limit,
          bypassCache,
        });

        const bySlug = new Map<string, IpoAlertsMappedRecord>();
        for (const rec of publicRes.ipos) {
          bySlug.set(rec.slug.toLowerCase(), rec);
        }
        for (const rec of ipoAlertsRes.ipos) {
          const matchesType =
            !typeParam ||
            typeParam === 'EQ,SME' ||
            (typeParam === 'EQ' && rec.category === 'Mainboard') ||
            (typeParam === 'SME' && rec.category === 'SME');
          if (!matchesType) continue;
          if (searchParam && !rec.companyName.toLowerCase().includes(searchParam.toLowerCase())) {
            continue;
          }

          const existing = bySlug.get(rec.slug.toLowerCase());
          if (existing) {
            bySlug.set(rec.slug.toLowerCase(), {
              ...existing,
              ...rec,
              fresh_issue_size: rec.fresh_issue_size ?? existing.fresh_issue_size,
              offer_for_sale_size: rec.offer_for_sale_size ?? existing.offer_for_sale_size,
              data_source: 'ipoalerts',
            });
          } else {
            bySlug.set(rec.slug.toLowerCase(), rec);
          }
        }

        const merged = Array.from(bySlug.values());
        return {
          ipos: merged,
          meta: {
            count: Math.max(publicRes.meta.count, merged.length),
            countOnPage: merged.length,
            totalPages: Math.max(publicRes.meta.totalPages, 1),
            page,
            limit,
          },
          cached: ipoAlertsRes.cached && publicRes.cached,
          fetchedAt: new Date().toISOString(),
          quota: getIpoAlertsQuotaStatus(),
          provider: 'hybrid',
          upstreamNotice:
            'Combined ipoalerts.in API (detailed lot/prospectus data) with Live Indian IPO Feeds for full Mainboard & SME coverage.',
        };
      } catch {
        return ipoAlertsRes;
      }
    }

    return ipoAlertsRes;
  } catch (err) {
    const code = (err as { statusCode?: number })?.statusCode;
    if (code === 403 || code === 429 || code === 502 || code === 503) {
      return fetchFromPublicIndianFeed({
        status: 'open',
        typeParam,
        exchangeParam,
        searchParam,
        page,
        limit,
        bypassCache,
        notice: `ipoalerts.in returned ${code} — automatically loaded live Open IPOs from Public Exchange Feeds.`,
      });
    }
    throw err;
  }
}
