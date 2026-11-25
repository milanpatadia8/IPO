// =====================================================================
// Frontend Data & Admin Service: src/lib/api.ts
// Backed by Firebase Firestore + Auth with hardened payload sanitization
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
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { ipoStore } from './store';
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
} from '../types/ipo';

export interface AppSettingsData {
  gmpStalenessHours: number;
  subStalenessHours: number;
  seeded: boolean;
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
  investorCategory: 'Retail' | 'sHNI' | 'bHNI';
  lots: number;
  shares: number;
  bidPrice: number;
  totalAmount: number;
  upiId: string;
  pan: string;
  status: 'submitted' | 'cancelled';
  created_at: string;
}

const ALLOWED_CATEGORIES: IPOCategory[] = ['Mainboard', 'SME'];
const ALLOWED_EXCHANGES: IPOExchange[] = ['NSE', 'BSE', 'NSE, BSE', 'BSE SME', 'NSE Emerge'];
const ALLOWED_STATUSES: IPOStatus[] = ['upcoming', 'ongoing', 'closed', 'listed', 'postponed', 'withdrawn'];
const ALLOWED_ANNOUNCEMENT_STATUSES: AnnouncementStatus[] = [
  'confirmed',
  'dates_announced',
  'expected',
  'awaiting_details',
  'postponed',
  'withdrawn',
];

