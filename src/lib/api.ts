// =====================================================================
// Frontend Data & Admin Service: src/lib/api.ts
// Permanently backed by Cloud Firestore (db) so all IPOs, Unlisted Prices,
// Subscriptions, Clients & Fee Payments, Authorized Admins, Applications,
// Audit Logs, Feed Runs, and Settings persist permanently across republishes.
// =====================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  BOOTSTRAP_ADMIN_EMAIL,
  toAuthorizedAdminKey,
  OperationType,
  handleFirestoreError,
} from './firebase';
import {
  IPO,
  Company,
  GMPSnapshot,
  SubscriptionSnapshot,
  ListingResult,
  MarketSummary,
  FeedRun,
  AuditLog,
  AdminUser,
  IPOSource,
  IPOCategory,
  IPOExchange,
  IPOStatus,
  AnnouncementStatus,
  InvestorLotCategory,
  CategoryLotLimitsMap,
  MinInvestmentMultiples,
  ClientRecord,
  ClientFeePayment,
  ClientStatus,
  FeePaymentStatus,
  AuthorizedAdminEntry,
  PaymentMode,
  SitePolicy,
  SitePolicyCategory,
  SitePolicySection,
  SitePageKey,
  SitePageContent,
} from '../types/ipo';
import {
  calculateListingGainPercentage,
  calculateIndicativeGainPercentage,
  deriveIPOStatusFromDates,
  getValidDocUrl,
  INVESTOR_LOT_CATEGORIES,
} from './calculations';
import { DEFAULT_SITE_POLICIES } from './defaultPolicies';
import {
  DEFAULT_SITE_PAGES,
  SITE_PAGE_KEYS,
  cloneDefaultSitePages,
  mergeSitePages,
} from './defaultPageContent';

export interface AppSettingsData {
  gmpStalenessHours: number;
  subStalenessHours: number;
  seeded: boolean;
  policiesCustomized?: boolean;
}

export interface IPOApplication {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  ipoId: string;
  ipoSlug: string;
  companyName: string;
  category: IPOCategory;
  investorCategory: InvestorLotCategory;
  lots: number;
  shares: number;
  bidPrice: number;
  totalAmount: number;
  upiId: string;
  pan: string;
  status: 'submitted' | 'cancelled';
  created_at: string;
}

export interface IpoAlertsQuotaStatus {
  configured: boolean;
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  minuteLimit: number;
  minuteUsed: number;
  cacheTtlSeconds: number;
  quotaDateUtc: string;
}

export interface IpoAlertsCandidate {
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

export interface IpoAlertsFetchResponse {
  ipos: IpoAlertsCandidate[];
  meta: {
    count: number;
    countOnPage: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  cached: boolean;
  fetchedAt: string;
  quota: IpoAlertsQuotaStatus;
  provider?: 'ipoalerts' | 'public_feed' | 'hybrid';
  upstreamNotice?: string;
}

export interface IpoAlertsSaveReport {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  savedIPOs: Array<{ name: string; slug: string; action: 'created' | 'updated' }>;
}

const VALID_EXCHANGES: IPOExchange[] = ['NSE', 'BSE', 'NSE, BSE', 'BSE SME', 'NSE Emerge'];
const VALID_STATUSES: IPOStatus[] = [
  'upcoming',
  'ongoing',
  'closed',
  'listed',
  'postponed',
  'withdrawn',
];
const VALID_ANNOUNCEMENT_STATUSES: AnnouncementStatus[] = [
  'confirmed',
  'dates_announced',
  'expected',
  'awaiting_details',
  'postponed',
  'withdrawn',
];

const CONFIGURED_SOURCES: IPOSource[] = [
  {
    id: '11111111-1111-1111-1111-111111110001',
    provider_name: 'NSE Official Ingestion Feed',
    source_type: 'exchange',
    base_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    enabled: true,
    configuration: { rate_limit: '60/min', priority: 1, automated: true },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '11111111-1111-1111-1111-111111110002',
    provider_name: 'BSE Listing & Public Offerings',
    source_type: 'exchange',
    base_url: 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx',
    enabled: true,
    configuration: { rate_limit: '60/min', priority: 1, automated: true },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '11111111-1111-1111-1111-111111110003',
    provider_name: 'SEBI Public Issues Repository',
    source_type: 'regulatory',
    base_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    enabled: true,
    configuration: { priority: 2, legal_documents: true },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '11111111-1111-1111-1111-111111110004',
    provider_name: 'Unlisted Market Reference Feed A',
    source_type: 'community_estimate',
    base_url: 'https://www.investorgain.com',
    enabled: true,
    configuration: {
      disclaimer: 'Informational unlisted price reference (non-GMP)',
      speculative: true,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '11111111-1111-1111-1111-111111110005',
    provider_name: 'Unlisted Market Reference Feed B',
    source_type: 'community_estimate',
    base_url: 'https://ipowatch.in',
    enabled: true,
    configuration: {
      disclaimer: 'Informational pre-listing reference observations',
      speculative: true,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '11111111-1111-1111-1111-111111110006',
    provider_name: 'Registrar Direct Feed (Link Intime & KFin)',
    source_type: 'registrar',
    base_url: 'https://linkintime.co.in',
    enabled: true,
    configuration: { priority: 1, allotment_status: true },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// --- Helpers ---

function isPlainObject(val: unknown): val is Record<string, unknown> {
  if (!val || typeof val !== 'object') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively removes undefined/null keys from plain objects so Firestore writes
 * never fail on undefined values, while leaving Firestore FieldValue / Timestamp untouched.
 */
function stripEmpty<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined && item !== null)
      .map((item) => stripEmpty(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined || v === null) continue;
      out[k] = stripEmpty(v);
    }
    return out as T;
  }
  return value;
}

const IPO_IMMUTABLE_KEYS = new Set(['id', 'company_id', 'created_at', 'createdAt']);
const CLIENT_IMMUTABLE_KEYS = new Set(['id', 'created_at', 'createdAt']);
const POLICY_IMMUTABLE_KEYS = new Set(['id', 'created_at', 'createdAt']);
const SITE_PAGE_IMMUTABLE_KEYS = new Set(['id', 'page_key', 'created_at', 'createdAt']);

/**
 * Builds a strict `updateDoc` patch from a validated full document payload so
 * immutable fields (`id`, `company_id`, `created_at`, `createdAt`) are NEVER sent
 * or overwritten, while removed optional fields are cleanly cleared via `deleteField()`.
 */
function buildUpdatePatch(
  existingRaw: Record<string, unknown>,
  nextDoc: Record<string, unknown>,
  immutableKeys: ReadonlySet<string>
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(nextDoc)) {
    if (immutableKeys.has(k)) continue;
    patch[k] = v;
  }
  for (const k of Object.keys(existingRaw)) {
    if (immutableKeys.has(k)) continue;
    if (!(k in nextDoc)) {
      patch[k] = deleteField();
    }
  }
  return patch;
}

function generateId(prefix: string): string {
  const rand = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
  return `${prefix}-${Date.now()}-${rand}`;
}

function makeSafeSlug(raw: string, fallbackPrefix: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 140);
  return cleaned.length > 0 ? cleaned : `${fallbackPrefix}-${Date.now()}`;
}

function truncateUtf8(str: string, maxBytes: number): string {
  if (str.length <= maxBytes) {
    // Fast path for ASCII strings
    let isAscii = true;
    for (let i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) > 0x7f) {
        isAscii = false;
        break;
      }
    }
    if (isAscii) return str;
  }
  const encoder = new TextEncoder();
  if (encoder.encode(str).length <= maxBytes) return str;
  let out = '';
  let usedBytes = 0;
  for (const ch of str) {
    const chBytes = encoder.encode(ch).length;
    if (usedBytes + chBytes > maxBytes) break;
    out += ch;
    usedBytes += chBytes;
  }
  return out;
}

function optionalString(val: unknown, maxLen: number): string | undefined {
  if (val === undefined || val === null) return undefined;
  const str = String(val).trim();
  if (!str) return undefined;
  return truncateUtf8(str, maxLen);
}

function optionalNumber(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(val);
  if (!Number.isFinite(num)) return undefined;
  return num;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const VALID_SLUG_REGEX = /^[a-z0-9-]{1,160}$/;
const ALLOWED_IPO_KEYS = new Set([
  'id', 'company_id', 'company', 'slug', 'category', 'exchange',
  'status', 'announcement_status', 'visibility',
  'open_date', 'close_date', 'allotment_date', 'refund_date', 'demat_credit_date', 'listing_date',
  'price_band_min', 'price_band_max', 'issue_price', 'lot_size',
  'issue_size', 'fresh_issue_size', 'offer_for_sale_size',
  'retail_quota_percent', 'qib_quota_percent', 'nii_quota_percent',
  'employee_quota_percent', 'shareholder_quota_percent', 'other_quota_percent',
  'category_lot_limits', 'min_investment_multiples',
  'registrar_name', 'registrar_url', 'drhp_url', 'rhp_url', 'official_source_url',
  'data_verified_at', 'published_at', 'created_at', 'updated_at',
  'latest_gmp', 'previous_gmp', 'gmp_history',
  'latest_subscription', 'subscription_history', 'listing_result', 'important_dates',
  'updatedBy', 'createdAt', 'updatedAt',
]);

function summarizePayloadShape(payload: Record<string, unknown>): Record<string, unknown> {
  const shape: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === 'string') {
      shape[k] = `string(${v.length})`;
    } else if (typeof v === 'number') {
      shape[k] = Number.isInteger(v) ? 'int' : 'float';
    } else if (typeof v === 'boolean') {
      shape[k] = 'bool';
    } else if (Array.isArray(v)) {
      shape[k] = `list(${v.length})`;
    } else if (isPlainObject(v)) {
      shape[k] = `map(${Object.keys(v).join(',')})`;
    } else if (v === null) {
      shape[k] = 'null';
    } else {
      shape[k] = 'fieldValue';
    }
  }
  return { keyCount: Object.keys(payload).length, shape };
}

function assertValidIPODocPayload(
  docPayload: Record<string, unknown>,
  expectedIpoId: string,
  expectedUid: string
): void {
  const issues: string[] = [];
  for (const key of Object.keys(docPayload)) {
    if (!ALLOWED_IPO_KEYS.has(key)) {
      issues.push(`unexpected key "${key}"`);
    }
  }
  if (docPayload.id !== expectedIpoId || !VALID_ID_REGEX.test(String(docPayload.id || ''))) {
    issues.push('invalid id');
  }
  if (!VALID_ID_REGEX.test(String(docPayload.company_id || ''))) {
    issues.push('invalid company_id');
  }
  if (!VALID_SLUG_REGEX.test(String(docPayload.slug || ''))) {
    issues.push('invalid slug');
  }
  if (docPayload.updatedBy !== expectedUid || !VALID_ID_REGEX.test(String(docPayload.updatedBy || ''))) {
    issues.push('invalid updatedBy');
  }
  const comp = docPayload.company as Record<string, unknown> | undefined;
  if (!comp || !isPlainObject(comp)) {
    issues.push('missing company map');
  } else {
    if (comp.id !== docPayload.company_id) issues.push('company.id mismatch');
    if (typeof comp.name !== 'string' || comp.name.length < 1 || comp.name.length > 300) {
      issues.push('invalid company.name');
    }
    if (typeof comp.slug !== 'string' || comp.slug.length < 1 || comp.slug.length > 160) {
      issues.push('invalid company.slug');
    }
  }
  if (issues.length > 0) {
    throw new Error(`IPO data validation failed before save: ${issues.join(', ')}.`);
  }
}

function sanitizeQuotaPercent(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 100) return undefined;
  return Number(num.toFixed(2));
}

function sanitizeCategoryLotLimits(raw: unknown): CategoryLotLimitsMap | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const input = raw as Record<string, { min_lots?: unknown; max_lots?: unknown } | null | undefined>;
  const cleaned: CategoryLotLimitsMap = {};
  let hasAny = false;

  for (const cat of INVESTOR_LOT_CATEGORIES) {
    const entry = input[cat];
    if (!entry || typeof entry !== 'object') continue;
    const minRaw =
      entry.min_lots !== undefined && entry.min_lots !== null && entry.min_lots !== ''
        ? Number(entry.min_lots)
        : undefined;
    const maxRaw =
      entry.max_lots !== undefined && entry.max_lots !== null && entry.max_lots !== ''
        ? Number(entry.max_lots)
        : undefined;
    const minLots =
      minRaw !== undefined && Number.isFinite(minRaw) && minRaw >= 1
        ? Math.floor(minRaw)
        : undefined;
    const maxLots =
      maxRaw !== undefined && Number.isFinite(maxRaw) && maxRaw >= 1
        ? Math.floor(maxRaw)
        : undefined;

    if (minLots !== undefined || maxLots !== undefined) {
      const catObj: { min_lots?: number; max_lots?: number } = {};
      if (minLots !== undefined) catObj.min_lots = minLots;
      if (maxLots !== undefined) {
        catObj.max_lots = minLots !== undefined ? Math.max(minLots, maxLots) : maxLots;
      }
      cleaned[cat] = catObj;
      hasAny = true;
    }
  }

  return hasAny ? cleaned : undefined;
}

