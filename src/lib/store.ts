// =====================================================================
// In-Memory Application Data Store: src/lib/store.ts
// Starts clean with zero pre-seeded/demo IPO records for production publishing
// =====================================================================

import {
  IPO,
  Company,
  GMPSnapshot,
  SubscriptionSnapshot,
  ListingResult,
  IPOSource,
  FeedRun,
  AuditLog,
  AdminUser,
  MarketSummary,
  IPOCategory,
  IPOExchange,
  IPOStatus,
  AnnouncementStatus,
  CategoryLotLimitsMap,
  MinInvestmentMultiples,
  ClientRecord,
  ClientFeePayment,
  ClientStatus,
  FeePaymentStatus,
  PaymentMode,
} from '../types/ipo';
import {
  calculateListingGainPercentage,
  calculateIndicativeGainPercentage,
  deriveIPOStatusFromDates,
  getValidDocUrl,
  INVESTOR_LOT_CATEGORIES,
} from './calculations';

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
      cleaned[cat] = {
        min_lots: minLots,
        max_lots:
          minLots !== undefined && maxLots !== undefined ? Math.max(minLots, maxLots) : maxLots,
      };
      hasAny = true;
    }
  }

  return hasAny ? cleaned : undefined;
}

function sanitizeMinInvestmentMultiples(raw: unknown): MinInvestmentMultiples | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const input = raw as Record<string, unknown>;
  const cleaned: MinInvestmentMultiples = {};
  const toInt = (val: unknown, max: number): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 1 || n > max) return undefined;
    return Math.floor(n);
  };
  const toAmt = (val: unknown, max: number): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined;
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0 || n > max) return undefined;
    return Number(n.toFixed(2));
  };
  const minLots = toInt(input.min_lots, 10000);
  const multipleLots = toInt(input.multiple_lots, 10000);
  const minShares = toInt(input.min_shares, 100000000);
  const multipleShares = toInt(input.multiple_shares, 100000000);
  const minAmount = toAmt(input.min_amount, 10000000000);
  const multipleAmount = toAmt(input.multiple_amount, 10000000000);
  const maxMultiples = toInt(input.max_multiples, 1000);
  if (minLots !== undefined) cleaned.min_lots = minLots;
  if (multipleLots !== undefined) cleaned.multiple_lots = multipleLots;
  if (minShares !== undefined) cleaned.min_shares = minShares;
  if (multipleShares !== undefined) cleaned.multiple_shares = multipleShares;
  if (minAmount !== undefined) cleaned.min_amount = minAmount;
  if (multipleAmount !== undefined) cleaned.multiple_amount = multipleAmount;
  if (maxMultiples !== undefined) cleaned.max_multiples = maxMultiples;
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