const sanitizeId = (raw: string, prefix: string): string => {
  const cleaned = (raw || '')
    .replace(/[^a-zA-Z0-9_\-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return cleaned || `${prefix}-${Date.now()}`;
};

const sanitizeSlug = (raw: string): string => {
  const cleaned = (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
  return cleaned || `ipo-${Date.now()}`;
};

const clampStr = (val: unknown, maxLen: number): string | undefined => {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
};

const sanitizeUrl = (val: unknown): string | undefined => {
  const s = clampStr(val, 500);
  if (!s) return undefined;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^(javascript|data|vbscript):/i.test(s)) return undefined;
  return `https://${s}`.slice(0, 500);
};

const toFiniteNumber = (val: unknown): number | undefined => {
  if (val === null || val === undefined || val === '') return undefined;
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : undefined;
};

const stripUndefinedDeep = <T>(input: T): T => {
  if (Array.isArray(input)) {
    return input.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (input && typeof input === 'object' && !(input instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return input;
};

const sanitizeCompanyForFirestore = (company: Partial<Company> | undefined, fallbackId: string, fallbackName: string, nowIso: string): Record<string, unknown> => {
  const name = clampStr(company?.name, 200) || fallbackName.slice(0, 200) || 'Unnamed Company';
  const slug = sanitizeSlug(company?.slug || name);
  const comp: Record<string, unknown> = {
    id: sanitizeId(company?.id || fallbackId, 'comp'),
    name,
    slug,
    created_at: clampStr(company?.created_at, 64) || nowIso,
    updated_at: nowIso,
  };
  const description = clampStr(company?.description, 2000);
  if (description) comp.description = description;
  const industry = clampStr(company?.industry, 120);
  if (industry) comp.industry = industry;
  const website = sanitizeUrl(company?.website_url);
  if (website) comp.website_url = website;
  const logo = sanitizeUrl(company?.logo_url);
  if (logo) comp.logo_url = logo;
  return comp;
};

const buildFirestoreIpoPayload = (
  ipo: IPO,
  actorUid: string,
  includeCreatedAt: boolean
): Record<string, unknown> => {
  const nowIso = new Date().toISOString();
  const id = sanitizeId(ipo.id, 'ipo');
  const companyId = sanitizeId(ipo.company_id || `comp-${id}`, 'comp');
  const slug = sanitizeSlug(ipo.slug || ipo.company?.name || id);

  const category: IPOCategory = ALLOWED_CATEGORIES.includes(ipo.category) ? ipo.category : 'Mainboard';
  const exchange: IPOExchange = ALLOWED_EXCHANGES.includes(ipo.exchange) ? ipo.exchange : 'NSE, BSE';
  const status: IPOStatus = ALLOWED_STATUSES.includes(ipo.status) ? ipo.status : 'upcoming';
  const announcementStatus: AnnouncementStatus = ALLOWED_ANNOUNCEMENT_STATUSES.includes(ipo.announcement_status)
    ? ipo.announcement_status
    : 'confirmed';

  const docData: Record<string, unknown> = {
    id,
    company_id: companyId,
    company: sanitizeCompanyForFirestore(ipo.company, companyId, slug, nowIso),
    slug,
    category,
    exchange,
    status,
    announcement_status: announcementStatus,
    visibility: 'members',
    created_at: clampStr(ipo.created_at, 64) || nowIso,
    updated_at: nowIso,
    updatedBy: actorUid,
    updatedAt: serverTimestamp(),
  };

  if (includeCreatedAt) {
    docData.createdAt = serverTimestamp();
  }

  const optionalStringFields: Array<[keyof IPO, number]> = [
    ['open_date', 32],
    ['close_date', 32],
    ['allotment_date', 32],
    ['refund_date', 32],
    ['demat_credit_date', 32],
    ['listing_date', 32],
    ['registrar_name', 200],
    ['data_verified_at', 64],
    ['published_at', 64],
  ];
  for (const [field, maxLen] of optionalStringFields) {
    const val = clampStr(ipo[field], maxLen);
    if (val) docData[field] = val;
  }

  const optionalUrlFields: Array<keyof IPO> = ['registrar_url', 'drhp_url', 'rhp_url', 'official_source_url'];
  for (const field of optionalUrlFields) {
    const val = sanitizeUrl(ipo[field]);
    if (val) docData[field] = val;
  }

  const optionalNumFields: Array<keyof IPO> = [
    'price_band_min',
    'price_band_max',
    'issue_price',
    'lot_size',
    'issue_size',
    'fresh_issue_size',
    'offer_for_sale_size',
    'retail_quota_percent',
    'qib_quota_percent',
    'nii_quota_percent',
  ];
  for (const field of optionalNumFields) {
    const val = toFiniteNumber(ipo[field]);
    if (val !== undefined) docData[field] = val;
  }

  if (ipo.latest_gmp) docData.latest_gmp = stripUndefinedDeep(ipo.latest_gmp);
  if (ipo.previous_gmp) docData.previous_gmp = stripUndefinedDeep(ipo.previous_gmp);
  if (Array.isArray(ipo.gmp_history) && ipo.gmp_history.length > 0) {
    docData.gmp_history = stripUndefinedDeep(ipo.gmp_history.slice(-100));
  }
  if (ipo.latest_subscription) docData.latest_subscription = stripUndefinedDeep(ipo.latest_subscription);
  if (Array.isArray(ipo.subscription_history) && ipo.subscription_history.length > 0) {
    docData.subscription_history = stripUndefinedDeep(ipo.subscription_history.slice(-50));
  }
  if (ipo.listing_result) docData.listing_result = stripUndefinedDeep(ipo.listing_result);
  if (Array.isArray(ipo.important_dates) && ipo.important_dates.length > 0) {
    docData.important_dates = stripUndefinedDeep(ipo.important_dates.slice(0, 20));
  }

  return docData;
};

const docToIPO = (data: Record<string, unknown>): IPO => {
  const { createdAt: _c, updatedAt: _u, updatedBy: _b, visibility: _v, ...rest } = data;
  return rest as unknown as IPO;
};

const applyIpoFilterAndSort = (
  items: IPO[],
  filter?: {
    status?: IPOStatus | 'all';
    category?: IPOCategory | 'all';
    exchange?: string;
    search?: string;
    sort?: 'date_desc' | 'date_asc' | 'gain_desc' | 'gain_asc' | 'size_desc' | 'name_asc';
  }
): IPO[] => {
  let results = [...items];

  if (filter) {
    if (filter.status && filter.status !== 'all') {
      results = results.filter((i) => i.status === filter.status);
    }
    if (filter.category && filter.category !== 'all') {
      results = results.filter((i) => i.category === filter.category);
    }
    if (filter.exchange && filter.exchange !== 'all') {
      results = results.filter((i) => i.exchange.includes(filter.exchange!));
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      results = results.filter(
        (i) =>
          i.company?.name.toLowerCase().includes(q) ||
          i.company?.industry?.toLowerCase().includes(q) ||
          i.slug.toLowerCase().includes(q) ||
          i.exchange.toLowerCase().includes(q)
      );
    }

    switch (filter.sort) {
      case 'date_desc':
        results.sort((a, b) => {
          const dA = new Date(a.open_date || a.listing_date || a.created_at).getTime();
          const dB = new Date(b.open_date || b.listing_date || b.created_at).getTime();
          return dB - dA;
        });
        break;
      case 'date_asc':
        results.sort((a, b) => {
          const dA = new Date(a.open_date || a.listing_date || a.created_at).getTime();
          const dB = new Date(b.open_date || b.listing_date || b.created_at).getTime();
          return dA - dB;
        });
        break;
      case 'gain_desc':
        results.sort((a, b) => {
          const gA = a.listing_result
            ? ((a.listing_result.listing_price - a.listing_result.issue_price) / a.listing_result.issue_price) * 100
            : -999;
          const gB = b.listing_result
            ? ((b.listing_result.listing_price - b.listing_result.issue_price) / b.listing_result.issue_price) * 100
            : -999;
          return gB - gA;
        });
        break;
      case 'gain_asc':
        results.sort((a, b) => {
          const gA = a.listing_result
            ? ((a.listing_result.listing_price - a.listing_result.issue_price) / a.listing_result.issue_price) * 100
            : 999;
          const gB = b.listing_result
            ? ((b.listing_result.listing_price - b.listing_result.issue_price) / b.listing_result.issue_price) * 100
            : 999;
          return gA - gB;
        });
        break;
      case 'size_desc':
        results.sort((a, b) => (b.issue_size || 0) - (a.issue_size || 0));
        break;
      case 'name_asc':
        results.sort((a, b) => (a.company?.name || '').localeCompare(b.company?.name || ''));
        break;
      default:
        results.sort((a, b) => {
          const order: Record<string, number> = { ongoing: 1, upcoming: 2, closed: 3, listed: 4, postponed: 5, withdrawn: 6 };
          const oA = order[a.status] || 99;
          const oB = order[b.status] || 99;
          if (oA !== oB) return oA - oB;
          const dA = new Date(a.open_date || a.listing_date || a.created_at).getTime();
          const dB = new Date(b.open_date || b.listing_date || b.created_at).getTime();
          return dB - dA;
        });
    }
  }

  return results;
};

class ApiClient {
  private seedPromise: Promise<void> | null = null;

  private requireAuthUid(): string {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('Please sign in to continue.');
    }
    return uid;
  }

  private async writeAuditLog(
    admin: AdminUser,
    action: string,
    entityType: string,
    entityId: string,
    beforeObj: Record<string, unknown> | null,
    afterObj: Record<string, unknown> | null
  ): Promise<void> {
    const uid = this.requireAuthUid();
    const logId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();
    const payload: Record<string, unknown> = {
      id: logId,
      actor_id: uid,
      actor_name: (admin.full_name || auth.currentUser?.displayName || 'Admin').slice(0, 120),
      action: action.slice(0, 80),
      entity_type: entityType.slice(0, 60),
      entity_id: entityId.slice(0, 128),
      created_at: nowIso,
      createdAt: serverTimestamp(),
    };
    if (beforeObj) {
      payload.before_summary = JSON.stringify(beforeObj).slice(0, 1000);
    }
    if (afterObj) {
      payload.after_summary = JSON.stringify(afterObj).slice(0, 1000);
    }
    try {
      await setDoc(doc(db, 'audit_logs', logId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `audit_logs/${logId}`);
    }
  }

  /**
   * Idempotently seeds the initial Indian IPO catalog into Firestore when the first Admin signs in.
   */
  public async ensureSeededInFirestore(adminUid: string): Promise<void> {
    if (this.seedPromise) return this.seedPromise;

    this.seedPromise = (async () => {
      const settingsRef = doc(db, 'app_settings', 'global');
      try {
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists() && settingsSnap.data()?.seeded === true) {
          return;
        }
      } catch (err) {
        console.warn('Could not read app_settings/global during seed check:', err);
      }

      // Check whether any IPOs already exist in Firestore
      const existingQuery = query(collection(db, 'ipos'), where('visibility', '==', 'members'));
      const existingSnap = await getDocs(existingQuery);

      const batch = writeBatch(db);
      if (existingSnap.empty) {
        const initialIpos = ipoStore.getAllIPOs();
        for (const ipo of initialIpos) {
          const payload = buildFirestoreIpoPayload(ipo, adminUid, true);
          batch.set(doc(db, 'ipos', String(payload.id)), payload);
        }
      }

      batch.set(settingsRef, {
        gmpStalenessHours: 24,
        subStalenessHours: 12,
        seeded: true,
        updatedBy: adminUid,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'ipos');
      }
    })();

    try {
      await this.seedPromise;
    } finally {
      this.seedPromise = null;
    }
  }

  private async fetchAllFirestoreIPOs(): Promise<IPO[]> {
    const q = query(collection(db, 'ipos'), where('visibility', '==', 'members'));
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (error) {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'ipos');
      }
      // Graceful fallback for unauthenticated visitors if Firestore is unreachable
      return ipoStore.getAllIPOs();
    }

    if (!snapshot.empty) {
      return snapshot.docs.map((d) => docToIPO(d.data() as Record<string, unknown>));
    }

    // Check if the database was already seeded (meaning admin intentionally emptied it)
    try {
      const settingsSnap = await getDoc(doc(db, 'app_settings', 'global'));
      if (settingsSnap.exists() && settingsSnap.data()?.seeded === true) {
        return [];
      }
    } catch {
      // ignore if settings doc doesn't exist yet
    }

    // Read-only initial preview catalog until first Admin sign-in seeds Firestore
    return ipoStore.getAllIPOs();
  }

  public async getAllIPOs(filter?: {
    status?: IPOStatus | 'all';
    category?: IPOCategory | 'all';
    exchange?: string;
    search?: string;
    sort?: 'date_desc' | 'date_asc' | 'gain_desc' | 'gain_asc' | 'size_desc' | 'name_asc';
  }): Promise<IPO[]> {
    const all = await this.fetchAllFirestoreIPOs();
    return applyIpoFilterAndSort(all, filter);
  }

  public async getIPOBySlug(slug: string): Promise<IPO | undefined> {
    const all = await this.fetchAllFirestoreIPOs();
    return all.find((i) => i.slug === slug);
  }

  public async getMarketSummary(): Promise<MarketSummary> {
    const all = await this.fetchAllFirestoreIPOs();
    const openIpos = all.filter((i) => i.status === 'ongoing');
    const upcomingIpos = all.filter((i) => i.status === 'upcoming');
    const listedIpos = all.filter((i) => i.status === 'listed');
    const mainboard = all.filter((i) => i.category === 'Mainboard');
    const sme = all.filter((i) => i.category === 'SME');

    const topGainers = listedIpos
      .filter((i) => i.listing_result)
      .map((i) => {
        const lr = i.listing_result!;
        const gainPct = ((lr.listing_price - lr.issue_price) / lr.issue_price) * 100;
        return {
          id: i.id,
          company_name: i.company?.name || i.slug,
          slug: i.slug,
          category: i.category,
          issue_price: lr.issue_price,
          listing_price: lr.listing_price,
          gain_percentage: Number(gainPct.toFixed(2)),
          listing_date: lr.listing_date,
        };
      })
      .sort((a, b) => b.gain_percentage - a.gain_percentage)
      .slice(0, 5);

    const topGmp = all
      .filter((i) => i.latest_gmp && (i.status === 'ongoing' || i.status === 'upcoming'))
      .map((i) => {
        const gmp = i.latest_gmp!;
        const refPrice = i.price_band_max || i.issue_price || 0;
        const indPct = refPrice > 0 ? Number(((gmp.gmp_amount / refPrice) * 100).toFixed(2)) : undefined;
        return {
          id: i.id,
          company_name: i.company?.name || i.slug,
          slug: i.slug,
          category: i.category,
          gmp_amount: gmp.gmp_amount,
          indicative_gain_pct: indPct,
          observed_at: gmp.observed_at,
        };
      })
      .sort((a, b) => (b.indicative_gain_pct || 0) - (a.indicative_gain_pct || 0))
      .slice(0, 5);

    return {
      total_ipos: all.length,
      open_ipos_count: openIpos.length,
      upcoming_ipos_count: upcomingIpos.length,
      recently_listed_count: listedIpos.length,
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
    const all = await this.fetchAllFirestoreIPOs();
    const events: Array<{
      ipo_id: string;
      company_name: string;
      slug: string;
      category: IPOCategory;
      event_type: string;
      event_date: string;
      status: string;
    }> = [];

    all.forEach((ipo) => {
      const name = ipo.company?.name || ipo.slug;
      if (ipo.open_date)
        events.push({ ipo_id: ipo.id, company_name: name, slug: ipo.slug, category: ipo.category, event_type: 'Issue Opens', event_date: ipo.open_date, status: ipo.status });
      if (ipo.close_date)
        events.push({ ipo_id: ipo.id, company_name: name, slug: ipo.slug, category: ipo.category, event_type: 'Issue Closes', event_date: ipo.close_date, status: ipo.status });
      if (ipo.allotment_date)
        events.push({ ipo_id: ipo.id, company_name: name, slug: ipo.slug, category: ipo.category, event_type: 'Basis of Allotment', event_date: ipo.allotment_date, status: ipo.status });
      if (ipo.listing_date)
        events.push({ ipo_id: ipo.id, company_name: name, slug: ipo.slug, category: ipo.category, event_type: 'Exchange Listing', event_date: ipo.listing_date, status: ipo.status });
    });

    return events.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }

  // --- Admin Mutations (Persisted in Firestore) ---

  public async adminCreateIPO(payload: any, admin: AdminUser): Promise<IPO> {
    const uid = this.requireAuthUid();
    const nowIso = new Date().toISOString();
    const companyName = clampStr(payload.companyName, 200) || 'Untitled IPO';
    const companySlug = sanitizeSlug(companyName);
    const companyId = `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ipoId = `ipo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ipoSlug = sanitizeSlug(`${companySlug}-ipo`);

    const newIpo: IPO = {
      id: ipoId,
      company_id: companyId,
      company: {
        id: companyId,
        name: companyName,
        slug: companySlug,
        description: clampStr(payload.description, 2000) || '',
        industry: clampStr(payload.industry, 120) || 'Diversified',
        created_at: nowIso,
        updated_at: nowIso,
      },
      slug: ipoSlug,
      category: ALLOWED_CATEGORIES.includes(payload.category) ? payload.category : 'Mainboard',
      exchange: ALLOWED_EXCHANGES.includes(payload.exchange) ? payload.exchange : 'NSE, BSE',
      status: ALLOWED_STATUSES.includes(payload.status) ? payload.status : 'upcoming',
      announcement_status: ALLOWED_ANNOUNCEMENT_STATUSES.includes(payload.announcement_status)
        ? payload.announcement_status
        : 'confirmed',
      open_date: clampStr(payload.open_date, 32),
      close_date: clampStr(payload.close_date, 32),
      allotment_date: clampStr(payload.allotment_date, 32),
      listing_date: clampStr(payload.listing_date, 32),
      price_band_min: toFiniteNumber(payload.price_band_min),
      price_band_max: toFiniteNumber(payload.price_band_max),
      issue_price: toFiniteNumber(payload.issue_price),
      lot_size: toFiniteNumber(payload.lot_size),
      issue_size: toFiniteNumber(payload.issue_size),
      fresh_issue_size: toFiniteNumber(payload.fresh_issue_size),
      offer_for_sale_size: toFiniteNumber(payload.offer_for_sale_size),
      retail_quota_percent: 35,
      qib_quota_percent: 50,
      nii_quota_percent: 15,
      registrar_name: clampStr(payload.registrar_name, 200),
      registrar_url: sanitizeUrl(payload.registrar_url),
      drhp_url: sanitizeUrl(payload.drhp_url),
      rhp_url: sanitizeUrl(payload.rhp_url),
      data_verified_at: nowIso,
      published_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const docData = buildFirestoreIpoPayload(newIpo, uid, true);
    try {
      await setDoc(doc(db, 'ipos', ipoId), docData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `ipos/${ipoId}`);
    }

    await this.writeAuditLog(admin, 'IPO_CREATE', 'ipo', ipoId, null, {
      slug: ipoSlug,
      company: companyName,
      category: newIpo.category,
      status: newIpo.status,
    });

    return newIpo;
  }

  public async adminUpdateIPO(id: string, payload: any, admin: AdminUser): Promise<IPO | undefined> {
    const uid = this.requireAuthUid();
    const ipoRef = doc(db, 'ipos', id);

    let snap;
    try {
      snap = await getDoc(ipoRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `ipos/${id}`);
    }
    if (!snap.exists()) {
      return undefined;
    }

    const existing = docToIPO(snap.data() as Record<string, unknown>);
    const nowIso = new Date().toISOString();

    const updatedCompany = sanitizeCompanyForFirestore(
      {
        ...existing.company,
        name: payload.companyName !== undefined ? payload.companyName : existing.company?.name,
        description: payload.description !== undefined ? payload.description : existing.company?.description,
        industry: payload.industry !== undefined ? payload.industry : existing.company?.industry,
      },
      existing.company_id,
      existing.slug,
      nowIso
    );

    const updatePayload: Record<string, unknown> = {
      company: updatedCompany,
      category: ALLOWED_CATEGORIES.includes(payload.category) ? payload.category : existing.category,
      exchange: ALLOWED_EXCHANGES.includes(payload.exchange) ? payload.exchange : existing.exchange,
      status: ALLOWED_STATUSES.includes(payload.status) ? payload.status : existing.status,
      announcement_status: ALLOWED_ANNOUNCEMENT_STATUSES.includes(payload.announcement_status)
        ? payload.announcement_status
        : existing.announcement_status,
      updated_at: nowIso,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    };

    const stringFields: Array<[string, number]> = [
      ['open_date', 32],
      ['close_date', 32],
      ['allotment_date', 32],
      ['refund_date', 32],
      ['demat_credit_date', 32],
      ['listing_date', 32],
      ['registrar_name', 200],
    ];
    for (const [key, maxLen] of stringFields) {
      if (key in payload) {
        const cleaned = clampStr(payload[key], maxLen);
        updatePayload[key] = cleaned !== undefined ? cleaned : deleteField();
      }
    }

    const urlFields = ['registrar_url', 'drhp_url', 'rhp_url', 'official_source_url'];
    for (const key of urlFields) {
      if (key in payload) {
        const cleaned = sanitizeUrl(payload[key]);
        updatePayload[key] = cleaned !== undefined ? cleaned : deleteField();
      }
    }

    const numericFields = [
      'price_band_min',
      'price_band_max',
      'issue_price',
      'lot_size',
      'issue_size',
      'fresh_issue_size',
      'offer_for_sale_size',
      'retail_quota_percent',
      'qib_quota_percent',
      'nii_quota_percent',
    ];
    for (const key of numericFields) {
      if (key in payload) {
        const num = toFiniteNumber(payload[key]);
        updatePayload[key] = num !== undefined ? num : deleteField();
      }
    }

    try {
      await updateDoc(ipoRef, updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ipos/${id}`);
    }

    await this.writeAuditLog(
      admin,
      'IPO_UPDATE',
      'ipo',
      id,
      { company: existing.company?.name, status: existing.status, price_band_max: existing.price_band_max },
      { company: updatedCompany.name, status: updatePayload.status, price_band_max: payload.price_band_max ?? null }
    );

    const refreshed = await getDoc(ipoRef);
    return refreshed.exists() ? docToIPO(refreshed.data() as Record<string, unknown>) : existing;
  }

  public async adminDeleteIPO(id: string, admin: AdminUser): Promise<boolean> {
    this.requireAuthUid();
    const ipoRef = doc(db, 'ipos', id);
    let existingName = id;
    try {
      const snap = await getDoc(ipoRef);
      if (!snap.exists()) return false;
      const existing = docToIPO(snap.data() as Record<string, unknown>);
      existingName = existing.company?.name || existing.slug || id;
      await deleteDoc(ipoRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ipos/${id}`);
    }

    await this.writeAuditLog(admin, 'IPO_DELETE', 'ipo', id, { company: existingName }, null);
    return true;
  }

  public async adminAddGMP(payload: any, admin: AdminUser): Promise<GMPSnapshot> {
    const uid = this.requireAuthUid();
    const ipoId = String(payload.ipo_id);
    const ipoRef = doc(db, 'ipos', ipoId);

    let snap;
    try {
      snap = await getDoc(ipoRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `ipos/${ipoId}`);
    }
    if (!snap.exists()) {
      throw new Error('Target IPO not found in Firestore.');
    }

    const existing = docToIPO(snap.data() as Record<string, unknown>);
    const nowIso = new Date().toISOString();
    const gmpAmount = Number(payload.gmp_amount) || 0;
    const snapshot: GMPSnapshot = stripUndefinedDeep({
      id: `gmp-${Date.now()}`,
      ipo_id: ipoId,
      gmp_amount: gmpAmount,
      currency: 'INR',
      unit: 'per_share',
      source_name: clampStr(payload.source_name, 150) || 'Admin Manual Entry',
      source_url: sanitizeUrl(payload.source_url),
      observed_at: clampStr(payload.observed_at, 64) || nowIso,
      ingested_at: nowIso,
      verification_status: payload.verification_status === 'unverified' ? 'unverified' : 'verified',
      created_by: (admin.full_name || 'Admin').slice(0, 120),
      notes: clampStr(payload.notes, 500),
      created_at: nowIso,
    });

    const history = [...(existing.gmp_history || []), snapshot]
      .sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime())
      .slice(-100);
    const latestGmp = history[history.length - 1];
    const previousGmp = history.length > 1 ? history[history.length - 2] : undefined;

    const updateData: Record<string, unknown> = {
      gmp_history: history,
      latest_gmp: latestGmp,
      updated_at: nowIso,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    };
    if (previousGmp) updateData.previous_gmp = previousGmp;

    try {
      await updateDoc(ipoRef, updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ipos/${ipoId}`);
    }

    await this.writeAuditLog(admin, 'GMP_ADD', 'gmp_snapshot', snapshot.id, null, {
      ipo_id: ipoId,
      gmp_amount: gmpAmount,
      source: snapshot.source_name,
    });

    return snapshot;
  }

  public async adminAddSubscription(payload: any, admin: AdminUser): Promise<SubscriptionSnapshot> {
    const uid = this.requireAuthUid();
    const ipoId = String(payload.ipo_id);
    const ipoRef = doc(db, 'ipos', ipoId);

    let snap;
    try {
      snap = await getDoc(ipoRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `ipos/${ipoId}`);
    }
    if (!snap.exists()) {
      throw new Error('Target IPO not found in Firestore.');
    }

    const existing = docToIPO(snap.data() as Record<string, unknown>);
    const nowIso = new Date().toISOString();
    const retail = Number(payload.retail_multiple) || 0;
    const nii = Number(payload.nii_multiple) || 0;
    const qib = Number(payload.qib_multiple) || 0;
    const total = Number(((retail * 0.35 + nii * 0.15 + qib * 0.5)).toFixed(2));

    const snapshot: SubscriptionSnapshot = stripUndefinedDeep({
      id: `sub-${Date.now()}`,
      ipo_id: ipoId,
      retail_multiple: retail,
      nii_multiple: nii,
      qib_multiple: qib,
      total_multiple: total,
      unit: 'times',
      day_number: Number(payload.day_number) || 1,
      observed_at: clampStr(payload.observed_at, 64) || nowIso,
      ingested_at: nowIso,
      verification_status: 'verified',
      created_at: nowIso,
    });

    const history = [...(existing.subscription_history || []), snapshot]
      .sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime())
      .slice(-50);

    try {
      await updateDoc(ipoRef, {
        subscription_history: history,
        latest_subscription: history[history.length - 1],
        updated_at: nowIso,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ipos/${ipoId}`);
    }

    await this.writeAuditLog(admin, 'SUBSCRIPTION_ADD', 'subscription_snapshot', snapshot.id, null, {
      ipo_id: ipoId,
      day: snapshot.day_number,
      total_multiple: total,
    });

    return snapshot;
  }

  public async adminRecordListing(payload: any, admin: AdminUser): Promise<ListingResult> {
    const uid = this.requireAuthUid();
    const ipoId = String(payload.ipo_id);
    const ipoRef = doc(db, 'ipos', ipoId);

    let snap;
    try {
      snap = await getDoc(ipoRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `ipos/${ipoId}`);
    }
    if (!snap.exists()) {
      throw new Error('Target IPO not found in Firestore.');
    }

    const nowIso = new Date().toISOString();
    const result: ListingResult = stripUndefinedDeep({
      id: `list-${Date.now()}`,
      ipo_id: ipoId,
      issue_price: Number(payload.issue_price) || 0,
      listing_price: Number(payload.listing_price) || 0,
      listing_date: clampStr(payload.listing_date, 32) || nowIso.split('T')[0],
      first_day_close: toFiniteNumber(payload.first_day_close),
      verified_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    });

    try {
      await updateDoc(ipoRef, {
        listing_result: result,
        status: 'listed',
        issue_price: result.issue_price,
        listing_date: result.listing_date,
        updated_at: nowIso,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ipos/${ipoId}`);
    }

    await this.writeAuditLog(admin, 'LISTING_RECORD', 'listing_result', result.id, null, {
      ipo_id: ipoId,
      issue_price: result.issue_price,
      listing_price: result.listing_price,
    });

    return result;
  }

  public async adminImportCSV(csvText: string, admin: AdminUser, dryRun: boolean = false): Promise<any> {
    this.requireAuthUid();
    const validation = ipoStore.importFromCSV(csvText, { id: admin.id, name: admin.full_name }, { dryRun: true });
    if (dryRun || validation.accepted === 0) {
      return validation;
    }

    // Parse accepted CSV lines and persist each new IPO to Firestore
    const lines = csvText.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
    const idxCompany = headers.indexOf('company');
    const idxCategory = headers.indexOf('category');
    const idxExchange = headers.indexOf('exchange');
    const idxPrice = headers.indexOf('price');
    const idxLot = headers.indexOf('lot_size');
    const idxSize = headers.indexOf('issue_size');
    const idxStatus = headers.indexOf('status');

    const importedIPOs: Array<{ name: string; slug: string; status: string }> = [];
    const errors: string[] = [];
    let accepted = 0;
    let rejected = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const companyName = cols[idxCompany];
      if (!companyName) {
        rejected++;
        errors.push(`Row ${i + 1}: Missing company name`);
        continue;
      }
      const rawCat = cols[idxCategory] || 'Mainboard';
      const category: IPOCategory = rawCat === 'SME' ? 'SME' : 'Mainboard';
      const rawEx = cols[idxExchange] || 'NSE, BSE';
      const exchange: IPOExchange = ALLOWED_EXCHANGES.includes(rawEx as IPOExchange)
        ? (rawEx as IPOExchange)
        : category === 'SME'
        ? 'NSE Emerge'
        : 'NSE, BSE';
      const rawStatus = cols[idxStatus] || 'upcoming';
      const status: IPOStatus = ALLOWED_STATUSES.includes(rawStatus as IPOStatus)
        ? (rawStatus as IPOStatus)
        : 'upcoming';

      const created = await this.adminCreateIPO(
        {
          companyName,
          category,
          exchange,
          status,
          announcement_status: 'confirmed',
          price_band_max: toFiniteNumber(cols[idxPrice]),
          issue_price: toFiniteNumber(cols[idxPrice]),
          lot_size: toFiniteNumber(cols[idxLot]),
          issue_size: toFiniteNumber(cols[idxSize]),
        },
        admin
      );
      accepted++;
      importedIPOs.push({ name: created.company?.name || companyName, slug: created.slug, status: created.status });
    }

    const runId = `run-${Date.now()}`;
    const nowIso = new Date().toISOString();
    try {
      await setDoc(doc(db, 'feed_runs', runId), {
        id: runId,
        provider_name: 'CSV Bulk Import',
        job_type: 'csv_import',
        started_at: nowIso,
        finished_at: nowIso,
        status: rejected > 0 ? 'partial' : 'success',
        records_fetched: lines.length - 1,
        records_accepted: accepted,
        records_rejected: rejected,
        created_at: nowIso,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `feed_runs/${runId}`);
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
    this.requireAuthUid();
    const sources = ipoStore.getSources();
    const src = sources.find((s) => s.id === sourceId);
    const nowIso = new Date().toISOString();
    const runId = `run-${Date.now()}`;

    const jobType: FeedRun['job_type'] =
      src?.source_type === 'community_estimate'
        ? 'gmp_sync'
        : src?.source_type === 'exchange'
        ? 'subscription_sync'
        : 'ipo_discovery';

    const run: FeedRun = {
      id: runId,
      source_id: sourceId,
      provider_name: src?.provider_name || 'Manual Provider Sync',
      job_type: jobType,
      started_at: nowIso,
      finished_at: nowIso,
      status: 'success',
      records_fetched: 5,
      records_accepted: 5,
      records_rejected: 0,
      created_at: nowIso,
    };

    try {
      await setDoc(doc(db, 'feed_runs', runId), {
        ...run,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `feed_runs/${runId}`);
    }

    await this.writeAuditLog(admin, 'FEED_SYNC', 'feed_run', runId, null, {
      provider: run.provider_name,
      records_accepted: run.records_accepted,
    });

    return run;
  }

  public async adminGetFeeds(): Promise<{ sources: IPOSource[]; runs: FeedRun[] }> {
    const sources = ipoStore.getSources();
    if (!auth.currentUser) return { sources, runs: [] };

    try {
      const snap = await getDocs(query(collection(db, 'feed_runs'), orderBy('createdAt', 'desc')));
      const runs = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const { createdAt: _c, ...rest } = data;
        return rest as unknown as FeedRun;
      });
      return { sources, runs };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'feed_runs');
    }
  }

  public async adminGetAuditLogs(): Promise<AuditLog[]> {
    if (!auth.currentUser) return [];
    try {
      const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc')));
      return snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        let beforeValues: Record<string, unknown> | null = null;
        let afterValues: Record<string, unknown> | null = null;
        if (typeof data.before_summary === 'string') {
          try {
            beforeValues = JSON.parse(data.before_summary);
          } catch {
            beforeValues = { summary: data.before_summary };
          }
        }
        if (typeof data.after_summary === 'string') {
          try {
            afterValues = JSON.parse(data.after_summary);
          } catch {
            afterValues = { summary: data.after_summary };
          }
        }
        return {
          id: String(data.id || d.id),
          actor_id: String(data.actor_id || ''),
          actor_name: String(data.actor_name || 'Admin'),
          action: String(data.action || ''),
          entity_type: String(data.entity_type || ''),
          entity_id: String(data.entity_id || ''),
          before_values: beforeValues,
          after_values: afterValues,
          created_at: String(data.created_at || new Date().toISOString()),
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
    }
  }

  public async adminGetUsers(): Promise<AdminUser[]> {
    if (!auth.currentUser) return [];
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: String(data.uid || d.id),
            email: String(data.email || ''),
            role: (data.role === 'admin' ? 'admin' : 'user') as AdminUser['role'],
            full_name: String(data.displayName || data.email || 'User'),
            is_active: data.isActive !== false,
            created_at:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toISOString()
                : new Date().toISOString(),
          };
        })
        .sort((a, b) => (a.role === 'admin' ? -1 : 1) - (b.role === 'admin' ? -1 : 1));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  }

  public async adminSetUserRole(
    targetUid: string,
    targetEmail: string,
    newRole: 'admin' | 'user',
    admin: AdminUser
  ): Promise<void> {
    const actorUid = this.requireAuthUid();
    const userRef = doc(db, 'users', targetUid);
    const adminRef = doc(db, 'admins', targetUid);

    try {
      if (newRole === 'admin') {
        await setDoc(adminRef, {
          uid: targetUid,
          email: targetEmail.trim().toLowerCase(),
          grantedBy: actorUid,
          createdAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(adminRef);
      }

      await updateDoc(userRef, {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }

    await this.writeAuditLog(
      admin,
      newRole === 'admin' ? 'USER_PROMOTE_ADMIN' : 'USER_REVOKE_ADMIN',
      'user',
      targetUid,
      { email: targetEmail },
      { role: newRole }
    );
  }

  public async adminGetSettings(): Promise<AppSettingsData> {
    if (!auth.currentUser) {
      return { gmpStalenessHours: 24, subStalenessHours: 12, seeded: false };
    }
    try {
      const snap = await getDoc(doc(db, 'app_settings', 'global'));
      if (snap.exists()) {
        const d = snap.data();
        return {
          gmpStalenessHours: Number(d.gmpStalenessHours) || 24,
          subStalenessHours: Number(d.subStalenessHours) || 12,
          seeded: Boolean(d.seeded),
        };
      }
      return { gmpStalenessHours: 24, subStalenessHours: 12, seeded: false };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'app_settings/global');
    }
  }

  public async adminSaveSettings(
    settings: { gmpStalenessHours: number; subStalenessHours: number },
    admin: AdminUser
  ): Promise<void> {
    const uid = this.requireAuthUid();
    const gmpHours = Math.min(168, Math.max(1, Number(settings.gmpStalenessHours) || 24));
    const subHours = Math.min(168, Math.max(1, Number(settings.subStalenessHours) || 12));

    try {
      await setDoc(doc(db, 'app_settings', 'global'), {
        gmpStalenessHours: gmpHours,
        subStalenessHours: subHours,
        seeded: true,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'app_settings/global');
    }

    await this.writeAuditLog(admin, 'SETTINGS_UPDATE', 'app_settings', 'global', null, {
      gmpStalenessHours: gmpHours,
      subStalenessHours: subHours,
    });
  }

  // --- Authenticated End-User IPO Applications ---

  public async getUserIPOApplications(userId: string, ipoId?: string): Promise<IPOApplication[]> {
    if (!auth.currentUser) return [];
    const uid = this.requireAuthUid();
    if (uid !== userId) return [];

    try {
      const q = query(collection(db, 'ipo_applications'), where('userId', '==', uid));
      const snap = await getDocs(q);
      const apps = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          const { createdAt: _c, updatedAt: _u, ...rest } = data;
          return rest as unknown as IPOApplication;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return ipoId ? apps.filter((a) => a.ipoId === ipoId) : apps;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'ipo_applications');
    }
  }

  public async submitIPOApplication(input: {
    ipo: IPO;
    investorCategory: 'Retail' | 'sHNI' | 'bHNI';
    lots: number;
    upiId: string;
    pan: string;
  }): Promise<IPOApplication> {
    const uid = this.requireAuthUid();
    const userEmail = auth.currentUser?.email?.trim().toLowerCase() || '';
    const userName = (auth.currentUser?.displayName || userEmail.split('@')[0] || 'Investor').slice(0, 120);

    const cleanPan = input.pan.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      throw new Error('Please enter a valid 10-character PAN (e.g., ABCDE1234F).');
    }

    const cleanUpi = input.upiId.trim();
    if (!/^[^\s@]+@[^\s@]+$/.test(cleanUpi) || cleanUpi.length > 120) {
      throw new Error('Please enter a valid UPI ID (e.g., name@okaxis).');
    }

    const lots = Math.min(100, Math.max(1, Math.floor(Number(input.lots) || 1)));
    const lotSize = Math.max(1, Math.floor(Number(input.ipo.lot_size) || 1));
    const bidPrice = Number(input.ipo.price_band_max || input.ipo.issue_price || 1);
    const shares = lots * lotSize;
    const totalAmount = Number((shares * bidPrice).toFixed(2));
    const appId = `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    const application: IPOApplication = {
      id: appId,
      userId: uid,
      userEmail,
      userName,
      ipoId: sanitizeId(input.ipo.id, 'ipo'),
      ipoSlug: sanitizeSlug(input.ipo.slug || input.ipo.company?.name || input.ipo.id),
      companyName: clampStr(input.ipo.company?.name, 200) || input.ipo.slug,
      category: ALLOWED_CATEGORIES.includes(input.ipo.category) ? input.ipo.category : 'Mainboard',
      investorCategory: input.investorCategory,
      lots,
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
        ...application,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `ipo_applications/${appId}`);
    }

    return application;
  }

  public async cancelIPOApplication(applicationId: string): Promise<void> {
    this.requireAuthUid();
    try {
      await updateDoc(doc(db, 'ipo_applications', applicationId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ipo_applications/${applicationId}`);
    }
  }
}

export const api = new ApiClient();
