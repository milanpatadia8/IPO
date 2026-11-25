// =====================================================================
// Frontend API Client: src/lib/api.ts
// Handles API calls to Express backend with graceful fallback to local store
// =====================================================================

import { ipoStore } from './store';
import { IPO, MarketSummary, FeedRun, AuditLog, AdminUser, IPOSource, IPOCategory, IPOStatus } from '../types/ipo';

class ServerHttpError extends Error {
  public status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

class ApiClient {
  private buildAdminHeaders(admin: AdminUser): Record<string, string> {
    return {
      'x-admin-id': encodeURIComponent(admin.id || 'admin-1'),
      'x-admin-name': encodeURIComponent(admin.full_name || 'Admin'),
    };
  }

  private async fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      let errMsg = `HTTP Error ${res.status}: ${res.statusText}`;
      try {
        const errBody = await res.json();
        if (errBody?.error) errMsg = errBody.error;
      } catch {
        // ignore JSON parse failure on non-JSON error body
      }
      throw new ServerHttpError(res.status, errMsg);
    }
    return await res.json();
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
        headers: this.buildAdminHeaders(admin),
        body: JSON.stringify(payload),
      });
      return res.data;
    } catch (err) {
      if (err instanceof ServerHttpError) throw err;
      return ipoStore.createIPO(payload, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminUpdateIPO(id: string, payload: any, admin: AdminUser): Promise<IPO | undefined> {
    const headers = this.buildAdminHeaders(admin);
    try {
      const res = await this.fetchJson<{ success: boolean; data: IPO }>(`/api/admin/ipos/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
      return res.data;
    } catch (err) {
      if (err instanceof ServerHttpError && err.status === 405) {
        const res = await this.fetchJson<{ success: boolean; data: IPO }>(`/api/admin/ipos/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        return res.data;
      }
      if (err instanceof ServerHttpError) throw err;
      return ipoStore.updateIPO(id, payload, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminDeleteIPO(id: string, admin: AdminUser): Promise<boolean> {
    const headers = this.buildAdminHeaders(admin);
    try {
      const res = await this.fetchJson<{ success: boolean }>(`/api/admin/ipos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });
      return res.success;
    } catch (err) {
      if (err instanceof ServerHttpError && err.status === 405) {
        const res = await this.fetchJson<{ success: boolean }>(`/api/admin/ipos/${encodeURIComponent(id)}/delete`, {
          method: 'POST',
          headers,
        });
        return res.success;
      }
      if (err instanceof ServerHttpError) throw err;
      return ipoStore.deleteIPO(id, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminAddGMP(payload: any, admin: AdminUser): Promise<any> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: any }>('/api/admin/gmp', {
        method: 'POST',
        headers: this.buildAdminHeaders(admin),
        body: JSON.stringify(payload),
      });
      return res.data;
    } catch (err) {
      if (err instanceof ServerHttpError) throw err;
      return ipoStore.addGMPSnapshot(payload, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminAddSubscription(payload: any, admin: AdminUser): Promise<any> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: any }>('/api/admin/subscriptions', {
        method: 'POST',
        headers: this.buildAdminHeaders(admin),
        body: JSON.stringify(payload),
      });
      return res.data;
    } catch (err) {
      if (err instanceof ServerHttpError) throw err;
      return ipoStore.addSubscriptionSnapshot(payload, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminRecordListing(payload: any, admin: AdminUser): Promise<any> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: any }>('/api/admin/listing-results', {
        method: 'POST',
        headers: this.buildAdminHeaders(admin),
        body: JSON.stringify(payload),
      });
      return res.data;
    } catch (err) {
      if (err instanceof ServerHttpError) throw err;
      return ipoStore.recordListingResult(payload, { id: admin.id, name: admin.full_name });
    }
  }

  public async adminImportCSV(csvText: string, admin: AdminUser, dryRun: boolean = false): Promise<any> {
    try {
      const res = await this.fetchJson<any>('/api/admin/imports', {
        method: 'POST',
        headers: this.buildAdminHeaders(admin),
        body: JSON.stringify({ csvText, dryRun }),
      });
      return res;
    } catch (err) {
      if (err instanceof ServerHttpError) throw err;
      return ipoStore.importFromCSV(csvText, { id: admin.id, name: admin.full_name }, { dryRun });
    }
  }

  public async adminSyncFeed(sourceId: string, admin: AdminUser): Promise<FeedRun> {
    try {
      const res = await this.fetchJson<{ success: boolean; data: FeedRun }>(`/api/admin/feeds/${encodeURIComponent(sourceId)}/sync`, {
        method: 'POST',
        headers: this.buildAdminHeaders(admin),
      });
      return res.data;
    } catch (err) {
      if (err instanceof ServerHttpError) throw err;
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