// Configured Reference Data Sources (Official Exchanges, SEBI & Registrars)
const INITIAL_SOURCES: IPOSource[] = [
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
    configuration: { disclaimer: 'Informational unlisted price reference (non-GMP)', speculative: true },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '11111111-1111-1111-1111-111111110005',
    provider_name: 'Unlisted Market Reference Feed B',
    source_type: 'community_estimate',
    base_url: 'https://ipowatch.in',
    enabled: true,
    configuration: { disclaimer: 'Informational pre-listing reference observations', speculative: true },
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

// Clean production store — zero pre-seeded companies, IPOs, GMPs, subscriptions, or logs
const INITIAL_COMPANIES: Company[] = [];
const INITIAL_IPOS: IPO[] = [];
const INITIAL_LISTING_RESULTS: ListingResult[] = [];
const INITIAL_GMP_SNAPSHOTS: GMPSnapshot[] = [];
const INITIAL_SUBSCRIPTIONS: SubscriptionSnapshot[] = [];
const INITIAL_ADMINS: AdminUser[] = [];
const INITIAL_FEED_RUNS: FeedRun[] = [];
const INITIAL_AUDIT_LOGS: AuditLog[] = [];

class IPODataStore {
  private companies: Map<string, Company> = new Map();
  private ipos: Map<string, IPO> = new Map();
  private gmpSnapshots: GMPSnapshot[] = [];
  private subscriptionSnapshots: SubscriptionSnapshot[] = [];
  private listingResults: Map<string, ListingResult> = new Map();
  private sources: Map<string, IPOSource> = new Map();
  private feedRuns: FeedRun[] = [];
  private auditLogs: AuditLog[] = [];
  private adminUsers: Map<string, AdminUser> = new Map();
  private clients: Map<string, ClientRecord> = new Map();

  constructor() {
    this.seed();
  }

  private seed() {
    INITIAL_COMPANIES.forEach((c) => this.companies.set(c.id, { ...c }));
    INITIAL_SOURCES.forEach((s) => this.sources.set(s.id, { ...s }));
    INITIAL_ADMINS.forEach((u) => this.adminUsers.set(u.id, { ...u }));
    INITIAL_LISTING_RESULTS.forEach((lr) => this.listingResults.set(lr.ipo_id, { ...lr }));
    INITIAL_GMP_SNAPSHOTS.forEach((g) => this.gmpSnapshots.push({ ...g }));
    INITIAL_SUBSCRIPTIONS.forEach((sub) => this.subscriptionSnapshots.push({ ...sub }));
    INITIAL_FEED_RUNS.forEach((fr) => this.feedRuns.push({ ...fr }));
    INITIAL_AUDIT_LOGS.forEach((al) => this.auditLogs.push({ ...al }));
    INITIAL_IPOS.forEach((ipo) => this.ipos.set(ipo.id, { ...ipo }));
  }

  // --- Read Operations ---

  public getCompany(companyId: string): Company | undefined {
    return this.companies.get(companyId);
  }

  public getAllIPOs(filter?: {
    status?: IPOStatus | 'all';
    category?: IPOCategory | 'all';
    exchange?: string;
    search?: string;
    sort?: 'date_desc' | 'date_asc' | 'gain_desc' | 'gain_asc' | 'size_desc' | 'name_asc';
  }): IPO[] {
    let list: IPO[] = Array.from(this.ipos.values()).map((ipo) => this.hydrateIPO(ipo));

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
        const query = filter.search.toLowerCase().trim();
        list = list.filter(
          (i) =>
            i.company?.name.toLowerCase().includes(query) ||
            i.slug.toLowerCase().includes(query) ||
            i.category.toLowerCase().includes(query) ||
            i.exchange.toLowerCase().includes(query)
        );
      }

      // Sorting
      if (filter.sort) {
        switch (filter.sort) {
          case 'date_desc':
            list.sort(
              (a, b) =>
                new Date(b.open_date || b.listing_date || 0).getTime() -
                new Date(a.open_date || a.listing_date || 0).getTime()
            );
            break;
          case 'date_asc':
            list.sort(
              (a, b) =>
                new Date(a.open_date || a.listing_date || 0).getTime() -
                new Date(b.open_date || b.listing_date || 0).getTime()
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
        // Default: Sort by open/listing date descending
        list.sort(
          (a, b) =>
            new Date(b.open_date || b.listing_date || 0).getTime() -
            new Date(a.open_date || a.listing_date || 0).getTime()
        );
      }
    }

    return list;
  }

  public getIPOBySlug(slug: string): IPO | undefined {
    const raw = Array.from(this.ipos.values()).find((i) => i.slug === slug);
    if (!raw) return undefined;
    return this.hydrateIPO(raw);
  }

  public getIPOById(id: string): IPO | undefined {
    const raw = this.ipos.get(id);
    if (!raw) return undefined;
    return this.hydrateIPO(raw);
  }

  private hydrateIPO(ipo: IPO): IPO {
    const company = this.companies.get(ipo.company_id);

    // GMP history in chronological order
    const gmpHistory = this.gmpSnapshots
      .filter((g) => g.ipo_id === ipo.id)
      .sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime());

    const latest_gmp = gmpHistory.length > 0 ? gmpHistory[gmpHistory.length - 1] : undefined;
    const previous_gmp = gmpHistory.length > 1 ? gmpHistory[gmpHistory.length - 2] : undefined;

    // Subscriptions
    const subHistory = this.subscriptionSnapshots
      .filter((s) => s.ipo_id === ipo.id)
      .sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime());

    const latest_subscription = subHistory.length > 0 ? subHistory[subHistory.length - 1] : undefined;

    // Listing result
    const listing_result = this.listingResults.get(ipo.id);

    // Always derive lifecycle status automatically from entered dates
    const status = deriveIPOStatusFromDates({
      open_date: ipo.open_date,
      close_date: ipo.close_date,
      listing_date: ipo.listing_date,
      has_listing_result: Boolean(listing_result),
      fallback_status: ipo.status,
    });

    return {
      ...ipo,
      status,
      drhp_url: getValidDocUrl(ipo.drhp_url),
      rhp_url: getValidDocUrl(ipo.rhp_url),
      company,
      latest_gmp,
      previous_gmp,
      gmp_history: gmpHistory,
      latest_subscription,
      subscription_history: subHistory,
      listing_result,
    };
  }

  public getMarketSummary(): MarketSummary {
    const all = this.getAllIPOs();
    const open_ipos = all.filter((i) => i.status === 'ongoing');
    const upcoming_ipos = all.filter((i) => i.status === 'upcoming');
    const listed_ipos = all.filter((i) => i.status === 'listed');
    const mainboard = all.filter((i) => i.category === 'Mainboard');
    const sme = all.filter((i) => i.category === 'SME');

    // Top gainers
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

    // Top GMP IPOs
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

  // --- Admin & Mutation Operations ---

  public createIPO(
    data: {
      companyName: string;
      description?: string;
      industry?: string;
      category: IPOCategory;
      exchange: IPOExchange;
      status: IPOStatus;
      announcement_status: AnnouncementStatus;
      open_date?: string;
      close_date?: string;
      allotment_date?: string;
      listing_date?: string;
      price_band_min?: number;
      price_band_max?: number;
      issue_price?: number;
      lot_size?: number;
      issue_size?: number;
      fresh_issue_size?: number;
      offer_for_sale_size?: number;
      retail_quota_percent?: number;
      qib_quota_percent?: number;
      nii_quota_percent?: number;
      employee_quota_percent?: number;
      shareholder_quota_percent?: number;
      other_quota_percent?: number;
      category_lot_limits?: CategoryLotLimitsMap;
      min_investment_multiples?: MinInvestmentMultiples;
      registrar_name?: string;
      registrar_url?: string;
      drhp_url?: string;
      rhp_url?: string;
    },
    actor: { id: string; name: string }
  ): IPO {
    const companySlug = data.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const companyId = `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newCompany: Company = {
      id: companyId,
      name: data.companyName,
      slug: companySlug,
      description: data.description?.trim() || undefined,
      industry: data.industry?.trim() || undefined,
      website_url: '',
      logo_url: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.companies.set(companyId, newCompany);

    const ipoSlug = `${companySlug}-ipo`;
    const ipoId = `ipo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const computedStatus = deriveIPOStatusFromDates({
      open_date: data.open_date,
      close_date: data.close_date,
      listing_date: data.listing_date,
      fallback_status: data.status || 'upcoming',
    });

    const newIPO: IPO = {
      id: ipoId,
      company_id: companyId,
      slug: ipoSlug,
      category: data.category,
      exchange: data.exchange,
      status: computedStatus,
      announcement_status: data.announcement_status,
      open_date: data.open_date || undefined,
      close_date: data.close_date || undefined,
      allotment_date: data.allotment_date || undefined,
      listing_date: data.listing_date || undefined,
      price_band_min: data.price_band_min,
      price_band_max: data.price_band_max,
      issue_price: data.issue_price,
      lot_size: data.lot_size,
      issue_size: data.issue_size,
      fresh_issue_size: data.fresh_issue_size,
      offer_for_sale_size: data.offer_for_sale_size,
      retail_quota_percent: sanitizeQuotaPercent(data.retail_quota_percent),
      qib_quota_percent: sanitizeQuotaPercent(data.qib_quota_percent),
      nii_quota_percent: sanitizeQuotaPercent(data.nii_quota_percent),
      employee_quota_percent: sanitizeQuotaPercent(data.employee_quota_percent),
      shareholder_quota_percent: sanitizeQuotaPercent(data.shareholder_quota_percent),
      other_quota_percent: sanitizeQuotaPercent(data.other_quota_percent),
      category_lot_limits: sanitizeCategoryLotLimits(data.category_lot_limits),
      min_investment_multiples: sanitizeMinInvestmentMultiples(data.min_investment_multiples),
      registrar_name: data.registrar_name?.trim() || undefined,
      registrar_url: getValidDocUrl(data.registrar_url),
      drhp_url: getValidDocUrl(data.drhp_url),
      rhp_url: getValidDocUrl(data.rhp_url),
      official_source_url: '',
      data_verified_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.ipos.set(ipoId, newIPO);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'IPO_CREATE',
      entity_type: 'ipo',
      entity_id: ipoId,
      before_values: null,
      after_values: { slug: ipoSlug, company: data.companyName, category: data.category },
    });

    return this.hydrateIPO(newIPO);
  }

  public updateIPO(
    id: string,
    updates: Partial<IPO> & {
      companyName?: string;
      description?: string;
      industry?: string;
    },
    actor: { id: string; name: string }
  ): IPO | undefined {
    const existing = this.ipos.get(id);
    if (!existing) return undefined;

    const before = this.hydrateIPO(existing);

    // Update linked company fields if provided
    const { companyName, description, industry, ...ipoUpdates } = updates;
    const existingCompany = this.companies.get(existing.company_id);
    if (
      existingCompany &&
      (companyName !== undefined || description !== undefined || industry !== undefined)
    ) {
      const updatedCompany: Company = {
        ...existingCompany,
        name:
          companyName !== undefined && companyName.trim()
            ? companyName.trim()
            : existingCompany.name,
        description: description !== undefined ? description : existingCompany.description,
        industry: industry !== undefined ? industry : existingCompany.industry,
        updated_at: new Date().toISOString(),
      };
      this.companies.set(existing.company_id, updatedCompany);
    }

    // Normalize null values from JSON payloads back to undefined for optional fields
    const normalizedUpdates: Partial<IPO> = {};
    for (const [key, val] of Object.entries(ipoUpdates)) {
      if (key === 'id' || key === 'company_id' || key === 'created_at') continue;
      if (key === 'category_lot_limits') {
        normalizedUpdates.category_lot_limits = sanitizeCategoryLotLimits(val);
        continue;
      }
      if (key === 'min_investment_multiples') {
        normalizedUpdates.min_investment_multiples = sanitizeMinInvestmentMultiples(val);
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
        normalizedUpdates[key] = sanitizeQuotaPercent(val);
        continue;
      }
      (normalizedUpdates as Record<string, unknown>)[key] =
        val === null || val === '' ? undefined : val;
    }

    const merged: IPO = {
      ...existing,
      ...normalizedUpdates,
      registrar_url:
        'registrar_url' in ipoUpdates
          ? getValidDocUrl(normalizedUpdates.registrar_url)
          : existing.registrar_url,
      drhp_url:
        'drhp_url' in ipoUpdates
          ? getValidDocUrl(normalizedUpdates.drhp_url)
          : existing.drhp_url,
      rhp_url:
        'rhp_url' in ipoUpdates
          ? getValidDocUrl(normalizedUpdates.rhp_url)
          : existing.rhp_url,
      updated_at: new Date().toISOString(),
    };

    const updated: IPO = {
      ...merged,
      status: deriveIPOStatusFromDates({
        open_date: merged.open_date,
        close_date: merged.close_date,
        listing_date: merged.listing_date,
        has_listing_result: this.listingResults.has(id),
        fallback_status: merged.status,
      }),
    };
    this.ipos.set(id, updated);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'IPO_UPDATE',
      entity_type: 'ipo',
      entity_id: id,
      before_values: {
        slug: before.slug,
        company: before.company?.name,
        status: before.status,
      },
      after_values: {
        ...(companyName !== undefined ? { companyName } : {}),
        ...normalizedUpdates,
      } as unknown as Record<string, unknown>,
    });

    return this.hydrateIPO(updated);
  }

  public deleteIPO(id: string, actor: { id: string; name: string }): boolean {
    const existing = this.ipos.get(id);
    if (!existing) return false;

    const company = this.companies.get(existing.company_id);
    this.ipos.delete(id);
    this.companies.delete(existing.company_id);
    this.listingResults.delete(id);
    this.gmpSnapshots = this.gmpSnapshots.filter((g) => g.ipo_id !== id);
    this.subscriptionSnapshots = this.subscriptionSnapshots.filter((s) => s.ipo_id !== id);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'IPO_DELETE',
      entity_type: 'ipo',
      entity_id: id,
      before_values: { slug: existing.slug, company: company?.name },
      after_values: null,
    });

    return true;
  }

  public addGMPSnapshot(
    data: {
      ipo_id: string;
      gmp_amount: number;
      source_name: string;
      source_url?: string;
      notes?: string;
      observed_at?: string;
      verification_status?: 'verified' | 'unverified';
    },
    actor: { id: string; name: string }
  ): GMPSnapshot {
    const newSnapshot: GMPSnapshot = {
      id: `gmp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ipo_id: data.ipo_id,
      gmp_amount: data.gmp_amount,
      currency: 'INR',
      unit: 'per share',
      source_name: data.source_name?.trim() || '',
      source_url: getValidDocUrl(data.source_url),
      observed_at: data.observed_at || new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      verification_status: data.verification_status || 'verified',
      created_by: actor.name,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    this.gmpSnapshots.push(newSnapshot);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'GMP_ADD',
      entity_type: 'gmp_snapshot',
      entity_id: newSnapshot.id,
      before_values: null,
      after_values: {
        ipo_id: data.ipo_id,
        gmp_amount: data.gmp_amount,
        source: data.source_name,
      },
    });

    return newSnapshot;
  }

  public deleteGMPSnapshot(id: string, actor: { id: string; name: string }): boolean {
    const idx = this.gmpSnapshots.findIndex((g) => g.id === id);
    if (idx === -1) return false;

    const [removed] = this.gmpSnapshots.splice(idx, 1);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'GMP_DELETE',
      entity_type: 'gmp_snapshot',
      entity_id: id,
      before_values: {
        ipo_id: removed.ipo_id,
        gmp_amount: removed.gmp_amount,
        observed_at: removed.observed_at,
      },
      after_values: null,
    });

    return true;
  }

  public addSubscriptionSnapshot(
    data: {
      ipo_id: string;
      retail_multiple?: number;
      nii_multiple?: number;
      qib_multiple?: number;
      employee_multiple?: number;
      shareholder_multiple?: number;
      total_multiple?: number;
      day_number?: number;
      observed_at?: string;
    },
    actor: { id: string; name: string }
  ): SubscriptionSnapshot {
    const parseMultiple = (val: unknown): number => {
      if (val === undefined || val === null || val === '') return 0;
      const num = Number(val);
      return Number.isFinite(num) && num >= 0 ? num : 0;
    };

    const retailMultiple = parseMultiple(data.retail_multiple);
    const niiMultiple = parseMultiple(data.nii_multiple);
    const qibMultiple = parseMultiple(data.qib_multiple);
    const employeeMultiple = parseMultiple(data.employee_multiple);
    const shareholderMultiple = parseMultiple(data.shareholder_multiple);

    const hasExplicitTotal =
      data.total_multiple !== undefined &&
      data.total_multiple !== null &&
      String(data.total_multiple) !== '' &&
      Number.isFinite(Number(data.total_multiple)) &&
      Number(data.total_multiple) >= 0;

    let totalMultiple: number;
    if (hasExplicitTotal) {
      totalMultiple = Number(Number(data.total_multiple).toFixed(2));
    } else {
      const ipo = this.ipos.get(data.ipo_id);
      const rW = ipo?.retail_quota_percent ?? 35;
      const nW = ipo?.nii_quota_percent ?? 15;
      const qW = ipo?.qib_quota_percent ?? 50;
      const weightSum = rW + nW + qW;
      if (weightSum > 0) {
        totalMultiple = Number(
          ((retailMultiple * rW + niiMultiple * nW + qibMultiple * qW) / weightSum).toFixed(2)
        );
      } else {
        totalMultiple = Number(
          (retailMultiple * 0.35 + niiMultiple * 0.15 + qibMultiple * 0.5).toFixed(2)
        );
      }
    }

    const newSnapshot: SubscriptionSnapshot = {
      id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ipo_id: data.ipo_id,
      retail_multiple: retailMultiple,
      nii_multiple: niiMultiple,
      qib_multiple: qibMultiple,
      employee_multiple: employeeMultiple,
      shareholder_multiple: shareholderMultiple,
      total_multiple: totalMultiple,
      unit: 'times',
      day_number: data.day_number || 1,
      observed_at: data.observed_at || new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      verification_status: 'verified',
      created_at: new Date().toISOString(),
    };

    this.subscriptionSnapshots.push(newSnapshot);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'SUBSCRIPTION_UPDATE',
      entity_type: 'subscription_snapshot',
      entity_id: newSnapshot.id,
      before_values: null,
      after_values: { ipo_id: data.ipo_id, total: totalMultiple },
    });

    return newSnapshot;
  }

  public recordListingResult(
    data: {
      ipo_id: string;
      issue_price: number;
      listing_price: number;
      listing_date: string;
      first_day_close?: number;
    },
    actor: { id: string; name: string }
  ): ListingResult {
    const newResult: ListingResult = {
      id: `list-${Date.now()}`,
      ipo_id: data.ipo_id,
      issue_price: data.issue_price,
      listing_price: data.listing_price,
      listing_date: data.listing_date,
      first_day_close: data.first_day_close,
      previous_close: data.listing_price,
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.listingResults.set(data.ipo_id, newResult);

    // Update IPO status to 'listed'
    const ipo = this.ipos.get(data.ipo_id);
    if (ipo) {
      ipo.status = 'listed';
      ipo.issue_price = data.issue_price;
      ipo.listing_date = data.listing_date;
      this.ipos.set(data.ipo_id, ipo);
    }

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'LISTING_RESULT_RECORD',
      entity_type: 'listing_results',
      entity_id: data.ipo_id,
      before_values: null,
      after_values: {
        issue_price: data.issue_price,
        listing_price: data.listing_price,
      },
    });

    return newResult;
  }

  // --- CSV Import Pipeline ---
  public importFromCSV(
    csvText: string,
    actor: { id: string; name: string },
    options: { dryRun?: boolean } = {}
  ): {
    totalRows: number;
    accepted: number;
    rejected: number;
    errors: string[];
    importedIPOs: Array<{ name: string; slug: string; status: string }>;
  } {
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
    const expectedCols = ['company', 'category', 'exchange', 'price', 'lot_size', 'issue_size', 'status'];
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

      // Check duplicates
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-ipo';
      if (this.getIPOBySlug(slug) && !options.dryRun) {
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

      if (!options.dryRun) {
        this.createIPO(
          {
            companyName,
            category,
            exchange,
            status: resolvedStatus,
            announcement_status: 'confirmed',
            open_date: openDate,
            close_date: closeDate,
            listing_date: listingDate,
            price_band_min: price || undefined,
            price_band_max: price || undefined,
            issue_price: resolvedStatus === 'listed' ? price : undefined,
            lot_size: lotSize || undefined,
            issue_size: issueSize || undefined,
          },
          actor
        );
      }

      accepted++;
      importedIPOs.push({ name: companyName, slug, status: resolvedStatus });
    }

    if (!options.dryRun) {
      this.feedRuns.unshift({
        id: `import-${Date.now()}`,
        job_type: 'csv_import',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        status: rejected === 0 ? 'success' : accepted > 0 ? 'partial' : 'failed',
        records_fetched: lines.length - 1,
        records_accepted: accepted,
        records_rejected: rejected,
        error_summary: errors.length > 0 ? errors.slice(0, 3).join('; ') : undefined,
        created_at: new Date().toISOString(),
      });
    }

    return {
      totalRows: lines.length - 1,
      accepted,
      rejected,
      errors,
      importedIPOs,
    };
  }

  // --- Provider Feed Synchronization ---
  public syncProvider(sourceId: string, actor: { id: string; name: string }): FeedRun {
    const source = this.sources.get(sourceId);
    const startedAt = new Date().toISOString();

    let recordsFetched = 0;
    let recordsAccepted = 0;
    let jobType: FeedRun['job_type'] = 'ipo_discovery';

    const ongoingIPOs = Array.from(this.ipos.values()).filter((i) => i.status === 'ongoing');

    if (source?.source_type === 'exchange') {
      jobType = 'ipo_discovery';
      recordsFetched = ongoingIPOs.length;
      recordsAccepted = ongoingIPOs.length;
      ongoingIPOs.forEach((ipo) => {
        ipo.data_verified_at = new Date().toISOString();
      });
    } else if (source?.source_type === 'community_estimate') {
      jobType = 'gmp_sync';
      recordsFetched = ongoingIPOs.length;
      recordsAccepted = ongoingIPOs.length;
    } else if (source?.source_type === 'registrar') {
      jobType = 'subscription_sync';
      recordsFetched = ongoingIPOs.length;
      recordsAccepted = ongoingIPOs.length;
    }

    const finishedAt = new Date().toISOString();
    const run: FeedRun = {
      id: `run-${Date.now()}`,
      source_id: sourceId,
      provider_name: source?.provider_name || 'System Provider',
      job_type: jobType,
      started_at: startedAt,
      finished_at: finishedAt,
      status: 'success',
      records_fetched: recordsFetched,
      records_accepted: recordsAccepted,
      records_rejected: 0,
      created_at: finishedAt,
    };

    this.feedRuns.unshift(run);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'FEED_SYNC_TRIGGER',
      entity_type: 'feed_run',
      entity_id: run.id,
      before_values: null,
      after_values: {
        provider: source?.provider_name,
        accepted: recordsAccepted,
        status: 'success',
      },
    });

    return run;
  }

  // --- Client Data & Fee Ledger (Admin Backend) ---

  private computeClientFinancials(
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

  public getAllClients(): ClientRecord[] {
    return Array.from(this.clients.values())
      .map((c) => ({ ...c, payments: [...c.payments] }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getClientById(id: string): ClientRecord | undefined {
    const found = this.clients.get(id);
    if (!found) return undefined;
    return { ...found, payments: [...found.payments] };
  }

  public createClient(
    data: {
      full_name: string;
      email?: string;
      phone?: string;
      pan?: string;
      demat_id?: string;
      client_code?: string;
      service_plan?: string;
      status?: ClientStatus;
      total_fee_agreed?: number;
      initial_fee_paid?: number;
      initial_payment_mode?: PaymentMode;
      initial_payment_date?: string;
      initial_payment_ref?: string;
      fee_waived?: boolean;
      fee_due_date?: string;
      notes?: string;
      joined_date?: string;
    },
    actor: { id: string; name: string }
  ): ClientRecord {
    const cleanName = String(data.full_name || '').trim().slice(0, 120);
    if (cleanName.length < 2) {
      throw new Error('Client full name is required (at least 2 characters).');
    }

    const cleanEmail = data.email ? String(data.email).trim().toLowerCase().slice(0, 254) : undefined;
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid client email address.');
    }

    const cleanPan = data.pan ? String(data.pan).trim().toUpperCase().slice(0, 10) : undefined;
    if (cleanPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      throw new Error('PAN must be a valid 10-character format (e.g. ABCDE1234F).');
    }

    const cleanPhone = data.phone ? String(data.phone).trim().slice(0, 20) : undefined;
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.slice(0, 10);
    const id = `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payments: ClientFeePayment[] = [];
    const initialPaid = Number(data.initial_fee_paid || 0);
    if (Number.isFinite(initialPaid) && initialPaid > 0) {
      payments.push({
        id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: Number(initialPaid.toFixed(2)),
        payment_date: (data.initial_payment_date || todayDate).slice(0, 10),
        payment_mode: data.initial_payment_mode || 'UPI',
        reference_no: data.initial_payment_ref
          ? String(data.initial_payment_ref).trim().slice(0, 80)
          : undefined,
        description: 'Initial fee payment',
        recorded_by: actor.name,
        created_at: nowIso,
      });
    }

    const allowedStatuses = new Set<ClientStatus>(['active', 'inactive', 'lead', 'suspended']);
    const status: ClientStatus =
      data.status && allowedStatuses.has(data.status) ? data.status : 'active';

    const financials = this.computeClientFinancials(
      Number(data.total_fee_agreed || 0),
      payments,
      Boolean(data.fee_waived)
    );

    const record: ClientRecord = {
      id,
      full_name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      pan: cleanPan,
      demat_id: data.demat_id ? String(data.demat_id).trim().slice(0, 40) : undefined,
      client_code: data.client_code ? String(data.client_code).trim().slice(0, 40) : undefined,
      service_plan: data.service_plan ? String(data.service_plan).trim().slice(0, 80) : undefined,
      status,
      ...financials,
      fee_waived: Boolean(data.fee_waived),
      fee_due_date: data.fee_due_date ? String(data.fee_due_date).trim().slice(0, 10) : undefined,
      payments,
      notes: data.notes ? String(data.notes).trim().slice(0, 1000) : undefined,
      joined_date: (data.joined_date || todayDate).slice(0, 10),
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.clients.set(id, record);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'CLIENT_CREATE',
      entity_type: 'client',
      entity_id: id,
      before_values: null,
      after_values: {
        full_name: record.full_name,
        total_fee_agreed: record.total_fee_agreed,
        total_fee_paid: record.total_fee_paid,
        fee_status: record.fee_status,
      },
    });

    return { ...record, payments: [...record.payments] };
  }

  public updateClient(
    id: string,
    updates: Partial<{
      full_name: string;
      email: string | null;
      phone: string | null;
      pan: string | null;
      demat_id: string | null;
      client_code: string | null;
      service_plan: string | null;
      status: ClientStatus;
      total_fee_agreed: number;
      fee_waived: boolean;
      fee_due_date: string | null;
      notes: string | null;
      joined_date: string;
    }>,
    actor: { id: string; name: string }
  ): ClientRecord | undefined {
    const existing = this.clients.get(id);
    if (!existing) return undefined;

    const nextName =
      updates.full_name !== undefined
        ? String(updates.full_name).trim().slice(0, 120)
        : existing.full_name;
    if (nextName.length < 2) {
      throw new Error('Client full name must be at least 2 characters.');
    }

    const nextEmail =
      updates.email !== undefined
        ? updates.email
          ? String(updates.email).trim().toLowerCase().slice(0, 254)
          : undefined
        : existing.email;
    if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      throw new Error('Please enter a valid client email address.');
    }

    const nextPan =
      updates.pan !== undefined
        ? updates.pan
          ? String(updates.pan).trim().toUpperCase().slice(0, 10)
          : undefined
        : existing.pan;
    if (nextPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(nextPan)) {
      throw new Error('PAN must be a valid 10-character format (e.g. ABCDE1234F).');
    }

    const allowedStatuses = new Set<ClientStatus>(['active', 'inactive', 'lead', 'suspended']);
    const nextStatus =
      updates.status && allowedStatuses.has(updates.status) ? updates.status : existing.status;

    const nextAgreed =
      updates.total_fee_agreed !== undefined
        ? Number(updates.total_fee_agreed)
        : existing.total_fee_agreed;
    const nextWaived =
      updates.fee_waived !== undefined ? Boolean(updates.fee_waived) : existing.fee_waived;

    const financials = this.computeClientFinancials(nextAgreed, existing.payments, nextWaived);

    const updated: ClientRecord = {
      ...existing,
      full_name: nextName,
      email: nextEmail,
      phone:
        updates.phone !== undefined
          ? updates.phone
            ? String(updates.phone).trim().slice(0, 20)
            : undefined
          : existing.phone,
      pan: nextPan,
      demat_id:
        updates.demat_id !== undefined
          ? updates.demat_id
            ? String(updates.demat_id).trim().slice(0, 40)
            : undefined
          : existing.demat_id,
      client_code:
        updates.client_code !== undefined
          ? updates.client_code
            ? String(updates.client_code).trim().slice(0, 40)
            : undefined
          : existing.client_code,
      service_plan:
        updates.service_plan !== undefined
          ? updates.service_plan
            ? String(updates.service_plan).trim().slice(0, 80)
            : undefined
          : existing.service_plan,
      status: nextStatus,
      ...financials,
      fee_waived: nextWaived,
      fee_due_date:
        updates.fee_due_date !== undefined
          ? updates.fee_due_date
            ? String(updates.fee_due_date).trim().slice(0, 10)
            : undefined
          : existing.fee_due_date,
      notes:
        updates.notes !== undefined
          ? updates.notes
            ? String(updates.notes).trim().slice(0, 1000)
            : undefined
          : existing.notes,
      joined_date:
        updates.joined_date && String(updates.joined_date).trim()
          ? String(updates.joined_date).trim().slice(0, 10)
          : existing.joined_date,
      updated_at: new Date().toISOString(),
    };

    this.clients.set(id, updated);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'CLIENT_UPDATE',
      entity_type: 'client',
      entity_id: id,
      before_values: {
        full_name: existing.full_name,
        total_fee_agreed: existing.total_fee_agreed,
        fee_status: existing.fee_status,
      },
      after_values: {
        full_name: updated.full_name,
        total_fee_agreed: updated.total_fee_agreed,
        fee_status: updated.fee_status,
      },
    });

    return { ...updated, payments: [...updated.payments] };
  }

  public deleteClient(id: string, actor: { id: string; name: string }): boolean {
    const existing = this.clients.get(id);
    if (!existing) return false;
    this.clients.delete(id);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'CLIENT_DELETE',
      entity_type: 'client',
      entity_id: id,
      before_values: { full_name: existing.full_name },
      after_values: null,
    });
    return true;
  }

  public addClientPayment(
    clientId: string,
    data: {
      amount: number;
      payment_date?: string;
      payment_mode?: PaymentMode;
      reference_no?: string;
      description?: string;
    },
    actor: { id: string; name: string }
  ): ClientRecord | undefined {
    const existing = this.clients.get(clientId);
    if (!existing) return undefined;

    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000000) {
      throw new Error('Payment amount must be a positive number.');
    }

    const allowedModes = new Set<PaymentMode>([
      'UPI',
      'NEFT/IMPS',
      'Bank Transfer',
      'Card',
      'Cash',
      'Cheque',
      'Other',
    ]);
    const mode: PaymentMode =
      data.payment_mode && allowedModes.has(data.payment_mode) ? data.payment_mode : 'UPI';

    const nowIso = new Date().toISOString();
    const payment: ClientFeePayment = {
      id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      amount: Number(amount.toFixed(2)),
      payment_date: (data.payment_date || nowIso.slice(0, 10)).slice(0, 10),
      payment_mode: mode,
      reference_no: data.reference_no ? String(data.reference_no).trim().slice(0, 80) : undefined,
      description: data.description ? String(data.description).trim().slice(0, 200) : undefined,
      recorded_by: actor.name,
      created_at: nowIso,
    };

    const nextPayments = [payment, ...existing.payments];
    const financials = this.computeClientFinancials(
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
    this.clients.set(clientId, updated);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'CLIENT_PAYMENT_ADD',
      entity_type: 'client',
      entity_id: clientId,
      before_values: { total_fee_paid: existing.total_fee_paid },
      after_values: {
        payment_amount: payment.amount,
        payment_mode: payment.payment_mode,
        total_fee_paid: updated.total_fee_paid,
      },
    });

    return { ...updated, payments: [...updated.payments] };
  }

  public deleteClientPayment(
    clientId: string,
    paymentId: string,
    actor: { id: string; name: string }
  ): ClientRecord | undefined {
    const existing = this.clients.get(clientId);
    if (!existing) return undefined;

    const removed = existing.payments.find((p) => p.id === paymentId);
    if (!removed) return undefined;

    const nextPayments = existing.payments.filter((p) => p.id !== paymentId);
    const financials = this.computeClientFinancials(
      existing.total_fee_agreed,
      nextPayments,
      existing.fee_waived
    );

    const updated: ClientRecord = {
      ...existing,
      ...financials,
      payments: nextPayments,
      updated_at: new Date().toISOString(),
    };
    this.clients.set(clientId, updated);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'CLIENT_PAYMENT_DELETE',
      entity_type: 'client',
      entity_id: clientId,
      before_values: { removed_payment_amount: removed.amount },
      after_values: { total_fee_paid: updated.total_fee_paid },
    });

    return { ...updated, payments: [...updated.payments] };
  }

  // --- Observability & Metadata ---
  public getSources(): IPOSource[] {
    return Array.from(this.sources.values());
  }

  public getFeedRuns(): FeedRun[] {
    return this.feedRuns.slice(0, 50);
  }

  public getAuditLogs(): AuditLog[] {
    return this.auditLogs.slice(0, 100);
  }

  public getAdminUsers(): AdminUser[] {
    return Array.from(this.adminUsers.values());
  }

  private logAudit(entry: Omit<AuditLog, 'id' | 'created_at'>) {
    const log: AuditLog = {
      ...entry,
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
  }
}

// Global Singleton Instance
export const ipoStore = new IPODataStore();
