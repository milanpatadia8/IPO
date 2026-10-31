// =====================================================================
// Frontend API Client: src/lib/api.ts
// Handles API calls to Express backend with graceful fallback to local store
// =====================================================================

import { ipoStore } from './store';
import { IPO, MarketSummary, FeedRun, AuditLog, AdminUser, IPOSource, IPOCategory, IPOStatus } from '../types/ipo';

class ApiClient {
  private async fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn(`[API Client] Fallback to local store for ${url}:`, err);
      throw err;
    }
  }

  public async getMarketSummary(): Promise<MarketSummary> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: MarketSummary }>('/api/market-summary');
      return res.data;
    } catch {
      return ipoStore.getMarketSummary();
    }
  }

  public async getAllIPOs(filter?: {
    status?: IPOStatus | 'all';
    category?: IPOCategory | 'all';
    exchange?: string;
    search?: string;
    sort?: 'date_desc' | 'date_asc' | 'gain_desc' | 'gain_asc' | 'size_desc' | 'name_asc';
  }): Promise<IPO[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.status && filter.status !== 'all') params.set('status', filter.status);
      if (filter?.category && filter.category !== 'all') params.set('category', filter.category);
      if (filter?.exchange && filter.exchange !== 'all') params.set('exchange', filter.exchange);
      if (filter?.search) params.set('search', filter.search);
      if (filter?.sort) params.set('sort', filter.sort);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await this.fetchJson<{ success: boolean; data: IPO[] }>(`/api/ipos${qs}`);
      return res.data;
    } catch {
      return ipoStore.getAllIPOs(filter);
    }
  }

  public async getIPOBySlug(slug: string): Promise<IPO | undefined> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: IPO }>(`/api/ipos/${slug}`);
      return res.data;
    } catch {
      return ipoStore.getIPOBySlug(slug);
    }
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
    try {
      const res = await this.fetchJson<{
        success: boolean;
        data: Array<{
          ipo_id: string;
          company_name: string;
          slug: string;
          category: IPOCategory;
          event_type: string;
          event_date: string;
          status: string;
        }>;
      }>('/api/calendar');
      return res.data;
    } catch {
      const all = ipoStore.getAllIPOs();
      const events: any[] = [];
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
  }

  // Admin APIs
  public async adminLogin(email: string): Promise<AdminUser> {
    try {
      const res = await this.fetchJson<{ success: boolean; user: AdminUser }>('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return res.user;
    } catch {
      return {
        id: 'admin-1',
        email: email || 'milanpatadia8@gmail.com',
        role: 'admin',
        full_name: 'Milan Patadia',
        is_active: true,
        created_at: new Date().toISOString(),
      };
    }
  }

  public async adminCreateIPO(payload: any, admin: AdminUser): Promise<IPO> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: IPO }>('/api/admin/ipos', {
        method: 'POST',
        headers: { 'x-admin-id': admin.id, 'x-admin-name': admin.full_name },
        body: JSON.stringify(payload),
      });
      return res.data;
    } catch {
      return ipoStore.createIPO(payload, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminUpdateIPO(id: string, payload: any, admin: AdminUser): Promise<IPO | undefined> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: IPO }>(`/api/admin/ipos/${id}`, {
        method: 'PATCH',
        headers: { 'x-admin-id': admin.id, 'x-admin-name': admin.full_name },
        body: JSON.stringify(payload),
      });
      return res.data;
    } catch {
      return ipoStore.updateIPO(id, payload, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminDeleteIPO(id: string, admin: AdminUser): Promise<boolean> {
    try {
      const res = await this.fetchJson<{ success: boolean }>(`/api/admin/ipos/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': admin.id, 'x-admin-name': admin.full_name },
      });
      return res.success;
    } catch {
      return ipoStore.deleteIPO(id, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminAddGMP(payload: any, admin: AdminUser): Promise<any> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: any }>('/api/admin/gmp', {
        method: 'POST',
        headers: { 'x-admin-id': admin.id, 'x-admin-name': admin.full_name },
        body: JSON.stringify(payload),
      });
      return res.data;
    } catch {
      return ipoStore.addGMPSnapshot(payload, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminAddSubscription(payload: any, admin: AdminUser): Promise<any> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: any }>('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'x-admin-id': admin.id, 'x-admin-name': admin.full_name },
        body: JSON.stringify(payload),
      });
      return res.data;
    } catch {
      return ipoStore.addSubscriptionSnapshot(payload, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminRecordListing(payload: any, admin: AdminUser): Promise<any> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: any }>('/api/admin/listing-results', {
        method: 'POST',
        headers: { 'x-admin-id': admin.id, 'x-admin-name': admin.full_name },
        body: JSON.stringify(payload),
      });
      return res.data;
    } catch {
      return ipoStore.recordListingResult(payload, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminImportCSV(csvText: string, admin: AdminUser, dryRun: boolean = false): Promise<any> {
    try {
      const res = await this.fetchJson<any>('/api/admin/imports', {
        method: 'POST',
        headers: { 'x-admin-id': admin.id, 'x-admin-name': admin.full_name },
        body: JSON.stringify({ csvText, dryRun }),
      });
      return res;
    } catch {
      return ipoStore.importFromCSV(csvText, { id: admin.id, name: admin.full_name }, { dryRun });
    }
  }

  public async adminSyncFeed(sourceId: string, admin: AdminUser): Promise<FeedRun> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: FeedRun }>(`/api/admin/feeds/${sourceId}/sync`, {
        method: 'POST',
        headers: { 'x-admin-id': admin.id, 'x-admin-name': admin.full_name },
      });
      return res.data;
    } catch {
      return ipoStore.syncProvider(sourceId, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminGetFeeds(): Promise<{ sources: IPOSource[]; runs: FeedRun[] }> {
    try {
      const res = await this.fetchJson<{ success: boolean; sources: IPOSource[]; runs: FeedRun[] }>('/api/admin/feeds');
      return { sources: res.sources, runs: res.runs };
    } catch {
      return { sources: ipoStore.getSources(), runs: ipoStore.getFeedRuns() };
    }
  }

  public async adminGetAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: AuditLog[] }>('/api/admin/audit');
      return res.data;
    } catch {
      return ipoStore.getAuditLogs();
    }
  }

  public async adminGetUsers(): Promise<AdminUser[]> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: AdminUser[] }>('/api/admin/users');
      return res.data;
    } catch {
      return ipoStore.getAdminUsers();
    }
  }
}

export const api = new ApiClient();