function sanitizeMinInvestmentMultiples(raw: unknown): MinInvestmentMultiples | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const input = raw as Record<string, unknown>;
  const cleaned: MinInvestmentMultiples = {};

  const parsePositiveInt = (val: unknown, max: number): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 1 || n > max) return undefined;
    return Math.floor(n);
  };
  const parsePositiveAmount = (val: unknown, max: number): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined;
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0 || n > max) return undefined;
    return Number(n.toFixed(2));
  };

  const minLots = parsePositiveInt(input.min_lots, 10000);
  const multipleLots = parsePositiveInt(input.multiple_lots, 10000);
  const minShares = parsePositiveInt(input.min_shares, 100000000);
  const multipleShares = parsePositiveInt(input.multiple_shares, 100000000);
  const minAmount = parsePositiveAmount(input.min_amount, 10000000000);
  const multipleAmount = parsePositiveAmount(input.multiple_amount, 10000000000);
  const maxMultiples = parsePositiveInt(input.max_multiples, 1000);

  if (minLots !== undefined) cleaned.min_lots = minLots;
  if (multipleLots !== undefined) cleaned.multiple_lots = multipleLots;
  if (minShares !== undefined) cleaned.min_shares = minShares;
  if (multipleShares !== undefined) cleaned.multiple_shares = multipleShares;
  if (minAmount !== undefined) cleaned.min_amount = minAmount;
  if (multipleAmount !== undefined) cleaned.multiple_amount = multipleAmount;
  if (maxMultiples !== undefined) cleaned.max_multiples = maxMultiples;

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function sanitizeExchange(raw: unknown, category: IPOCategory): IPOExchange {
  const str = String(raw || '').trim() as IPOExchange;
  if (VALID_EXCHANGES.includes(str)) return str;
  return category === 'SME' ? 'NSE Emerge' : 'NSE, BSE';
}

function sanitizeStatus(raw: unknown): IPOStatus {
  const str = String(raw || '').trim() as IPOStatus;
  return VALID_STATUSES.includes(str) ? str : 'upcoming';
}

function sanitizeAnnouncementStatus(raw: unknown): AnnouncementStatus {
  const str = String(raw || '').trim() as AnnouncementStatus;
  return VALID_ANNOUNCEMENT_STATUSES.includes(str) ? str : 'confirmed';
}

function hydrateIPO(raw: Record<string, unknown>): IPO {
  const ipo = raw as unknown as IPO;

  const gmpHistory: GMPSnapshot[] = Array.isArray(ipo.gmp_history)
    ? [...ipo.gmp_history].sort(
        (a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime()
      )
    : [];
  const latest_gmp = gmpHistory.length > 0 ? gmpHistory[gmpHistory.length - 1] : undefined;
  const previous_gmp = gmpHistory.length > 1 ? gmpHistory[gmpHistory.length - 2] : undefined;

  const subHistory: SubscriptionSnapshot[] = Array.isArray(ipo.subscription_history)
    ? [...ipo.subscription_history].sort(
        (a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime()
      )
    : [];
  const latest_subscription = subHistory.length > 0 ? subHistory[subHistory.length - 1] : undefined;

  const status = deriveIPOStatusFromDates({
    open_date: ipo.open_date,
    close_date: ipo.close_date,
    listing_date: ipo.listing_date,
    has_listing_result: Boolean(ipo.listing_result),
    fallback_status: ipo.status,
  });

  return {
    ...ipo,
    status,
    drhp_url: getValidDocUrl(ipo.drhp_url),
    rhp_url: getValidDocUrl(ipo.rhp_url),
    registrar_url: getValidDocUrl(ipo.registrar_url),
    latest_gmp,
    previous_gmp,
    gmp_history: gmpHistory,
    latest_subscription,
    subscription_history: subHistory,
  };
}

/**
 * Extracts only the fields allowed by `isValidIPO` in firestore.rules
 * so Firestore document writes strictly conform to the security blueprint.
 */
function buildFirestoreIPODoc(
  ipo: IPO,
  meta: { updatedBy: string; createdAt: unknown; updatedAt: unknown }
): Record<string, unknown> {
  const nowIso = new Date().toISOString();
  const rawComp = ipo.company;
  const companyMap: Record<string, unknown> = {
    id: rawComp?.id || ipo.company_id,
    name: (rawComp?.name || ipo.slug).trim().slice(0, 250),
    slug: makeSafeSlug(rawComp?.slug || rawComp?.name || ipo.slug, 'company'),
    created_at: rawComp?.created_at || ipo.created_at || nowIso,
    updated_at: rawComp?.updated_at || nowIso,
  };
  const desc = optionalString(rawComp?.description, 9000);
  if (desc) companyMap.description = desc;
  const ind = optionalString(rawComp?.industry, 180);
  if (ind) companyMap.industry = ind;
  const webUrl = optionalString(rawComp?.website_url, 1800);
  if (webUrl) companyMap.website_url = webUrl;
  const logoUrl = optionalString(rawComp?.logo_url, 1800);
  if (logoUrl) companyMap.logo_url = logoUrl;

  const docObj: Record<string, unknown> = {
    id: ipo.id,
    company_id: ipo.company_id,
    company: companyMap,
    slug: makeSafeSlug(ipo.slug, 'ipo'),
    category: ipo.category === 'SME' ? 'SME' : 'Mainboard',
    exchange: sanitizeExchange(ipo.exchange, ipo.category === 'SME' ? 'SME' : 'Mainboard'),
    status: sanitizeStatus(ipo.status),
    announcement_status: sanitizeAnnouncementStatus(ipo.announcement_status),
    visibility: 'members',
    created_at: ipo.created_at || nowIso,
    updated_at: ipo.updated_at || nowIso,
    updatedBy: meta.updatedBy,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };

  const setOptStr = (key: string, val: unknown, maxLen: number) => {
    const s = optionalString(val, maxLen);
    if (s !== undefined) docObj[key] = s;
  };
  const setOptNum = (key: string, val: unknown) => {
    const n = optionalNumber(val);
    if (n !== undefined) docObj[key] = n;
  };

  setOptStr('open_date', ipo.open_date, 32);
  setOptStr('close_date', ipo.close_date, 32);
  setOptStr('allotment_date', ipo.allotment_date, 32);
  setOptStr('refund_date', ipo.refund_date, 32);
  setOptStr('demat_credit_date', ipo.demat_credit_date, 32);
  setOptStr('listing_date', ipo.listing_date, 32);

  setOptNum('price_band_min', ipo.price_band_min);
  setOptNum('price_band_max', ipo.price_band_max);
  setOptNum('issue_price', ipo.issue_price);
  setOptNum('lot_size', ipo.lot_size);
  setOptNum('issue_size', ipo.issue_size);
  setOptNum('fresh_issue_size', ipo.fresh_issue_size);
  setOptNum('offer_for_sale_size', ipo.offer_for_sale_size);

  setOptNum('retail_quota_percent', sanitizeQuotaPercent(ipo.retail_quota_percent));
  setOptNum('qib_quota_percent', sanitizeQuotaPercent(ipo.qib_quota_percent));
  setOptNum('nii_quota_percent', sanitizeQuotaPercent(ipo.nii_quota_percent));
  setOptNum('employee_quota_percent', sanitizeQuotaPercent(ipo.employee_quota_percent));
  setOptNum('shareholder_quota_percent', sanitizeQuotaPercent(ipo.shareholder_quota_percent));
  setOptNum('other_quota_percent', sanitizeQuotaPercent(ipo.other_quota_percent));

  const lotLimits = sanitizeCategoryLotLimits(ipo.category_lot_limits);
  if (lotLimits) docObj.category_lot_limits = lotLimits;
  const minMultiples = sanitizeMinInvestmentMultiples(ipo.min_investment_multiples);
  if (minMultiples) docObj.min_investment_multiples = minMultiples;

  setOptStr('registrar_name', ipo.registrar_name, 250);
  setOptStr('registrar_url', getValidDocUrl(ipo.registrar_url), 1800);
  setOptStr('drhp_url', getValidDocUrl(ipo.drhp_url), 1800);
  setOptStr('rhp_url', getValidDocUrl(ipo.rhp_url), 1800);
  setOptStr('official_source_url', getValidDocUrl(ipo.official_source_url), 1800);
  setOptStr('data_verified_at', ipo.data_verified_at, 64);
  setOptStr('published_at', ipo.published_at, 64);

  if (ipo.latest_gmp) docObj.latest_gmp = stripEmpty(ipo.latest_gmp);
  if (ipo.previous_gmp) docObj.previous_gmp = stripEmpty(ipo.previous_gmp);
  if (Array.isArray(ipo.gmp_history) && ipo.gmp_history.length > 0) {
    docObj.gmp_history = stripEmpty(ipo.gmp_history.slice(-150));
  }
  if (ipo.latest_subscription) docObj.latest_subscription = stripEmpty(ipo.latest_subscription);
  if (Array.isArray(ipo.subscription_history) && ipo.subscription_history.length > 0) {
    docObj.subscription_history = stripEmpty(ipo.subscription_history.slice(-80));
  }
  if (ipo.listing_result) docObj.listing_result = stripEmpty(ipo.listing_result);
  if (Array.isArray(ipo.important_dates) && ipo.important_dates.length > 0) {
    docObj.important_dates = stripEmpty(ipo.important_dates.slice(0, 25));
  }

  return docObj;
}

function computeClientFinancials(
  agreedRaw: number,
  payments: ClientFeePayment[],
  feeWaived?: boolean
): {
  total_fee_agreed: number;
  total_fee_paid: number;
  balance_due: number;
  fee_status: FeePaymentStatus;
} {
  const agreed = Number.isFinite(agreedRaw) && agreedRaw >= 0 ? Number(agreedRaw.toFixed(2)) : 0;
  const paid = Number(
    payments.reduce((sum, p) => sum + (Number.isFinite(p.amount) ? p.amount : 0), 0).toFixed(2)
  );
  const balance = Number(Math.max(0, agreed - paid).toFixed(2));

  let fee_status: FeePaymentStatus;
  if (feeWaived || (agreed === 0 && paid === 0)) {
    fee_status = 'waived';
  } else if (paid >= agreed) {
    fee_status = 'paid';
  } else if (paid > 0) {
    fee_status = 'partial';
  } else {
    fee_status = 'pending';
  }

  return {
    total_fee_agreed: agreed,
    total_fee_paid: paid,
    balance_due: balance,
    fee_status,
  };
}

function buildFirestoreClientDoc(
  client: ClientRecord,
  meta: { updatedBy: string; createdAt: unknown; updatedAt: unknown }
): Record<string, unknown> {
  const docObj: Record<string, unknown> = {
    id: client.id,
    full_name: client.full_name.trim().slice(0, 180),
    status: client.status,
    total_fee_agreed: client.total_fee_agreed,
    total_fee_paid: client.total_fee_paid,
    balance_due: client.balance_due,
    fee_status: client.fee_status,
    payments: stripEmpty(client.payments.slice(0, 200)),
    joined_date: client.joined_date.slice(0, 32),
    created_at: client.created_at.slice(0, 64),
    updated_at: client.updated_at.slice(0, 64),
    updatedBy: meta.updatedBy,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };

  const setOptStr = (key: string, val: unknown, maxLen: number) => {
    const s = optionalString(val, maxLen);
    if (s !== undefined) docObj[key] = s;
  };

  setOptStr('email', client.email, 254);
  setOptStr('phone', client.phone, 30);
  setOptStr('pan', client.pan, 20);
  setOptStr('demat_id', client.demat_id, 64);
  setOptStr('client_code', client.client_code, 64);
  setOptStr('service_plan', client.service_plan, 180);
  if (client.fee_waived !== undefined) docObj.fee_waived = Boolean(client.fee_waived);
  setOptStr('fee_due_date', client.fee_due_date, 32);
  setOptStr('notes', client.notes, 4500);

  return docObj;
}

function safeParseSummary(summary: unknown): Record<string, unknown> | null {
  if (!summary || typeof summary !== 'string') return null;
  try {
    const parsed = JSON.parse(summary);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    return { value: parsed };
  } catch {
    return { summary };
  }
}

class ApiClient {
  // Optional bearer token retained for compatibility with backend routes if used
  private bearerToken: string | null = null;

  public setAuthToken(token: string | null): void {
    this.bearerToken = token;
  }

  public getAuthToken(): string | null {
    return this.bearerToken;
  }

  private requireCloudUser(): { uid: string; email: string; displayName: string } {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.emailVerified || !fbUser.email) {
      throw new Error(
        'Please sign in with Google to save changes permanently to the cloud database.'
      );
    }
    return {
      uid: fbUser.uid,
      email: fbUser.email.trim().toLowerCase(),
      displayName: (
        fbUser.displayName?.trim() ||
        fbUser.email.split('@')[0] ||
        'Admin'
      ).slice(0, 120),
    };
  }

  private async writeAuditLog(entry: {
    actorName?: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
  }): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.emailVerified) return;

    const id = generateId('aud');
    const nowIso = new Date().toISOString();
    const docData: Record<string, unknown> = {
      id,
      actor_id: fbUser.uid,
      actor_name: (
        entry.actorName ||
        fbUser.displayName ||
        fbUser.email ||
        'Admin'
      )
        .trim()
        .slice(0, 115),
      action: entry.action.slice(0, 80),
      entity_type: entry.entityType.slice(0, 60),
      entity_id: entry.entityId.slice(0, 128),
      created_at: nowIso,
      createdAt: serverTimestamp(),
    };

    if (entry.before !== undefined && entry.before !== null) {
      docData.before_summary = JSON.stringify(entry.before).slice(0, 950);
    }
    if (entry.after !== undefined && entry.after !== null) {
      docData.after_summary = JSON.stringify(entry.after).slice(0, 950);
    }

    try {
      await setDoc(doc(db, 'audit_logs', id), docData);
    } catch (err) {
      console.warn('Audit log write skipped:', err);
    }
  }

  public async ensureSeededInFirestore(_adminUid: string): Promise<void> {
    // Production database starts empty by design — no demo/default IPOs are auto-seeded
  }

  // =====================================================================
  // PUBLIC IPO READS (Cloud Firestore — Works Without Login)
  // =====================================================================

  public async getAllIPOs(filter?: {
    status?: IPOStatus | 'all';
    category?: IPOCategory | 'all';
    exchange?: string;
    search?: string;
    sort?: 'date_desc' | 'date_asc' | 'gain_desc' | 'gain_asc' | 'size_desc' | 'name_asc';
  }): Promise<IPO[]> {
    let list: IPO[] = [];
    try {
      const q = query(collection(db, 'ipos'), where('visibility', '==', 'members'));
      const snap = await getDocs(q);
      list = snap.docs.map((d) => hydrateIPO(d.data() as Record<string, unknown>));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'ipos');
    }

    if (filter) {
      if (filter.status && filter.status !== 'all') {
        list = list.filter((i) => i.status === filter.status);
      }
      if (filter.category && filter.category !== 'all') {
        list = list.filter((i) => i.category === filter.category);
      }
      if (filter.exchange && filter.exchange !== 'all') {
        list = list.filter((i) => i.exchange.includes(filter.exchange!));
      }
      if (filter.search && filter.search.trim()) {
        const queryStr = filter.search.toLowerCase().trim();
        list = list.filter(
          (i) =>
            i.company?.name.toLowerCase().includes(queryStr) ||
            i.slug.toLowerCase().includes(queryStr) ||
            i.category.toLowerCase().includes(queryStr) ||
            i.exchange.toLowerCase().includes(queryStr)
        );
      }

      if (filter.sort) {
        switch (filter.sort) {
          case 'date_desc':
            list.sort(
              (a, b) =>
                new Date(b.open_date || b.listing_date || b.created_at || 0).getTime() -
                new Date(a.open_date || a.listing_date || a.created_at || 0).getTime()
            );
            break;
          case 'date_asc':
            list.sort(
              (a, b) =>
                new Date(a.open_date || a.listing_date || a.created_at || 0).getTime() -
                new Date(b.open_date || b.listing_date || b.created_at || 0).getTime()
            );
            break;
          case 'gain_desc':
            list.sort((a, b) => {
              const gainA = a.listing_result
                ? calculateListingGainPercentage(
                    a.listing_result.issue_price,
                    a.listing_result.listing_price
                  )
                : -9999;
              const gainB = b.listing_result
                ? calculateListingGainPercentage(
                    b.listing_result.issue_price,
                    b.listing_result.listing_price
                  )
                : -9999;
              return gainB - gainA;
            });
            break;
          case 'gain_asc':
            list.sort((a, b) => {
              const gainA = a.listing_result
                ? calculateListingGainPercentage(
                    a.listing_result.issue_price,
                    a.listing_result.listing_price
                  )
                : 9999;
              const gainB = b.listing_result
                ? calculateListingGainPercentage(
                    b.listing_result.issue_price,
                    b.listing_result.listing_price
                  )
                : 9999;
              return gainA - gainB;
            });
            break;
          case 'size_desc':
            list.sort((a, b) => (b.issue_size || 0) - (a.issue_size || 0));
            break;
          case 'name_asc':
            list.sort((a, b) =>
              (a.company?.name || a.slug).localeCompare(b.company?.name || b.slug)
            );
            break;
        }
      } else {
        list.sort(
          (a, b) =>
            new Date(b.open_date || b.listing_date || b.created_at || 0).getTime() -
            new Date(a.open_date || a.listing_date || a.created_at || 0).getTime()
        );
      }
    } else {
      list.sort(
        (a, b) =>
          new Date(b.open_date || b.listing_date || b.created_at || 0).getTime() -
          new Date(a.open_date || a.listing_date || a.created_at || 0).getTime()
      );
    }

    return list;
  }

  public async getIPOBySlug(slug: string): Promise<IPO | undefined> {
    const all = await this.getAllIPOs();
    return all.find((i) => i.slug === slug);
  }

  public async getMarketSummary(): Promise<MarketSummary> {
    const all = await this.getAllIPOs();
    const open_ipos = all.filter((i) => i.status === 'ongoing');
    const upcoming_ipos = all.filter((i) => i.status === 'upcoming');
    const listed_ipos = all.filter((i) => i.status === 'listed');
    const mainboard = all.filter((i) => i.category === 'Mainboard');
    const sme = all.filter((i) => i.category === 'SME');

    const topGainers = listed_ipos
      .filter((i) => i.listing_result)
      .map((i) => {
        const gainPct = calculateListingGainPercentage(
          i.listing_result!.issue_price,
          i.listing_result!.listing_price
        );
        return {
          id: i.id,
          company_name: i.company?.name || i.slug,
          slug: i.slug,
          category: i.category,
          issue_price: i.listing_result!.issue_price,
          listing_price: i.listing_result!.listing_price,
          gain_percentage: gainPct,
          listing_date: i.listing_result!.listing_date,
        };
      })
      .sort((a, b) => b.gain_percentage - a.gain_percentage)
      .slice(0, 5);

    const topGmp = all
      .filter((i) => i.latest_gmp && (i.status === 'ongoing' || i.status === 'upcoming'))
      .map((i) => {
        const basePrice = i.issue_price || i.price_band_max;
        const indicativeGainPct = calculateIndicativeGainPercentage(
          basePrice,
          i.latest_gmp?.gmp_amount
        );
        return {
          id: i.id,
          company_name: i.company?.name || i.slug,
          slug: i.slug,
          category: i.category,
          gmp_amount: i.latest_gmp!.gmp_amount,
          indicative_gain_pct: indicativeGainPct ?? undefined,
          observed_at: i.latest_gmp!.observed_at,
        };
      })
      .sort((a, b) => (b.indicative_gain_pct || 0) - (a.indicative_gain_pct || 0))
      .slice(0, 5);

    return {
      total_ipos: all.length,
      open_ipos_count: open_ipos.length,
      upcoming_ipos_count: upcoming_ipos.length,
      recently_listed_count: listed_ipos.length,
      mainboard_count: mainboard.length,
      sme_count: sme.length,
      last_sync_timestamp: new Date().toISOString(),
      top_gainers: topGainers,
      top_gmp_ipos: topGmp,
    };
  }

  public async getCalendarEvents(): Promise<
    Array<{
      ipo_id: string;
      company_name: string;
      slug: string;
      category: IPOCategory;
      event_type: string;
      event_date: string;
      status: string;
    }>
  > {
    const ipos = await this.getAllIPOs();
    const events: Array<{
      ipo_id: string;
      company_name: string;
      slug: string;
      category: IPOCategory;
      event_type: string;
      event_date: string;
      status: string;
    }> = [];

    ipos.forEach((ipo) => {
      const name = ipo.company?.name || ipo.slug;
      if (ipo.open_date) {
        events.push({
          ipo_id: ipo.id,
          company_name: name,
          slug: ipo.slug,
          category: ipo.category,
          event_type: 'Open Date',
          event_date: ipo.open_date,
          status: ipo.status,
        });
      }
      if (ipo.close_date) {
        events.push({
          ipo_id: ipo.id,
          company_name: name,
          slug: ipo.slug,
          category: ipo.category,
          event_type: 'Close Date',
          event_date: ipo.close_date,
          status: ipo.status,
        });
      }
      if (ipo.allotment_date) {
        events.push({
          ipo_id: ipo.id,
          company_name: name,
          slug: ipo.slug,
          category: ipo.category,
          event_type: 'Allotment',
          event_date: ipo.allotment_date,
          status: ipo.status,
        });
      }
      if (ipo.listing_date) {
        events.push({
          ipo_id: ipo.id,
          company_name: name,
          slug: ipo.slug,
          category: ipo.category,
          event_type: 'Listing',
          event_date: ipo.listing_date,
          status: ipo.status,
        });
      }
    });

    return events.sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }

  // =====================================================================
  // AUTHENTICATED END-USER IPO APPLICATIONS (Cloud Firestore)
  // =====================================================================

  public async getUserIPOApplications(_userId: string, ipoId?: string): Promise<IPOApplication[]> {
    const fbUser = auth.currentUser;
    if (!fbUser) return [];

    try {
      const q = query(collection(db, 'ipo_applications'), where('userId', '==', fbUser.uid));
      const snap = await getDocs(q);
      let apps = snap.docs.map((d) => d.data() as IPOApplication);
      if (ipoId) {
        apps = apps.filter((a) => a.ipoId === ipoId);
      }
      return apps.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'ipo_applications');
    }
  }

  public async submitIPOApplication(input: {
    ipo: IPO;
    investorCategory: InvestorLotCategory;
    lots: number;
    upiId: string;
    pan: string;
  }): Promise<IPOApplication> {
    const user = this.requireCloudUser();
    const { ipo } = input;

    const cleanPan = String(input.pan || '').trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      throw new Error('Please enter a valid 10-character PAN (e.g., ABCDE1234F).');
    }

    const cleanUpi = String(input.upiId || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+$/.test(cleanUpi) || cleanUpi.length > 120) {
      throw new Error('Please enter a valid UPI ID (e.g., name@okaxis).');
    }

    const lotsNum = Math.floor(Number(input.lots));
    if (!Number.isFinite(lotsNum) || lotsNum < 1 || lotsNum > 10000) {
      throw new Error('Number of lots must be between 1 and 10,000.');
    }

    const lotSize = ipo.lot_size || 1;
    const bidPrice = ipo.price_band_max || ipo.issue_price || ipo.price_band_min || 0;
    if (bidPrice <= 0) {
      throw new Error('Price band is not finalized yet for this IPO.');
    }

    const shares = lotsNum * lotSize;
    const totalAmount = Number((shares * bidPrice).toFixed(2));
    const appId = generateId('app');
    const nowIso = new Date().toISOString();

    const record: IPOApplication = {
      id: appId,
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName,
      ipoId: ipo.id,
      ipoSlug: makeSafeSlug(ipo.slug, 'ipo'),
      companyName: (ipo.company?.name || ipo.slug).slice(0, 200),
      category: ipo.category === 'SME' ? 'SME' : 'Mainboard',
      investorCategory: input.investorCategory,
      lots: lotsNum,
      shares,
      bidPrice,
      totalAmount,
      upiId: cleanUpi,
      pan: cleanPan,
      status: 'submitted',
      created_at: nowIso,
    };

    try {
      await setDoc(doc(db, 'ipo_applications', appId), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `ipo_applications/${appId}`);
    }

    return record;
  }

  public async cancelIPOApplication(applicationId: string): Promise<void> {
    this.requireCloudUser();
    try {
      await updateDoc(doc(db, 'ipo_applications', applicationId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ipo_applications/${applicationId}`);
    }
  }

  // =====================================================================
  // ADMIN IPO MUTATIONS (Permanent Cloud Firestore Writes)
  // =====================================================================

  public async adminCreateIPO(payload: any, admin: AdminUser): Promise<IPO> {
    const user = this.requireCloudUser();
    const companyName = String(payload?.companyName || '').trim();
    if (!companyName) {
      throw new Error('Company Name is required.');
    }

    const nowIso = new Date().toISOString();
    const companySlug = makeSafeSlug(companyName, 'company');
    const companyId = generateId('comp');
    const ipoId = generateId('ipo');
    const ipoSlug = makeSafeSlug(`${companySlug}-ipo`, 'ipo');
    const category: IPOCategory = payload?.category === 'SME' ? 'SME' : 'Mainboard';
    const exchange = sanitizeExchange(payload?.exchange, category);

    const open_date = optionalString(payload?.open_date, 32);
    const close_date = optionalString(payload?.close_date, 32);
    const allotment_date = optionalString(payload?.allotment_date, 32);
    const refund_date = optionalString(payload?.refund_date, 32);
    const demat_credit_date = optionalString(payload?.demat_credit_date, 32);
    const listing_date = optionalString(payload?.listing_date, 32);

    const computedStatus = deriveIPOStatusFromDates({
      open_date,
      close_date,
      listing_date,
      fallback_status: sanitizeStatus(payload?.status || 'upcoming'),
    });

    const company: Company = {
      id: companyId,
      name: companyName.slice(0, 250),
      slug: companySlug,
      description: optionalString(payload?.description, 9000),
      industry: optionalString(payload?.industry, 180),
      created_at: nowIso,
      updated_at: nowIso,
    };

    const newIPO: IPO = {
      id: ipoId,
      company_id: companyId,
      company,
      slug: ipoSlug,
      category,
      exchange,
      status: computedStatus,
      announcement_status: sanitizeAnnouncementStatus(payload?.announcement_status || 'confirmed'),
      open_date,
      close_date,
      allotment_date,
      refund_date,
      demat_credit_date,
      listing_date,
      price_band_min: optionalNumber(payload?.price_band_min),
      price_band_max: optionalNumber(payload?.price_band_max),
      issue_price: optionalNumber(payload?.issue_price),
      lot_size: optionalNumber(payload?.lot_size),
      issue_size: optionalNumber(payload?.issue_size),
      fresh_issue_size: optionalNumber(payload?.fresh_issue_size),
      offer_for_sale_size: optionalNumber(payload?.offer_for_sale_size),
      retail_quota_percent: sanitizeQuotaPercent(payload?.retail_quota_percent),
      qib_quota_percent: sanitizeQuotaPercent(payload?.qib_quota_percent),
      nii_quota_percent: sanitizeQuotaPercent(payload?.nii_quota_percent),
      employee_quota_percent: sanitizeQuotaPercent(payload?.employee_quota_percent),
      shareholder_quota_percent: sanitizeQuotaPercent(payload?.shareholder_quota_percent),
      other_quota_percent: sanitizeQuotaPercent(payload?.other_quota_percent),
      category_lot_limits: sanitizeCategoryLotLimits(payload?.category_lot_limits),
      min_investment_multiples: sanitizeMinInvestmentMultiples(payload?.min_investment_multiples),
      registrar_name: optionalString(payload?.registrar_name, 250),
      registrar_url: getValidDocUrl(payload?.registrar_url),
      drhp_url: getValidDocUrl(payload?.drhp_url),
      rhp_url: getValidDocUrl(payload?.rhp_url),
      official_source_url: getValidDocUrl(payload?.official_source_url),
      data_verified_at: nowIso,
      published_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const docPayload = buildFirestoreIPODoc(newIPO, {
      updatedBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    assertValidIPODocPayload(docPayload, ipoId, user.uid);

    try {
      await setDoc(doc(db, 'ipos', ipoId), docPayload);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `ipos/${ipoId}`,
        summarizePayloadShape(docPayload)
      );
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'IPO_CREATE',
      entityType: 'ipo',
      entityId: ipoId,
      after: { slug: ipoSlug, company: companyName, category },
    });

    return hydrateIPO(docPayload);
  }

  public async adminUpdateIPO(
    id: string,
    payload: any,
    admin: AdminUser
  ): Promise<IPO | undefined> {
    const user = this.requireCloudUser();
    const docRef = doc(db, 'ipos', id);

    let existingRaw: Record<string, unknown> | null = null;
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) return undefined;
      existingRaw = snap.data() as Record<string, unknown>;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `ipos/${id}`);
    }

    const existing = hydrateIPO(existingRaw!);
    const nowIso = new Date().toISOString();

    const { companyName, description, industry, ...ipoUpdates } = payload || {};
    const existingCompany = existing.company || {
      id: existing.company_id,
      name: existing.slug,
      slug: makeSafeSlug(existing.slug, 'company'),
      created_at: existing.created_at,
      updated_at: existing.updated_at,
    };

    const nextCompany: Company = {
      ...existingCompany,
      name:
        companyName !== undefined && String(companyName).trim()
          ? String(companyName).trim().slice(0, 250)
          : existingCompany.name,
      description:
        description !== undefined
          ? optionalString(description, 9000)
          : existingCompany.description,
      industry:
        industry !== undefined ? optionalString(industry, 180) : existingCompany.industry,
      updated_at: nowIso,
    };

    const normalized: Partial<IPO> = {};
    for (const [key, val] of Object.entries(ipoUpdates)) {
      if (key === 'id' || key === 'company_id' || key === 'created_at' || key === 'createdAt') {
        continue;
      }
      if (key === 'category_lot_limits') {
        normalized.category_lot_limits = sanitizeCategoryLotLimits(val);
        continue;
      }
      if (key === 'min_investment_multiples') {
        normalized.min_investment_multiples = sanitizeMinInvestmentMultiples(val);
        continue;
      }
      if (
        key === 'retail_quota_percent' ||
        key === 'qib_quota_percent' ||
        key === 'nii_quota_percent' ||
        key === 'employee_quota_percent' ||
        key === 'shareholder_quota_percent' ||
        key === 'other_quota_percent'
      ) {
        normalized[key] = sanitizeQuotaPercent(val);
        continue;
      }
      (normalized as Record<string, unknown>)[key] =
        val === null || val === '' ? undefined : val;
    }

    const merged: IPO = {
      ...existing,
      ...normalized,
      company: nextCompany,
      registrar_url:
        'registrar_url' in ipoUpdates
          ? getValidDocUrl(normalized.registrar_url)
          : existing.registrar_url,
      drhp_url:
        'drhp_url' in ipoUpdates ? getValidDocUrl(normalized.drhp_url) : existing.drhp_url,
      rhp_url:
        'rhp_url' in ipoUpdates ? getValidDocUrl(normalized.rhp_url) : existing.rhp_url,
      official_source_url:
        'official_source_url' in ipoUpdates
          ? getValidDocUrl(normalized.official_source_url)
          : existing.official_source_url,
      updated_at: nowIso,
    };

    merged.status = deriveIPOStatusFromDates({
      open_date: merged.open_date,
      close_date: merged.close_date,
      listing_date: merged.listing_date,
      has_listing_result: Boolean(merged.listing_result),
      fallback_status: merged.status,
    });

    const docPayload = buildFirestoreIPODoc(merged, {
      updatedBy: user.uid,
      createdAt: existingRaw!.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    assertValidIPODocPayload(docPayload, id, user.uid);
    const updatePatch = buildUpdatePatch(existingRaw!, docPayload, IPO_IMMUTABLE_KEYS);

    try {
      await updateDoc(docRef, updatePatch);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `ipos/${id}`,
        summarizePayloadShape(updatePatch)
      );
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'IPO_UPDATE',
      entityType: 'ipo',
      entityId: id,
      before: { slug: existing.slug, company: existing.company?.name, status: existing.status },
      after: { slug: merged.slug, company: nextCompany.name, status: merged.status },
    });

    return hydrateIPO(docPayload);
  }

  public async adminDeleteIPO(id: string, admin: AdminUser): Promise<boolean> {
    const user = this.requireCloudUser();
    const docRef = doc(db, 'ipos', id);

    let beforeInfo: Record<string, unknown> | null = null;
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data() as Record<string, unknown>;
        beforeInfo = {
          slug: d.slug,
          company: (d.company as { name?: string } | undefined)?.name,
        };
      }
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `ipos/${id}`);
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'IPO_DELETE',
      entityType: 'ipo',
      entityId: id,
      before: beforeInfo,
    });

    return true;
  }

  public async adminAddGMP(payload: any, admin: AdminUser): Promise<GMPSnapshot> {
    const user = this.requireCloudUser();
    const ipoId = String(payload?.ipo_id || '').trim();
    if (!ipoId) throw new Error('Target IPO is required.');

    const docRef = doc(db, 'ipos', ipoId);
    let existingRaw: Record<string, unknown> | null = null;
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Target IPO not found.');
      existingRaw = snap.data() as Record<string, unknown>;
    } catch (err) {
      if (err instanceof Error && err.message === 'Target IPO not found.') throw err;
      handleFirestoreError(err, OperationType.GET, `ipos/${ipoId}`);
    }

    const gmpAmt = Number(payload?.gmp_amount);
    if (!Number.isFinite(gmpAmt)) {
      throw new Error('Please enter a valid numeric unlisted price spread.');
    }

    const existing = hydrateIPO(existingRaw!);
    const nowIso = new Date().toISOString();
    const newSnapshot: GMPSnapshot = stripEmpty({
      id: generateId('gmp'),
      ipo_id: ipoId,
      gmp_amount: gmpAmt,
      currency: 'INR',
      unit: 'per share',
      source_name: String(payload.source_name || '').trim().slice(0, 120),
      source_url: getValidDocUrl(payload.source_url),
      observed_at: payload.observed_at || nowIso,
      ingested_at: nowIso,
      verification_status: payload.verification_status === 'unverified' ? 'unverified' : 'verified',
      created_by: admin?.full_name || user.displayName,
      notes: optionalString(payload.notes, 500),
      created_at: nowIso,
    });

    const gmpHistory = [...(existing.gmp_history || []), newSnapshot]
      .sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime())
      .slice(-150);

    const updated: IPO = {
      ...existing,
      gmp_history: gmpHistory,
      latest_gmp: gmpHistory[gmpHistory.length - 1],
      previous_gmp: gmpHistory.length > 1 ? gmpHistory[gmpHistory.length - 2] : undefined,
      updated_at: nowIso,
    };

    const docPayload = buildFirestoreIPODoc(updated, {
      updatedBy: user.uid,
      createdAt: existingRaw!.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const updatePatch = buildUpdatePatch(existingRaw!, docPayload, IPO_IMMUTABLE_KEYS);

    try {
      await updateDoc(docRef, updatePatch);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ipos/${ipoId}`);
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'UNLISTED_PRICE_ADD',
      entityType: 'unlisted_price',
      entityId: newSnapshot.id,
      after: {
        ipo_id: ipoId,
        unlisted_price_diff: newSnapshot.gmp_amount,
        source: newSnapshot.source_name,
      },
    });

    return newSnapshot;
  }

  public async adminDeleteGMP(snapshotId: string, admin: AdminUser): Promise<boolean> {
    const user = this.requireCloudUser();

    let targetRaw: Record<string, unknown> | null = null;
    let targetDocId: string | null = null;
    let removedSnapshot: GMPSnapshot | null = null;

    try {
      const snap = await getDocs(
        query(collection(db, 'ipos'), where('visibility', '==', 'members'))
      );
      for (const d of snap.docs) {
        const data = d.data() as Record<string, unknown>;
        const history = Array.isArray(data.gmp_history) ? (data.gmp_history as GMPSnapshot[]) : [];
        const match = history.find((g) => g.id === snapshotId);
        if (match) {
          targetRaw = data;
          targetDocId = d.id;
          removedSnapshot = match;
          break;
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'ipos');
    }

    if (!targetRaw || !targetDocId || !removedSnapshot) {
      throw new Error('Unlisted price entry not found.');
    }

    const existing = hydrateIPO(targetRaw);
    const nowIso = new Date().toISOString();
    const remaining = (existing.gmp_history || [])
      .filter((g) => g.id !== snapshotId)
      .sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime());

    const updated: IPO = {
      ...existing,
      gmp_history: remaining,
      latest_gmp: remaining.length > 0 ? remaining[remaining.length - 1] : undefined,
      previous_gmp: remaining.length > 1 ? remaining[remaining.length - 2] : undefined,
      updated_at: nowIso,
    };

    const docPayload = buildFirestoreIPODoc(updated, {
      updatedBy: user.uid,
      createdAt: targetRaw.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const updatePatch = buildUpdatePatch(targetRaw, docPayload, IPO_IMMUTABLE_KEYS);

    try {
      await updateDoc(doc(db, 'ipos', targetDocId), updatePatch);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ipos/${targetDocId}`);
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'UNLISTED_PRICE_DELETE',
      entityType: 'unlisted_price',
      entityId: snapshotId,
      before: {
        ipo_id: targetDocId,
        unlisted_price_diff: removedSnapshot.gmp_amount,
        observed_at: removedSnapshot.observed_at,
      },
    });

    return true;
  }

  public async adminAddSubscription(
    payload: any,
    admin: AdminUser
  ): Promise<SubscriptionSnapshot> {
    const user = this.requireCloudUser();
    const ipoId = String(payload?.ipo_id || '').trim();
    if (!ipoId) throw new Error('Target IPO is required.');

    const docRef = doc(db, 'ipos', ipoId);
    let existingRaw: Record<string, unknown> | null = null;
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Target IPO not found.');
      existingRaw = snap.data() as Record<string, unknown>;
    } catch (err) {
      if (err instanceof Error && err.message === 'Target IPO not found.') throw err;
      handleFirestoreError(err, OperationType.GET, `ipos/${ipoId}`);
    }

    const existing = hydrateIPO(existingRaw!);
    const parseMultiple = (val: unknown): number => {
      if (val === undefined || val === null || val === '') return 0;
      const num = Number(val);
      return Number.isFinite(num) && num >= 0 ? num : 0;
    };

    const retailMultiple = parseMultiple(payload.retail_multiple);
    const niiMultiple = parseMultiple(payload.nii_multiple);
    const qibMultiple = parseMultiple(payload.qib_multiple);
    const employeeMultiple = parseMultiple(payload.employee_multiple);
    const shareholderMultiple = parseMultiple(payload.shareholder_multiple);

    const hasExplicitTotal =
      payload.total_multiple !== undefined &&
      payload.total_multiple !== null &&
      String(payload.total_multiple) !== '' &&
      Number.isFinite(Number(payload.total_multiple)) &&
      Number(payload.total_multiple) >= 0;

    let totalMultiple: number;
    if (hasExplicitTotal) {
      totalMultiple = Number(Number(payload.total_multiple).toFixed(2));
    } else {
      const rW = existing.retail_quota_percent ?? 35;
      const nW = existing.nii_quota_percent ?? 15;
      const qW = existing.qib_quota_percent ?? 50;
      const weightSum = rW + nW + qW;
      totalMultiple =
        weightSum > 0
          ? Number(
              ((retailMultiple * rW + niiMultiple * nW + qibMultiple * qW) / weightSum).toFixed(2)
            )
          : Number((retailMultiple * 0.35 + niiMultiple * 0.15 + qibMultiple * 0.5).toFixed(2));
    }

    const nowIso = new Date().toISOString();
    const newSnapshot: SubscriptionSnapshot = {
      id: generateId('sub'),
      ipo_id: ipoId,
      retail_multiple: retailMultiple,
      nii_multiple: niiMultiple,
      qib_multiple: qibMultiple,
      employee_multiple: employeeMultiple,
      shareholder_multiple: shareholderMultiple,
      total_multiple: totalMultiple,
      unit: 'times',
      day_number: payload.day_number ? Math.max(1, Math.floor(Number(payload.day_number))) : 1,
      observed_at: payload.observed_at || nowIso,
      ingested_at: nowIso,
      verification_status: 'verified',
      created_at: nowIso,
    };

    const subHistory = [...(existing.subscription_history || []), newSnapshot]
      .sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime())
      .slice(-80);

    const updated: IPO = {
      ...existing,
      subscription_history: subHistory,
      latest_subscription: subHistory[subHistory.length - 1],
      updated_at: nowIso,
    };

    const docPayload = buildFirestoreIPODoc(updated, {
      updatedBy: user.uid,
      createdAt: existingRaw!.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const updatePatch = buildUpdatePatch(existingRaw!, docPayload, IPO_IMMUTABLE_KEYS);

    try {
      await updateDoc(docRef, updatePatch);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ipos/${ipoId}`);
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'SUBSCRIPTION_UPDATE',
      entityType: 'subscription_snapshot',
      entityId: newSnapshot.id,
      after: { ipo_id: ipoId, total: totalMultiple },
    });

    return newSnapshot;
  }

  public async adminRecordListing(payload: any, admin: AdminUser): Promise<ListingResult> {
    const user = this.requireCloudUser();
    const ipoId = String(payload?.ipo_id || '').trim();
    if (!ipoId) throw new Error('Target IPO is required.');

    const docRef = doc(db, 'ipos', ipoId);
    let existingRaw: Record<string, unknown> | null = null;
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Target IPO not found.');
      existingRaw = snap.data() as Record<string, unknown>;
    } catch (err) {
      if (err instanceof Error && err.message === 'Target IPO not found.') throw err;
      handleFirestoreError(err, OperationType.GET, `ipos/${ipoId}`);
    }

    const issuePrice = Number(payload.issue_price);
    const listingPrice = Number(payload.listing_price);
    if (!Number.isFinite(issuePrice) || issuePrice <= 0 || !Number.isFinite(listingPrice) || listingPrice <= 0) {
      throw new Error('Please enter valid positive Issue Price and Listing Price.');
    }

    const existing = hydrateIPO(existingRaw!);
    const nowIso = new Date().toISOString();
    const newResult: ListingResult = stripEmpty({
      id: generateId('list'),
      ipo_id: ipoId,
      issue_price: issuePrice,
      listing_price: listingPrice,
      listing_date: String(payload.listing_date || nowIso.slice(0, 10)).slice(0, 32),
      first_day_close: optionalNumber(payload.first_day_close),
      previous_close: listingPrice,
      verified_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    });

    const updated: IPO = {
      ...existing,
      status: 'listed',
      issue_price: newResult.issue_price,
      listing_date: newResult.listing_date,
      listing_result: newResult,
      updated_at: nowIso,
    };

    const docPayload = buildFirestoreIPODoc(updated, {
      updatedBy: user.uid,
      createdAt: existingRaw!.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const updatePatch = buildUpdatePatch(existingRaw!, docPayload, IPO_IMMUTABLE_KEYS);

    try {
      await updateDoc(docRef, updatePatch);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ipos/${ipoId}`);
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'LISTING_RESULT_RECORD',
      entityType: 'listing_results',
      entityId: ipoId,
      after: { issue_price: newResult.issue_price, listing_price: newResult.listing_price },
    });

    return newResult;
  }

  public async adminImportCSV(
    csvText: string,
    admin: AdminUser,
    dryRun: boolean = false
  ): Promise<{
    totalRows: number;
    accepted: number;
    rejected: number;
    errors: string[];
    importedIPOs: Array<{ name: string; slug: string; status: string }>;
  }> {
    if (!dryRun) {
      this.requireCloudUser();
    }

    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return {
        totalRows: 0,
        accepted: 0,
        rejected: 0,
        errors: ['CSV file is empty or missing header row.'],
        importedIPOs: [],
      };
    }

    const header = lines[0].split(',').map((c) => c.trim().toLowerCase());
    const expectedCols = [
      'company',
      'category',
      'exchange',
      'price',
      'lot_size',
      'issue_size',
      'status',
    ];
    const missing = expectedCols.filter((col) => !header.includes(col));
    if (missing.length > 0) {
      return {
        totalRows: lines.length - 1,
        accepted: 0,
        rejected: lines.length - 1,
        errors: [`Missing required columns: ${missing.join(', ')}`],
        importedIPOs: [],
      };
    }

    const existingIPOs = await this.getAllIPOs();
    const existingSlugs = new Set(existingIPOs.map((i) => i.slug));

    const colIndex = (col: string) => header.indexOf(col);
    const errors: string[] = [];
    const importedIPOs: Array<{ name: string; slug: string; status: string }> = [];
    let accepted = 0;
    let rejected = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((c) => c.trim());
      if (row.length < header.length) {
        errors.push(`Row ${i + 1}: Malformed line, column count mismatch.`);
        rejected++;
        continue;
      }

      const companyName = row[colIndex('company')];
      const category = row[colIndex('category')] as IPOCategory;
      const exchange = row[colIndex('exchange')] as IPOExchange;
      const price = parseFloat(row[colIndex('price')]);
      const lotSize = parseInt(row[colIndex('lot_size')], 10);
      const issueSize = parseFloat(row[colIndex('issue_size')]);
      const status = row[colIndex('status')] as IPOStatus;

      if (!companyName) {
        errors.push(`Row ${i + 1}: Missing Company name.`);
        rejected++;
        continue;
      }
      if (category !== 'Mainboard' && category !== 'SME') {
        errors.push(`Row ${i + 1}: Invalid category "${category}". Must be Mainboard or SME.`);
        rejected++;
        continue;
      }

      const slug = makeSafeSlug(`${makeSafeSlug(companyName, 'company')}-ipo`, 'ipo');
      if (existingSlugs.has(slug) && !dryRun) {
        errors.push(`Row ${i + 1}: IPO with slug "${slug}" already exists. Skipped duplicate.`);
        rejected++;
        continue;
      }

      const openDate = colIndex('open_date') >= 0 ? row[colIndex('open_date')] || undefined : undefined;
      const closeDate = colIndex('close_date') >= 0 ? row[colIndex('close_date')] || undefined : undefined;
      const listingDate =
        colIndex('listing_date') >= 0 ? row[colIndex('listing_date')] || undefined : undefined;
      const resolvedStatus = deriveIPOStatusFromDates({
        open_date: openDate,
        close_date: closeDate,
        listing_date: listingDate,
        fallback_status: status || 'upcoming',
      });

      if (!dryRun) {
        await this.adminCreateIPO(
          {
            companyName,
            category,
            exchange: sanitizeExchange(exchange, category),
            status: resolvedStatus,
            announcement_status: 'confirmed',
            open_date: openDate,
            close_date: closeDate,
            listing_date: listingDate,
            price_band_min: Number.isFinite(price) ? price : undefined,
            price_band_max: Number.isFinite(price) ? price : undefined,
            issue_price: resolvedStatus === 'listed' && Number.isFinite(price) ? price : undefined,
            lot_size: Number.isFinite(lotSize) ? lotSize : undefined,
            issue_size: Number.isFinite(issueSize) ? issueSize : undefined,
          },
          admin
        );
        existingSlugs.add(slug);
      }

      accepted++;
      importedIPOs.push({ name: companyName, slug, status: resolvedStatus });
    }

    if (!dryRun) {
      const runId = generateId('import');
      const nowIso = new Date().toISOString();
      try {
        await setDoc(doc(db, 'feed_runs', runId), {
          id: runId,
          provider_name: 'CSV Bulk Import',
          job_type: 'csv_import',
          started_at: nowIso,
          finished_at: nowIso,
          status: rejected === 0 ? 'success' : accepted > 0 ? 'partial' : 'failed',
          records_fetched: lines.length - 1,
          records_accepted: accepted,
          records_rejected: rejected,
          created_at: nowIso,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Could not log CSV import feed run:', err);
      }
    }

    return {
      totalRows: lines.length - 1,
      accepted,
      rejected,
      errors,
      importedIPOs,
    };
  }

  public async adminSyncFeed(sourceId: string, admin: AdminUser): Promise<FeedRun> {
    const user = this.requireCloudUser();
    const source = CONFIGURED_SOURCES.find((s) => s.id === sourceId);
    const startedAt = new Date().toISOString();

    const allIpos = await this.getAllIPOs();
    const ongoingIPOs = allIpos.filter((i) => i.status === 'ongoing');

    let jobType: FeedRun['job_type'] = 'ipo_discovery';
    if (source?.source_type === 'community_estimate') {
      jobType = 'gmp_sync';
    } else if (source?.source_type === 'registrar') {
      jobType = 'subscription_sync';
    }

    const finishedAt = new Date().toISOString();
    const runId = generateId('run');
    const run: FeedRun = {
      id: runId,
      source_id: sourceId,
      provider_name: source?.provider_name || 'System Provider',
      job_type: jobType,
      started_at: startedAt,
      finished_at: finishedAt,
      status: 'success',
      records_fetched: ongoingIPOs.length,
      records_accepted: ongoingIPOs.length,
      records_rejected: 0,
      created_at: finishedAt,
    };

    try {
      await setDoc(doc(db, 'feed_runs', runId), {
        ...run,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `feed_runs/${runId}`);
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'FEED_SYNC_TRIGGER',
      entityType: 'feed_run',
      entityId: runId,
      after: { provider: run.provider_name, accepted: run.records_accepted, status: 'success' },
    });

    return run;
  }

  public async adminGetFeeds(): Promise<{ sources: IPOSource[]; runs: FeedRun[] }> {
    try {
      const snap = await getDocs(collection(db, 'feed_runs'));
      const runs = snap.docs
        .map((d) => d.data() as FeedRun)
        .sort(
          (a, b) => new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime()
        );
      return { sources: CONFIGURED_SOURCES, runs };
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'feed_runs');
    }
  }

  // =====================================================================
  // IPOALERTS.IN SERVER PROXY SYNC (Free Plan Safe — Admin Only)
  // =====================================================================

  private async getAdminBearerToken(): Promise<string> {
    const fbUser = auth.currentUser;
    if (fbUser) {
      const idToken = await fbUser.getIdToken();
      if (idToken) return idToken;
    }
    if (this.bearerToken) return this.bearerToken;
    throw new Error('Please sign in with your authorized Admin account first.');
  }

  public async adminGetIpoAlertsStatus(): Promise<IpoAlertsQuotaStatus> {
    const token = await this.getAdminBearerToken();
    const res = await fetch('/api/admin/ipoalerts/status', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: IpoAlertsQuotaStatus;
      error?: string;
    };
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error || 'Could not check ipoalerts.in server status.');
    }
    return json.data;
  }

  public async adminFetchIpoAlerts(params: {
    status?: 'open' | 'upcoming' | 'announced' | 'open_and_upcoming' | 'closed' | 'listed';
    type?: string;
    page?: number;
    limit?: number;
    identifier?: string;
    bypassCache?: boolean;
    source?: 'auto' | 'ipoalerts' | 'public_feed';
    search?: string;
    exchange?: string;
  }): Promise<IpoAlertsFetchResponse> {
    const token = await this.getAdminBearerToken();
    const res = await fetch('/api/admin/ipoalerts/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: IpoAlertsFetchResponse;
      error?: string;
    };
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error || 'Failed to fetch IPO data from ipoalerts.in.');
    }
    return json.data;
  }

  public async adminSaveIpoAlertsRecords(
    records: IpoAlertsCandidate[],
    options: { preserveExistingFields?: boolean },
    admin: AdminUser
  ): Promise<IpoAlertsSaveReport> {
    this.requireCloudUser();
    const preserveExisting = options.preserveExistingFields !== false;

    const existingIPOs = await this.getAllIPOs();
    const bySlug = new Map<string, IPO>();
    const byName = new Map<string, IPO>();
    for (const ipo of existingIPOs) {
      bySlug.set(ipo.slug.toLowerCase(), ipo);
      if (ipo.company?.name) {
        byName.set(ipo.company.name.trim().toLowerCase(), ipo);
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const savedIPOs: Array<{ name: string; slug: string; action: 'created' | 'updated' }> = [];
    const startedAt = new Date().toISOString();

    for (const rec of records) {
      try {
        const matched =
          bySlug.get(rec.slug.toLowerCase()) ||
          byName.get(rec.companyName.trim().toLowerCase());

        if (matched) {
          const patch: Record<string, unknown> = {
            category: preserveExisting ? matched.category : rec.category,
            exchange: preserveExisting ? matched.exchange : rec.exchange,
            status: rec.status,
          };

          const setField = (key: string, incomingVal: unknown, existingVal: unknown) => {
            if (incomingVal === undefined || incomingVal === null || incomingVal === '') return;
            if (!preserveExisting || existingVal === undefined || existingVal === null || existingVal === '') {
              patch[key] = incomingVal;
            }
          };

          setField('open_date', rec.open_date, matched.open_date);
          setField('close_date', rec.close_date, matched.close_date);
          setField('allotment_date', rec.allotment_date, matched.allotment_date);
          setField('refund_date', rec.refund_date, matched.refund_date);
          setField('demat_credit_date', rec.demat_credit_date, matched.demat_credit_date);
          setField('listing_date', rec.listing_date, matched.listing_date);
          setField('price_band_min', rec.price_band_min, matched.price_band_min);
          setField('price_band_max', rec.price_band_max, matched.price_band_max);
          setField('lot_size', rec.lot_size, matched.lot_size);
          setField('issue_size', rec.issue_size, matched.issue_size);
          setField('fresh_issue_size', rec.fresh_issue_size, matched.fresh_issue_size);
          setField('offer_for_sale_size', rec.offer_for_sale_size, matched.offer_for_sale_size);
          setField('description', rec.description, matched.company?.description);
          setField('industry', rec.industry, matched.company?.industry);
          setField('drhp_url', rec.drhp_url, matched.drhp_url);
          setField('rhp_url', rec.rhp_url, matched.rhp_url);
          setField('official_source_url', rec.official_source_url, matched.official_source_url);

          const saved = await this.adminUpdateIPO(matched.id, patch, admin);
          if (saved) {
            updated += 1;
            savedIPOs.push({
              name: saved.company?.name || rec.companyName,
              slug: saved.slug,
              action: 'updated',
            });
          } else {
            skipped += 1;
          }
        } else {
          const createdIpo = await this.adminCreateIPO(
            {
              companyName: rec.companyName,
              description: rec.description,
              industry: rec.industry,
              category: rec.category,
              exchange: rec.exchange,
              status: rec.status,
              announcement_status:
                rec.announcement_status || (rec.open_date ? 'confirmed' : 'expected'),
              open_date: rec.open_date,
              close_date: rec.close_date,
              allotment_date: rec.allotment_date,
              refund_date: rec.refund_date,
              demat_credit_date: rec.demat_credit_date,
              listing_date: rec.listing_date,
              price_band_min: rec.price_band_min,
              price_band_max: rec.price_band_max,
              lot_size: rec.lot_size,
              issue_size: rec.issue_size,
              fresh_issue_size: rec.fresh_issue_size,
              offer_for_sale_size: rec.offer_for_sale_size,
              drhp_url: rec.drhp_url,
              rhp_url: rec.rhp_url,
              official_source_url: rec.official_source_url,
            },
            admin
          );
          created += 1;
          bySlug.set(createdIpo.slug.toLowerCase(), createdIpo);
          byName.set(rec.companyName.trim().toLowerCase(), createdIpo);
          savedIPOs.push({
            name: createdIpo.company?.name || rec.companyName,
            slug: createdIpo.slug,
            action: 'created',
          });
        }
      } catch (err) {
        skipped += 1;
        errors.push(
          `${rec.companyName}: ${err instanceof Error ? err.message : 'Unable to save record.'}`
        );
      }
    }

    const finishedAt = new Date().toISOString();
    const runId = generateId('run');
    try {
      await setDoc(doc(db, 'feed_runs', runId), {
        id: runId,
        source_id: 'ipoalerts-in',
        provider_name: 'ipoalerts.in API',
        job_type: 'ipo_discovery',
        started_at: startedAt,
        finished_at: finishedAt,
        status: errors.length === 0 ? 'success' : created + updated > 0 ? 'partial' : 'failed',
        records_fetched: records.length,
        records_accepted: created + updated,
        records_rejected: errors.length,
        created_at: finishedAt,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not log ipoalerts feed run:', err);
    }

    return { created, updated, skipped, errors, savedIPOs };
  }

  public async adminGetAuditLogs(): Promise<AuditLog[]> {
    try {
      const snap = await getDocs(collection(db, 'audit_logs'));
      return snap.docs
        .map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            id: String(raw.id || d.id),
            actor_id: String(raw.actor_id || ''),
            actor_name: String(raw.actor_name || 'Admin'),
            action: String(raw.action || ''),
            entity_type: String(raw.entity_type || ''),
            entity_id: String(raw.entity_id || ''),
            before_values: safeParseSummary(raw.before_summary),
            after_values: safeParseSummary(raw.after_summary),
            created_at: String(raw.created_at || ''),
          } as AuditLog;
        })
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'audit_logs');
    }
  }

  // =====================================================================
  // ADMIN USERS & AUTHORIZED ADMIN EMAILS (Cloud Firestore)
  // =====================================================================

  public async adminGetUsers(): Promise<AdminUser[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: String(data.uid || d.id),
            email: String(data.email || ''),
            role: data.role === 'admin' ? 'admin' : 'user',
            full_name: String(data.displayName || 'Member'),
            is_active: data.isActive !== false,
            created_at: new Date().toISOString(),
          } as AdminUser;
        })
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }
  }

  public async adminSetUserRole(
    targetUid: string,
    targetEmail: string,
    newRole: 'admin' | 'user',
    admin: AdminUser
  ): Promise<void> {
    const user = this.requireCloudUser();
    const cleanEmail = targetEmail.trim().toLowerCase();

    if (cleanEmail === BOOTSTRAP_ADMIN_EMAIL && newRole !== 'admin') {
      throw new Error('Primary Admin privileges cannot be revoked.');
    }
    if (targetUid === user.uid && newRole !== 'admin') {
      throw new Error('You cannot revoke your own Admin privileges.');
    }

    try {
      await updateDoc(doc(db, 'users', targetUid), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });

      const emailKey = cleanEmail ? toAuthorizedAdminKey(cleanEmail) : '';
      if (newRole === 'admin') {
        const adminRef = doc(db, 'admins', targetUid);
        const adminSnap = await getDoc(adminRef);
        const adminEmail = cleanEmail || `${targetUid}@users.ipoinsiders.app`;
        if (adminSnap.exists()) {
          await updateDoc(adminRef, {
            email: adminEmail,
            grantedBy: user.uid,
          });
        } else {
          await setDoc(adminRef, {
            uid: targetUid,
            email: adminEmail,
            grantedBy: user.uid,
            createdAt: serverTimestamp(),
          });
        }
        if (cleanEmail && emailKey && cleanEmail !== BOOTSTRAP_ADMIN_EMAIL) {
          const authRef = doc(db, 'authorized_admins', emailKey);
          const authSnap = await getDoc(authRef);
          if (!authSnap.exists()) {
            await setDoc(authRef, {
              id: emailKey,
              email: cleanEmail,
              added_by: admin?.email || user.email,
              added_at: new Date().toISOString(),
              createdAt: serverTimestamp(),
            });
          }
        }
      } else {
        await deleteDoc(doc(db, 'admins', targetUid)).catch(() => {});
        if (cleanEmail && emailKey && cleanEmail !== BOOTSTRAP_ADMIN_EMAIL) {
          await deleteDoc(doc(db, 'authorized_admins', emailKey)).catch(() => {});
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: newRole === 'admin' ? 'USER_PROMOTE_ADMIN' : 'USER_REVOKE_ADMIN',
      entityType: 'user',
      entityId: targetUid,
      after: { email: cleanEmail, role: newRole },
    });
  }

  public async adminGetAuthorizedAdmins(): Promise<AuthorizedAdminEntry[]> {
    try {
      const [authSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'authorized_admins')),
        getDocs(collection(db, 'users')),
      ]);

      const usersByEmail = new Map<string, { displayName: string }>();
      usersSnap.docs.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const em = String(data.email || '').trim().toLowerCase();
        if (em) {
          usersByEmail.set(em, { displayName: String(data.displayName || '') });
        }
      });

      const bootstrapUser = usersByEmail.get(BOOTSTRAP_ADMIN_EMAIL);
      const entries: AuthorizedAdminEntry[] = [
        {
          email: BOOTSTRAP_ADMIN_EMAIL,
          is_primary: true,
          added_by: 'System',
          added_at: '2024-01-01T00:00:00Z',
          has_account: Boolean(bootstrapUser),
          user_name: bootstrapUser?.displayName || undefined,
        },
      ];

      authSnap.docs.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const em = String(data.email || '').trim().toLowerCase();
        if (!em || em === BOOTSTRAP_ADMIN_EMAIL) return;
        const matched = usersByEmail.get(em);
        entries.push({
          email: em,
          is_primary: false,
          added_by: String(data.added_by || 'Admin'),
          added_at: String(data.added_at || new Date().toISOString()),
          has_account: Boolean(matched),
          user_name: matched?.displayName || undefined,
        });
      });

      return entries;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'authorized_admins');
    }
  }

  public async adminAuthorizeEmail(email: string): Promise<AuthorizedAdminEntry> {
    const user = this.requireCloudUser();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    if (cleanEmail === BOOTSTRAP_ADMIN_EMAIL) {
      return {
        email: BOOTSTRAP_ADMIN_EMAIL,
        is_primary: true,
        added_by: 'System',
        added_at: '2024-01-01T00:00:00Z',
        has_account: true,
      };
    }

    const emailKey = toAuthorizedAdminKey(cleanEmail);
    const nowIso = new Date().toISOString();
    const authRef = doc(db, 'authorized_admins', emailKey);

    try {
      const existingSnap = await getDoc(authRef);
      if (!existingSnap.exists()) {
        await setDoc(authRef, {
          id: emailKey,
          email: cleanEmail,
          added_by: user.email,
          added_at: nowIso,
          createdAt: serverTimestamp(),
        });
      }

      // If user already has an account in /users, promote them immediately
      let hasAccount = false;
      let userName: string | undefined;
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const uDoc of usersSnap.docs) {
        const data = uDoc.data() as Record<string, unknown>;
        if (String(data.email || '').trim().toLowerCase() === cleanEmail) {
          hasAccount = true;
          userName = String(data.displayName || '') || undefined;
          await updateDoc(doc(db, 'users', uDoc.id), {
            role: 'admin',
            updatedAt: serverTimestamp(),
          });
          const adminRef = doc(db, 'admins', uDoc.id);
          const adminSnap = await getDoc(adminRef);
          if (adminSnap.exists()) {
            await updateDoc(adminRef, {
              email: cleanEmail,
              grantedBy: user.uid,
            });
          } else {
            await setDoc(adminRef, {
              uid: uDoc.id,
              email: cleanEmail,
              grantedBy: user.uid,
              createdAt: serverTimestamp(),
            });
          }
        }
      }

      await this.writeAuditLog({
        actorName: user.displayName,
        action: 'ADMIN_EMAIL_GRANT',
        entityType: 'authorized_admin',
        entityId: emailKey,
        after: { email: cleanEmail },
      });

      return {
        email: cleanEmail,
        is_primary: false,
        added_by: user.email,
        added_at: nowIso,
        has_account: hasAccount,
        user_name: userName,
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `authorized_admins/${emailKey}`);
    }
  }

  public async adminRevokeEmail(email: string): Promise<void> {
    const user = this.requireCloudUser();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (cleanEmail === BOOTSTRAP_ADMIN_EMAIL) {
      throw new Error('Primary Admin email cannot be revoked.');
    }
    if (cleanEmail === user.email) {
      throw new Error('You cannot revoke your own Admin access.');
    }

    const emailKey = toAuthorizedAdminKey(cleanEmail);
    try {
      await deleteDoc(doc(db, 'authorized_admins', emailKey));

      const usersSnap = await getDocs(collection(db, 'users'));
      for (const uDoc of usersSnap.docs) {
        const data = uDoc.data() as Record<string, unknown>;
        if (String(data.email || '').trim().toLowerCase() === cleanEmail) {
          await updateDoc(doc(db, 'users', uDoc.id), {
            role: 'user',
            updatedAt: serverTimestamp(),
          });
          await deleteDoc(doc(db, 'admins', uDoc.id)).catch(() => {});
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `authorized_admins/${emailKey}`);
    }

    await this.writeAuditLog({
      actorName: user.displayName,
      action: 'ADMIN_EMAIL_REVOKE',
      entityType: 'authorized_admin',
      entityId: emailKey,
      before: { email: cleanEmail },
    });
  }

  // =====================================================================
  // ADMIN CLIENT DATA & FEES LEDGER (Cloud Firestore)
  // =====================================================================

  public async adminGetClients(): Promise<ClientRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'clients'));
      return snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            ...(data as unknown as ClientRecord),
            payments: Array.isArray(data.payments)
              ? (data.payments as ClientFeePayment[])
              : [],
          };
        })
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'clients');
    }
  }

  public async adminCreateClient(payload: Record<string, unknown>): Promise<ClientRecord> {
    const user = this.requireCloudUser();

    const cleanName = String(payload.full_name || '').trim().slice(0, 180);
    if (cleanName.length < 2) {
      throw new Error('Client full name is required (at least 2 characters).');
    }

    const cleanEmail = optionalString(payload.email, 254)?.toLowerCase();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid client email address.');
    }

    const cleanPan = optionalString(payload.pan, 10)?.toUpperCase();
    if (cleanPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      throw new Error('PAN must be a valid 10-character format (e.g. ABCDE1234F).');
    }

    const nowIso = new Date().toISOString();
    const todayDate = nowIso.slice(0, 10);
    const id = generateId('cli');

    const payments: ClientFeePayment[] = [];
    const initialPaid = Number(payload.initial_fee_paid || 0);
    if (Number.isFinite(initialPaid) && initialPaid > 0) {
      payments.push(
        stripEmpty({
          id: generateId('pay'),
          amount: Number(initialPaid.toFixed(2)),
          payment_date: String(payload.initial_payment_date || todayDate).slice(0, 10),
          payment_mode: (payload.initial_payment_mode as PaymentMode) || 'UPI',
          reference_no: optionalString(payload.initial_payment_ref, 80),
          description: 'Initial fee payment',
          recorded_by: user.displayName,
          created_at: nowIso,
        })
      );
    }

    const allowedStatuses = new Set<ClientStatus>(['active', 'inactive', 'lead', 'suspended']);
    const status: ClientStatus =
      payload.status && allowedStatuses.has(payload.status as ClientStatus)
        ? (payload.status as ClientStatus)
        : 'active';

    const financials = computeClientFinancials(
      Number(payload.total_fee_agreed || 0),
      payments,
      Boolean(payload.fee_waived)
    );

    const record: ClientRecord = {
      id,
      full_name: cleanName,
      email: cleanEmail,
      phone: optionalString(payload.phone, 30),
      pan: cleanPan,
      demat_id: optionalString(payload.demat_id, 64),
      client_code: optionalString(payload.client_code, 64),
      service_plan: optionalString(payload.service_plan, 180),
      status,
      ...financials,
      fee_waived: Boolean(payload.fee_waived),
      fee_due_date: optionalString(payload.fee_due_date, 10),
      payments,
      notes: optionalString(payload.notes, 4500),
      joined_date: String(payload.joined_date || todayDate).slice(0, 10),
      created_at: nowIso,
      updated_at: nowIso,
    };

    const docPayload = buildFirestoreClientDoc(record, {
      updatedBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await setDoc(doc(db, 'clients', id), docPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `clients/${id}`);
    }

    await this.writeAuditLog({
      actorName: user.displayName,
      action: 'CLIENT_CREATE',
      entityType: 'client',
      entityId: id,
      after: {
        full_name: record.full_name,
        total_fee_agreed: record.total_fee_agreed,
        total_fee_paid: record.total_fee_paid,
        fee_status: record.fee_status,
      },
    });

    return record;
  }

  public async adminUpdateClient(
    id: string,
    payload: Record<string, unknown>
  ): Promise<ClientRecord> {
    const user = this.requireCloudUser();
    const docRef = doc(db, 'clients', id);

    let existingRaw: Record<string, unknown> | null = null;
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Client record not found.');
      existingRaw = snap.data() as Record<string, unknown>;
    } catch (err) {
      if (err instanceof Error && err.message === 'Client record not found.') throw err;
      handleFirestoreError(err, OperationType.GET, `clients/${id}`);
    }

    const existing = {
      ...(existingRaw as unknown as ClientRecord),
      payments: Array.isArray(existingRaw!.payments)
        ? (existingRaw!.payments as ClientFeePayment[])
        : [],
    };

    const nextName =
      payload.full_name !== undefined
        ? String(payload.full_name).trim().slice(0, 180)
        : existing.full_name;
    if (nextName.length < 2) {
      throw new Error('Client full name must be at least 2 characters.');
    }

    const nextEmail =
      'email' in payload
        ? optionalString(payload.email, 254)?.toLowerCase()
        : existing.email;
    if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      throw new Error('Please enter a valid client email address.');
    }

    const nextPan =
      'pan' in payload ? optionalString(payload.pan, 10)?.toUpperCase() : existing.pan;
    if (nextPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(nextPan)) {
      throw new Error('PAN must be a valid 10-character format (e.g. ABCDE1234F).');
    }

    const allowedStatuses = new Set<ClientStatus>(['active', 'inactive', 'lead', 'suspended']);
    const nextStatus: ClientStatus =
      payload.status && allowedStatuses.has(payload.status as ClientStatus)
        ? (payload.status as ClientStatus)
        : existing.status;

    const nextFeeAgreed =
      payload.total_fee_agreed !== undefined
        ? Number(payload.total_fee_agreed)
        : existing.total_fee_agreed;
    const nextFeeWaived =
      payload.fee_waived !== undefined ? Boolean(payload.fee_waived) : Boolean(existing.fee_waived);

    const financials = computeClientFinancials(nextFeeAgreed, existing.payments, nextFeeWaived);
    const nowIso = new Date().toISOString();

    const updated: ClientRecord = {
      ...existing,
      full_name: nextName,
      email: nextEmail,
      phone: 'phone' in payload ? optionalString(payload.phone, 30) : existing.phone,
      pan: nextPan,
      demat_id: 'demat_id' in payload ? optionalString(payload.demat_id, 64) : existing.demat_id,
      client_code:
        'client_code' in payload ? optionalString(payload.client_code, 64) : existing.client_code,
      service_plan:
        'service_plan' in payload
          ? optionalString(payload.service_plan, 180)
          : existing.service_plan,
      status: nextStatus,
      ...financials,
      fee_waived: nextFeeWaived,
      fee_due_date:
        'fee_due_date' in payload
          ? optionalString(payload.fee_due_date, 10)
          : existing.fee_due_date,
      notes: 'notes' in payload ? optionalString(payload.notes, 4500) : existing.notes,
      joined_date:
        payload.joined_date && String(payload.joined_date).trim()
          ? String(payload.joined_date).trim().slice(0, 10)
          : existing.joined_date,
      updated_at: nowIso,
    };

    const docPayload = buildFirestoreClientDoc(updated, {
      updatedBy: user.uid,
      createdAt: existingRaw!.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const updatePatch = buildUpdatePatch(existingRaw!, docPayload, CLIENT_IMMUTABLE_KEYS);

    try {
      await updateDoc(docRef, updatePatch);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `clients/${id}`);
    }

    await this.writeAuditLog({
      actorName: user.displayName,
      action: 'CLIENT_UPDATE',
      entityType: 'client',
      entityId: id,
      after: {
        full_name: updated.full_name,
        total_fee_agreed: updated.total_fee_agreed,
        fee_status: updated.fee_status,
      },
    });

    return updated;
  }

  public async adminDeleteClient(id: string): Promise<void> {
    const user = this.requireCloudUser();
    const docRef = doc(db, 'clients', id);

    let beforeName: string | undefined;
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        beforeName = String(snap.data().full_name || '');
      }
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `clients/${id}`);
    }

    await this.writeAuditLog({
      actorName: user.displayName,
      action: 'CLIENT_DELETE',
      entityType: 'client',
      entityId: id,
      before: beforeName ? { full_name: beforeName } : undefined,
    });
  }

  public async adminAddClientPayment(
    clientId: string,
    payload: {
      amount: number;
      payment_date?: string;
      payment_mode?: PaymentMode;
      reference_no?: string;
      description?: string;
    }
  ): Promise<ClientRecord> {
    const user = this.requireCloudUser();
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const docRef = doc(db, 'clients', clientId);
    let existingRaw: Record<string, unknown> | null = null;
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Client record not found.');
      existingRaw = snap.data() as Record<string, unknown>;
    } catch (err) {
      if (err instanceof Error && err.message === 'Client record not found.') throw err;
      handleFirestoreError(err, OperationType.GET, `clients/${clientId}`);
    }

    const existing = {
      ...(existingRaw as unknown as ClientRecord),
      payments: Array.isArray(existingRaw!.payments)
        ? (existingRaw!.payments as ClientFeePayment[])
        : [],
    };

    const nowIso = new Date().toISOString();
    const newPayment: ClientFeePayment = stripEmpty({
      id: generateId('pay'),
      amount: Number(amount.toFixed(2)),
      payment_date: (payload.payment_date || nowIso.slice(0, 10)).slice(0, 10),
      payment_mode: payload.payment_mode || 'UPI',
      reference_no: optionalString(payload.reference_no, 80),
      description: optionalString(payload.description, 200),
      recorded_by: user.displayName,
      created_at: nowIso,
    });

    const nextPayments = [newPayment, ...existing.payments].slice(0, 200);
    const financials = computeClientFinancials(
      existing.total_fee_agreed,
      nextPayments,
      existing.fee_waived
    );

    const updated: ClientRecord = {
      ...existing,
      ...financials,
      payments: nextPayments,
      updated_at: nowIso,
    };

    const docPayload = buildFirestoreClientDoc(updated, {
      updatedBy: user.uid,
      createdAt: existingRaw!.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const updatePatch = buildUpdatePatch(existingRaw!, docPayload, CLIENT_IMMUTABLE_KEYS);

    try {
      await updateDoc(docRef, updatePatch);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `clients/${clientId}`);
    }

    await this.writeAuditLog({
      actorName: user.displayName,
      action: 'CLIENT_PAYMENT_ADD',
      entityType: 'client_payment',
      entityId: newPayment.id,
      after: {
        client_id: clientId,
        client_name: existing.full_name,
        amount: newPayment.amount,
        mode: newPayment.payment_mode,
      },
    });

    return updated;
  }

  public async adminDeleteClientPayment(
    clientId: string,
    paymentId: string
  ): Promise<ClientRecord> {
    const user = this.requireCloudUser();
    const docRef = doc(db, 'clients', clientId);

    let existingRaw: Record<string, unknown> | null = null;
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Client record not found.');
      existingRaw = snap.data() as Record<string, unknown>;
    } catch (err) {
      if (err instanceof Error && err.message === 'Client record not found.') throw err;
      handleFirestoreError(err, OperationType.GET, `clients/${clientId}`);
    }

    const existing = {
      ...(existingRaw as unknown as ClientRecord),
      payments: Array.isArray(existingRaw!.payments)
        ? (existingRaw!.payments as ClientFeePayment[])
        : [],
    };

    const nextPayments = existing.payments.filter((p) => p.id !== paymentId);
    const financials = computeClientFinancials(
      existing.total_fee_agreed,
      nextPayments,
      existing.fee_waived
    );
    const nowIso = new Date().toISOString();

    const updated: ClientRecord = {
      ...existing,
      ...financials,
      payments: nextPayments,
      updated_at: nowIso,
    };

    const docPayload = buildFirestoreClientDoc(updated, {
      updatedBy: user.uid,
      createdAt: existingRaw!.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const updatePatch = buildUpdatePatch(existingRaw!, docPayload, CLIENT_IMMUTABLE_KEYS);

    try {
      await updateDoc(docRef, updatePatch);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `clients/${clientId}`);
    }

    await this.writeAuditLog({
      actorName: user.displayName,
      action: 'CLIENT_PAYMENT_DELETE',
      entityType: 'client_payment',
      entityId: paymentId,
      before: { client_id: clientId, client_name: existing.full_name },
    });

    return updated;
  }

  public async adminGetAllApplications(): Promise<IPOApplication[]> {
    try {
      const snap = await getDocs(collection(db, 'ipo_applications'));
      return snap.docs
        .map((d) => d.data() as IPOApplication)
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'ipo_applications');
    }
  }

  // =====================================================================
  // APP SETTINGS (Cloud Firestore /app_settings/global)
  // =====================================================================

  public async adminGetSettings(): Promise<AppSettingsData> {
    try {
      const snap = await getDoc(doc(db, 'app_settings', 'global'));
      if (!snap.exists()) {
        return { gmpStalenessHours: 24, subStalenessHours: 12, seeded: true };
      }
      const data = snap.data() as Record<string, unknown>;
      return {
        gmpStalenessHours: Number(data.gmpStalenessHours) || 24,
        subStalenessHours: Number(data.subStalenessHours) || 12,
        seeded: data.seeded !== false,
        policiesCustomized: Boolean(data.policiesCustomized),
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'app_settings/global');
    }
  }

  public async adminSaveSettings(
    settings: { gmpStalenessHours: number; subStalenessHours: number },
    admin: AdminUser
  ): Promise<void> {
    const user = this.requireCloudUser();
    const gmpHours = Math.min(168, Math.max(1, Math.floor(Number(settings.gmpStalenessHours) || 24)));
    const subHours = Math.min(168, Math.max(1, Math.floor(Number(settings.subStalenessHours) || 12)));

    let policiesCustomized: boolean | undefined;
    try {
      const existingSnap = await getDoc(doc(db, 'app_settings', 'global'));
      if (existingSnap.exists() && existingSnap.data().policiesCustomized === true) {
        policiesCustomized = true;
      }
    } catch {
      // ignore read check failure
    }

    const payload: Record<string, unknown> = {
      gmpStalenessHours: gmpHours,
      subStalenessHours: subHours,
      seeded: true,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    };
    if (policiesCustomized) {
      payload.policiesCustomized = true;
    }

    try {
      await setDoc(doc(db, 'app_settings', 'global'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'app_settings/global');
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'SETTINGS_UPDATE',
      entityType: 'app_settings',
      entityId: 'global',
      after: { gmpStalenessHours: gmpHours, subStalenessHours: subHours },
    });
  }

  // =====================================================================
  // SITE POLICIES, TERMS & DISCLAIMERS (Cloud Firestore /site_policies)
  // =====================================================================

  private buildFirestorePolicyDoc(
    policy: SitePolicy,
    meta: { updatedBy: string; createdAt: unknown; updatedAt: unknown }
  ): Record<string, unknown> {
    const validCategories: SitePolicyCategory[] = [
      'disclaimer',
      'terms',
      'privacy',
      'policy',
      'disclosure',
    ];
    const category: SitePolicyCategory = validCategories.includes(policy.category)
      ? policy.category
      : 'policy';

    const cleanSections: SitePolicySection[] = (Array.isArray(policy.sections) ? policy.sections : [])
      .map((s) => ({
        heading: String(s?.heading || '').trim().slice(0, 250),
        body: String(s?.body || '').trim().slice(0, 12000),
      }))
      .filter((s) => s.heading.length > 0 || s.body.length > 0)
      .slice(0, 45);

    const docObj: Record<string, unknown> = {
      id: policy.id,
      slug: makeSafeSlug(policy.slug || policy.title, 'policy').slice(0, 100),
      title: policy.title.trim().slice(0, 250),
      category,
      show_in_footer_links: Boolean(policy.show_in_footer_links),
      show_in_footer_banner: Boolean(policy.show_in_footer_banner),
      sort_order: Math.min(1000, Math.max(0, Math.floor(Number(policy.sort_order) || 0))),
      sections: cleanSections,
      visibility: 'public',
      created_at: policy.created_at.slice(0, 64),
      updated_at: policy.updated_at.slice(0, 64),
      updatedBy: meta.updatedBy,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    };

    const subtitle = optionalString(policy.subtitle, 450);
    if (subtitle) docObj.subtitle = subtitle;
    const footerSummary = optionalString(policy.footer_summary, 5500);
    if (footerSummary) docObj.footer_summary = footerSummary;

    return docObj;
  }

  private async ensurePoliciesMaterialized(
    uid: string,
    excludeId?: string
  ): Promise<void> {
    const settingsRef = doc(db, 'app_settings', 'global');
    const settingsSnap = await getDoc(settingsRef);
    const existingSettings = settingsSnap.exists()
      ? (settingsSnap.data() as Record<string, unknown>)
      : null;

    if (existingSettings?.policiesCustomized === true) {
      return;
    }

    const existingPoliciesSnap = await getDocs(
      query(collection(db, 'site_policies'), where('visibility', '==', 'public'))
    );
    const existingIds = new Set(existingPoliciesSnap.docs.map((d) => d.id));

    for (const def of DEFAULT_SITE_POLICIES) {
      if (def.id === excludeId || existingIds.has(def.id)) continue;
      const docPayload = this.buildFirestorePolicyDoc(def, {
        updatedBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'site_policies', def.id), docPayload);
    }

    await setDoc(settingsRef, {
      gmpStalenessHours: Number(existingSettings?.gmpStalenessHours) || 24,
      subStalenessHours: Number(existingSettings?.subStalenessHours) || 12,
      seeded: existingSettings?.seeded !== false,
      policiesCustomized: true,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  }

  public async getSitePolicies(): Promise<SitePolicy[]> {
    try {
      const [snap, settingsSnap] = await Promise.all([
        getDocs(query(collection(db, 'site_policies'), where('visibility', '==', 'public'))),
        getDoc(doc(db, 'app_settings', 'global')),
      ]);

      const policiesCustomized =
        settingsSnap.exists() && settingsSnap.data().policiesCustomized === true;

      if (snap.empty && !policiesCustomized) {
        return DEFAULT_SITE_POLICIES.map((p) => ({
          ...p,
          sections: p.sections.map((s) => ({ ...s })),
        }));
      }

      return snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            ...(data as unknown as SitePolicy),
            sections: Array.isArray(data.sections)
              ? (data.sections as SitePolicySection[])
              : [],
          };
        })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'site_policies');
    }
  }

  public async adminCreatePolicy(
    payload: {
      title: string;
      slug?: string;
      subtitle?: string;
      category: SitePolicyCategory;
      footer_summary?: string;
      show_in_footer_links: boolean;
      show_in_footer_banner: boolean;
      sort_order?: number;
      sections: SitePolicySection[];
    },
    admin: AdminUser
  ): Promise<SitePolicy> {
    const user = this.requireCloudUser();
    const title = String(payload.title || '').trim();
    if (!title) {
      throw new Error('Policy or disclaimer title is required.');
    }

    try {
      await this.ensurePoliciesMaterialized(user.uid);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'site_policies');
    }

    const nowIso = new Date().toISOString();
    const id = generateId('pol');
    const slug = makeSafeSlug(payload.slug?.trim() || title, 'policy').slice(0, 100);

    const record: SitePolicy = {
      id,
      slug,
      title: title.slice(0, 250),
      subtitle: optionalString(payload.subtitle, 450),
      category: payload.category || 'policy',
      footer_summary: optionalString(payload.footer_summary, 5500),
      show_in_footer_links: Boolean(payload.show_in_footer_links),
      show_in_footer_banner: Boolean(payload.show_in_footer_banner),
      sort_order: Math.min(1000, Math.max(0, Math.floor(Number(payload.sort_order ?? 10)))),
      sections: (payload.sections || [])
        .map((s) => ({
          heading: String(s.heading || '').trim().slice(0, 250),
          body: String(s.body || '').trim().slice(0, 12000),
        }))
        .filter((s) => s.heading.length > 0 || s.body.length > 0)
        .slice(0, 45),
      created_at: nowIso,
      updated_at: nowIso,
    };

    const docPayload = this.buildFirestorePolicyDoc(record, {
      updatedBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await setDoc(doc(db, 'site_policies', id), docPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `site_policies/${id}`);
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'POLICY_CREATE',
      entityType: 'site_policy',
      entityId: id,
      after: { slug: record.slug, title: record.title, category: record.category },
    });

    return record;
  }

  public async adminUpdatePolicy(
    id: string,
    payload: {
      title: string;
      slug?: string;
      subtitle?: string;
      category: SitePolicyCategory;
      footer_summary?: string;
      show_in_footer_links: boolean;
      show_in_footer_banner: boolean;
      sort_order?: number;
      sections: SitePolicySection[];
    },
    admin: AdminUser
  ): Promise<SitePolicy> {
    const user = this.requireCloudUser();
    const title = String(payload.title || '').trim();
    if (!title) {
      throw new Error('Policy or disclaimer title is required.');
    }

    try {
      await this.ensurePoliciesMaterialized(user.uid);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'site_policies');
    }

    const docRef = doc(db, 'site_policies', id);
    let existingRaw: Record<string, unknown> | null = null;
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        existingRaw = snap.data() as Record<string, unknown>;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `site_policies/${id}`);
    }

    const nowIso = new Date().toISOString();
    const slug = makeSafeSlug(
      payload.slug?.trim() || (existingRaw?.slug as string) || title,
      'policy'
    ).slice(0, 100);

    const record: SitePolicy = {
      id,
      slug,
      title: title.slice(0, 250),
      subtitle: optionalString(payload.subtitle, 450),
      category: payload.category || 'policy',
      footer_summary: optionalString(payload.footer_summary, 5500),
      show_in_footer_links: Boolean(payload.show_in_footer_links),
      show_in_footer_banner: Boolean(payload.show_in_footer_banner),
      sort_order: Math.min(1000, Math.max(0, Math.floor(Number(payload.sort_order ?? 0)))),
      sections: (payload.sections || [])
        .map((s) => ({
          heading: String(s.heading || '').trim().slice(0, 250),
          body: String(s.body || '').trim().slice(0, 12000),
        }))
        .filter((s) => s.heading.length > 0 || s.body.length > 0)
        .slice(0, 45),
      created_at: String(existingRaw?.created_at || nowIso),
      updated_at: nowIso,
    };

    const docPayload = this.buildFirestorePolicyDoc(record, {
      updatedBy: user.uid,
      createdAt: existingRaw?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      if (existingRaw) {
        const updatePatch = buildUpdatePatch(existingRaw, docPayload, POLICY_IMMUTABLE_KEYS);
        await updateDoc(docRef, updatePatch);
      } else {
        await setDoc(docRef, docPayload);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `site_policies/${id}`);
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'POLICY_UPDATE',
      entityType: 'site_policy',
      entityId: id,
      after: { slug: record.slug, title: record.title, category: record.category },
    });

    return record;
  }

  public async adminDeletePolicy(id: string, admin: AdminUser): Promise<void> {
    const user = this.requireCloudUser();

    try {
      await this.ensurePoliciesMaterialized(user.uid, id);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'site_policies');
    }

    const docRef = doc(db, 'site_policies', id);
    let beforeTitle: string | undefined;
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        beforeTitle = String(snap.data().title || '');
        await deleteDoc(docRef);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `site_policies/${id}`);
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'POLICY_DELETE',
      entityType: 'site_policy',
      entityId: id,
      before: beforeTitle ? { title: beforeTitle } : undefined,
    });
  }

  // =====================================================================
  // WEBSITE PAGES & SITE CONTENT (Cloud Firestore /site_pages)
  // =====================================================================

  private buildFirestoreSitePageDoc(
    page: SitePageContent,
    meta: { updatedBy: string; createdAt: unknown; updatedAt: unknown }
  ): Record<string, unknown> {
    const cleanCustomFields: Record<string, string> = {};
    if (page.custom_fields && typeof page.custom_fields === 'object') {
      for (const [k, v] of Object.entries(page.custom_fields).slice(0, 35)) {
        const cleanKey = String(k || '').trim().slice(0, 80);
        if (!cleanKey) continue;
        cleanCustomFields[cleanKey] = truncateUtf8(String(v ?? '').trim(), 1000);
      }
    }

    const cleanExtraSections: SitePolicySection[] = (
      Array.isArray(page.extra_sections) ? page.extra_sections : []
    )
      .map((s) => ({
        heading: truncateUtf8(String(s?.heading || '').trim(), 250),
        body: truncateUtf8(String(s?.body || '').trim(), 10000),
      }))
      .filter((s) => s.heading.length > 0 || s.body.length > 0)
      .slice(0, 25);

    const docObj: Record<string, unknown> = {
      id: page.page_key,
      page_key: page.page_key,
      page_label: truncateUtf8(page.page_label.trim(), 180),
      route_path: truncateUtf8(page.route_path.trim(), 100),
      title: truncateUtf8(page.title.trim(), 280),
      custom_fields: cleanCustomFields,
      extra_sections: cleanExtraSections,
      visibility: 'public',
      created_at: page.created_at.slice(0, 64),
      updated_at: page.updated_at.slice(0, 64),
      updatedBy: meta.updatedBy,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    };

    if (page.eyebrow !== undefined) {
      docObj.eyebrow = truncateUtf8(String(page.eyebrow).trim(), 240);
    }
    if (page.subtitle !== undefined) {
      docObj.subtitle = truncateUtf8(String(page.subtitle).trim(), 1900);
    }
    if (page.primary_cta_label !== undefined) {
      docObj.primary_cta_label = truncateUtf8(String(page.primary_cta_label).trim(), 110);
    }
    if (page.secondary_cta_label !== undefined) {
      docObj.secondary_cta_label = truncateUtf8(String(page.secondary_cta_label).trim(), 110);
    }
    if (page.notice_banner_title !== undefined) {
      docObj.notice_banner_title = truncateUtf8(String(page.notice_banner_title).trim(), 280);
    }
    if (page.notice_banner_body !== undefined) {
      docObj.notice_banner_body = truncateUtf8(String(page.notice_banner_body).trim(), 4800);
    }

    return docObj;
  }

  public async getSitePages(): Promise<Record<SitePageKey, SitePageContent>> {
    try {
      const snap = await getDocs(
        query(collection(db, 'site_pages'), where('visibility', '==', 'public'))
      );
      if (snap.empty) {
        return cloneDefaultSitePages();
      }
      const docs = snap.docs.map((d) => ({
        ...(d.data() as Partial<SitePageContent>),
        id: d.id as SitePageKey,
      }));
      return mergeSitePages(docs);
    } catch (err) {
      console.warn('Unable to load site_pages from Firestore; falling back to defaults:', err);
      return cloneDefaultSitePages();
    }
  }

  public async adminSaveSitePage(
    pageKey: SitePageKey,
    payload: {
      eyebrow?: string;
      title: string;
      subtitle?: string;
      primary_cta_label?: string;
      secondary_cta_label?: string;
      notice_banner_title?: string;
      notice_banner_body?: string;
      custom_fields?: Record<string, string>;
      extra_sections?: SitePolicySection[];
    },
    admin: AdminUser
  ): Promise<SitePageContent> {
    const user = this.requireCloudUser();
    if (!SITE_PAGE_KEYS.includes(pageKey)) {
      throw new Error(`Unsupported website page key "${pageKey}".`);
    }

    const def = DEFAULT_SITE_PAGES[pageKey];
    const cleanTitle = String(payload.title || '').trim();
    if (!cleanTitle) {
      throw new Error('Title / Headline is required.');
    }

    const docRef = doc(db, 'site_pages', pageKey);
    let existingRaw: Record<string, unknown> | null = null;
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        existingRaw = snap.data() as Record<string, unknown>;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `site_pages/${pageKey}`);
    }

    const nowIso = new Date().toISOString();
    const record: SitePageContent = {
      id: pageKey,
      page_key: pageKey,
      page_label: def.page_label,
      route_path: def.route_path,
      eyebrow: payload.eyebrow !== undefined ? payload.eyebrow.trim() : def.eyebrow,
      title: cleanTitle,
      subtitle: payload.subtitle !== undefined ? payload.subtitle.trim() : def.subtitle,
      primary_cta_label:
        payload.primary_cta_label !== undefined
          ? payload.primary_cta_label.trim()
          : def.primary_cta_label,
      secondary_cta_label:
        payload.secondary_cta_label !== undefined
          ? payload.secondary_cta_label.trim()
          : def.secondary_cta_label,
      notice_banner_title:
        payload.notice_banner_title !== undefined
          ? payload.notice_banner_title.trim()
          : def.notice_banner_title,
      notice_banner_body:
        payload.notice_banner_body !== undefined
          ? payload.notice_banner_body.trim()
          : def.notice_banner_body,
      custom_fields: {
        ...def.custom_fields,
        ...(payload.custom_fields || {}),
      },
      extra_sections: (payload.extra_sections || [])
        .map((s) => ({
          heading: String(s?.heading || '').trim(),
          body: String(s?.body || '').trim(),
        }))
        .filter((s) => s.heading.length > 0 || s.body.length > 0),
      is_customized: true,
      created_at: String(existingRaw?.created_at || nowIso),
      updated_at: nowIso,
    };

    const docPayload = this.buildFirestoreSitePageDoc(record, {
      updatedBy: user.uid,
      createdAt: existingRaw?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      if (existingRaw) {
        const updatePatch = buildUpdatePatch(existingRaw, docPayload, SITE_PAGE_IMMUTABLE_KEYS);
        await updateDoc(docRef, updatePatch);
      } else {
        await setDoc(docRef, docPayload);
      }
    } catch (err) {
      handleFirestoreError(err, existingRaw ? OperationType.UPDATE : OperationType.CREATE, `site_pages/${pageKey}`);
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'SITE_PAGE_UPDATE',
      entityType: 'site_page',
      entityId: pageKey,
      after: {
        page_label: record.page_label,
        title: record.title,
        extra_sections: record.extra_sections.length,
      },
    });

    return record;
  }

  public async adminResetSitePage(pageKey: SitePageKey, admin: AdminUser): Promise<void> {
    const user = this.requireCloudUser();
    if (!SITE_PAGE_KEYS.includes(pageKey)) {
      throw new Error(`Unsupported website page key "${pageKey}".`);
    }

    const docRef = doc(db, 'site_pages', pageKey);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await deleteDoc(docRef);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `site_pages/${pageKey}`);
    }

    await this.writeAuditLog({
      actorName: admin?.full_name || user.displayName,
      action: 'SITE_PAGE_RESET',
      entityType: 'site_page',
      entityId: pageKey,
      after: { restored_default: true },
    });
  }
}

export const api = new ApiClient();
