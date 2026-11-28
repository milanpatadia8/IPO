// =====================================================================
// Full-Stack Express Server Core: src/server-app.ts
// Serves unified auth (Email/Mobile + Password and Google), public IPO
// catalog, authenticated End-User IPO applications, and Admin-only CRUD.
// =====================================================================

import 'dotenv/config';
import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { ipoStore } from './lib/store';
import {
  AuthenticatedRequest,
  isAdminAccountClaimed,
  isEnvAdminPasswordConfigured,
  signupWithPassword,
  loginWithPassword,
  loginWithGoogleIdToken,
  revokeSessionJti,
  toPublicUserDTO,
  listAllServerUsers,
  setServerUserRole,
  updateServerUserProfile,
  listAuthorizedAdminEmails,
  authorizeAdminEmail,
  revokeAdminEmail,
  requireAuth,
  requireAdmin,
  requireAdminFlexible,
} from './server-auth';
import { fetchFromIpoAlerts, getIpoAlertsQuotaStatus } from './server-ipoalerts';
import type { IPOCategory, IPOStatus, InvestorLotCategory } from './types/ipo';

interface ServerIPOApplication {
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

const applicationsStore: ServerIPOApplication[] = [];
const serverSettings = {
  gmpStalenessHours: 24,
  subStalenessHours: 12,
  seeded: true,
};

const ALLOWED_INVESTOR_CATEGORIES = new Set<InvestorLotCategory>([
  'Retail',
  'Employee',
  'Shareholder',
  'sHNI',
  'bHNI',
  'QIB',
]);

export async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = isProduction ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 8080) : 3000;
  const distDir = path.resolve(process.cwd(), 'dist');

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // -----------------------------------------------------------------
  // Unified Authentication Routes (/api/auth/*)
  // -----------------------------------------------------------------
  app.get('/api/auth/status', (_req: Request, res: Response) => {
    res.json({
      success: true,
      adminClaimed: isAdminAccountClaimed(),
      adminEnvConfigured: isEnvAdminPasswordConfigured(),
    });
  });

  app.post('/api/auth/signup', (req: Request, res: Response) => {
    try {
      const { name, identifier, password } = req.body || {};
      const result = signupWithPassword({ name, identifier, password });
      res.status(201).json({
        success: true,
        token: result.token,
        user: toPublicUserDTO(result.user),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create account.';
      const statusCode = message.includes('already exists') || message.includes('already configured') ? 409 : 400;
      res.status(statusCode).json({ success: false, error: message });
    }
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body || {};
      const result = loginWithPassword({ identifier, password });
      res.json({
        success: true,
        token: result.token,
        user: toPublicUserDTO(result.user),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid login credentials.';
      res.status(401).json({ success: false, error: message });
    }
  });

  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body || {};
      const result = await loginWithGoogleIdToken(idToken);
      res.json({
        success: true,
        token: result.token,
        user: toPublicUserDTO(result.user),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google authentication failed.';
      res.status(401).json({ success: false, error: message });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      user: toPublicUserDTO(req.authUser!),
    });
  });

  app.put('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { displayName, phone, photoURL } = req.body || {};
      const updated = updateServerUserProfile(req.authUser!.id, {
        displayName,
        phone,
        photoURL,
      });
      res.json({
        success: true,
        user: toPublicUserDTO(updated),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update profile.';
      res.status(400).json({ success: false, error: message });
    }
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    if (req.authJti) {
      revokeSessionJti(req.authJti);
    }
    res.json({ success: true });
  });

  // -----------------------------------------------------------------
  // Public IPO Catalog Routes (No Login Required)
  // -----------------------------------------------------------------
  app.get('/api/ipos', (req: Request, res: Response) => {
    const status = typeof req.query.status === 'string' ? (req.query.status as IPOStatus | 'all') : undefined;
    const category = typeof req.query.category === 'string' ? (req.query.category as IPOCategory | 'all') : undefined;
    const exchange = typeof req.query.exchange === 'string' ? req.query.exchange : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const sort = typeof req.query.sort === 'string' ? (req.query.sort as any) : undefined;

    const ipos = ipoStore.getAllIPOs({ status, category, exchange, search, sort });
    res.json({ success: true, data: ipos });
  });

  app.get('/api/ipos/:slug', (req: Request, res: Response) => {
    const slug = String(req.params.slug || '').trim();
    const ipo = ipoStore.getIPOBySlug(slug);
    if (!ipo) {
      res.status(404).json({ success: false, error: 'IPO not found.' });
      return;
    }
    res.json({ success: true, data: ipo });
  });

  app.get('/api/summary', (_req: Request, res: Response) => {
    res.json({ success: true, data: ipoStore.getMarketSummary() });
  });

  app.get('/api/calendar', (_req: Request, res: Response) => {
    const all = ipoStore.getAllIPOs();
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

    events.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
    res.json({ success: true, data: events });
  });

  // -----------------------------------------------------------------
  // Authenticated End-User IPO Applications (/api/applications/*)
  // -----------------------------------------------------------------
  app.get('/api/applications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const uid = req.authUser!.id;
    const ipoId = typeof req.query.ipoId === 'string' ? req.query.ipoId.trim() : '';
    const mine = applicationsStore
      .filter((a) => a.userId === uid && (!ipoId || a.ipoId === ipoId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({ success: true, data: mine });
  });

  app.post('/api/applications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const { ipoId, investorCategory, lots, upiId, pan } = req.body || {};
    const targetIpo = ipoStore.getIPOById(String(ipoId || ''));
    if (!targetIpo) {
      res.status(404).json({ success: false, error: 'Selected IPO not found.' });
      return;
    }

    const cat = String(investorCategory || 'Retail') as InvestorLotCategory;
    if (!ALLOWED_INVESTOR_CATEGORIES.has(cat)) {
      res.status(400).json({ success: false, error: 'Invalid investor category.' });
      return;
    }

    const cleanPan = String(pan || '').trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      res.status(400).json({ success: false, error: 'Please enter a valid 10-character PAN (e.g., ABCDE1234F).' });
      return;
    }

    const cleanUpi = String(upiId || '').trim();
    if (!/^[^\s@]+@[^\s@]+$/.test(cleanUpi) || cleanUpi.length > 120) {
      res.status(400).json({ success: false, error: 'Please enter a valid UPI ID (e.g., name@okaxis).' });
      return;
    }

    const categoryLimit = targetIpo.category_lot_limits?.[cat];
    const minLotsAllowed = categoryLimit?.min_lots ?? 1;
    const maxLotsAllowed = categoryLimit?.max_lots ?? 10000;
    const rawLots = Math.floor(Number(lots) || 0);
    if (rawLots < minLotsAllowed || rawLots > maxLotsAllowed) {
      res.status(400).json({
        success: false,
        error: categoryLimit?.max_lots
          ? `For ${cat}, please apply between ${minLotsAllowed} and ${maxLotsAllowed} lots.`
          : `For ${cat}, minimum application is ${minLotsAllowed} lot${minLotsAllowed > 1 ? 's' : ''}.`,
      });
      return;
    }

    const lotCount = rawLots;
    const lotSize = Math.max(1, Math.floor(Number(targetIpo.lot_size) || 1));
    const bidPrice = Number(targetIpo.price_band_max || targetIpo.issue_price || 1);
    const shares = lotCount * lotSize;
    const totalAmount = Number((shares * bidPrice).toFixed(2));

    const record: ServerIPOApplication = {
      id: `app-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      userId: user.id,
      userEmail: user.displayContact,
      userName: user.displayName,
      ipoId: targetIpo.id,
      ipoSlug: targetIpo.slug,
      companyName: targetIpo.company?.name || targetIpo.slug,
      category: targetIpo.category,
      investorCategory: cat,
      lots: lotCount,
      shares,
      bidPrice,
      totalAmount,
      upiId: cleanUpi,
      pan: cleanPan,
      status: 'submitted',
      created_at: new Date().toISOString(),
    };

    applicationsStore.unshift(record);
    res.status(201).json({ success: true, data: record });
  });

  app.patch('/api/applications/:id/cancel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const appId = String(req.params.id || '');
    const record = applicationsStore.find((a) => a.id === appId);
    if (!record) {
      res.status(404).json({ success: false, error: 'Application not found.' });
      return;
    }
    if (record.userId !== user.id && user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'You are not allowed to modify this application.' });
      return;
    }
    record.status = 'cancelled';
    res.json({ success: true, data: record });
  });

  // -----------------------------------------------------------------
  // Protected Admin Backend Routes (/api/admin/* — Strictly requireAdmin)
  // -----------------------------------------------------------------
  app.post('/api/admin/ipos', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
      const created = ipoStore.createIPO(req.body || {}, actor);
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      res.status(400).json({ success: false, error: err instanceof Error ? err.message : 'Failed to create IPO.' });
    }
  });

  app.put('/api/admin/ipos/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
      const updated = ipoStore.updateIPO(String(req.params.id || ''), req.body || {}, actor);
      if (!updated) {
        res.status(404).json({ success: false, error: 'IPO not found.' });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err instanceof Error ? err.message : 'Failed to update IPO.' });
    }
  });

  app.delete('/api/admin/ipos/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
    const deleted = ipoStore.deleteIPO(String(req.params.id || ''), actor);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'IPO not found.' });
      return;
    }
    res.json({ success: true });
  });

  app.post('/api/admin/gmp', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
      const snapshot = ipoStore.addGMPSnapshot(req.body || {}, actor);
      res.status(201).json({ success: true, data: snapshot });
    } catch (err) {
      res.status(400).json({ success: false, error: err instanceof Error ? err.message : 'Failed to add unlisted price observation.' });
    }
  });

  app.delete('/api/admin/gmp/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
    const deleted = ipoStore.deleteGMPSnapshot(String(req.params.id || ''), actor);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Unlisted price observation not found.' });
      return;
    }
    res.json({ success: true });
  });

  app.post('/api/admin/subscriptions', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
      const snapshot = ipoStore.addSubscriptionSnapshot(req.body || {}, actor);
      res.status(201).json({ success: true, data: snapshot });
    } catch (err) {
      res.status(400).json({ success: false, error: err instanceof Error ? err.message : 'Failed to add subscription.' });
    }
  });

  app.post('/api/admin/listings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
      const result = ipoStore.recordListingResult(req.body || {}, actor);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err instanceof Error ? err.message : 'Failed to record listing.' });
    }
  });

  app.post('/api/admin/import-csv', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
    const { csvText, dryRun } = req.body || {};
    const result = ipoStore.importFromCSV(String(csvText || ''), actor, { dryRun: Boolean(dryRun) });
    res.json({ success: true, data: result });
  });

  app.post('/api/admin/feeds/sync', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
    const { sourceId } = req.body || {};
    const run = ipoStore.syncProvider(String(sourceId || ''), actor);
    res.json({ success: true, data: run });
  });

  app.get('/api/admin/feeds', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        sources: ipoStore.getSources(),
        runs: ipoStore.getFeedRuns(),
      },
    });
  });

  // -----------------------------------------------------------------
  // ipoalerts.in Server-Side Proxy (Free-Plan Optimized, Admin-Only)
  // Reads IPOALERTS_API_KEY exclusively from server process.env
  // -----------------------------------------------------------------
  app.get(
    '/api/admin/ipoalerts/status',
    requireAdminFlexible,
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({
        success: true,
        data: getIpoAlertsQuotaStatus(),
      });
    }
  );

  app.post(
    '/api/admin/ipoalerts/fetch',
    requireAdminFlexible,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { status, type, page, limit, identifier, bypassCache, source, search, exchange } =
          req.body || {};
        const result = await fetchFromIpoAlerts({
          status,
          type,
          page,
          limit,
          identifier,
          bypassCache,
          source,
          search,
          exchange,
        });
        res.json({ success: true, data: result });
      } catch (err) {
        const statusCode =
          typeof (err as { statusCode?: unknown })?.statusCode === 'number'
            ? (err as { statusCode: number }).statusCode
            : 500;
        const message =
          err instanceof Error ? err.message : 'Unable to fetch IPO data from ipoalerts.in.';
        res.status(statusCode).json({
          success: false,
          error: message,
          quota: getIpoAlertsQuotaStatus(),
        });
      }
    }
  );

  app.get('/api/admin/audit', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: ipoStore.getAuditLogs() });
  });

  app.get('/api/admin/users', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    const users = listAllServerUsers().map((u) => ({
      id: u.id,
      email: u.displayContact,
      role: u.role,
      full_name: u.displayName,
      is_active: u.isActive,
      created_at: u.createdAt,
    }));
    res.json({ success: true, data: users });
  });

  app.patch('/api/admin/users/:uid/role', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetUid = String(req.params.uid || '');
      const role = req.body?.role === 'admin' ? 'admin' : 'user';
      const updated = setServerUserRole(targetUid, role, req.authUser!);
      res.json({ success: true, data: toPublicUserDTO(updated) });
    } catch (err) {
      res.status(400).json({ success: false, error: err instanceof Error ? err.message : 'Unable to update role.' });
    }
  });

  // Authorized Admin Emails (Pre-authorize or revoke Admin role by Email ID)
  app.get('/api/admin/authorized-admins', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: listAuthorizedAdminEmails() });
  });

  app.post('/api/admin/authorized-admins', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = authorizeAdminEmail(req.body?.email, req.authUser!);
      res.status(201).json({ success: true, data: entry });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err instanceof Error ? err.message : 'Unable to authorize admin email.',
      });
    }
  });

  app.delete('/api/admin/authorized-admins/:email', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const email = decodeURIComponent(String(req.params.email || ''));
      revokeAdminEmail(email, req.authUser!);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err instanceof Error ? err.message : 'Unable to revoke admin email.',
      });
    }
  });

  // Client Data & Fees Paid Backend Routes
  app.get('/api/admin/clients', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: ipoStore.getAllClients() });
  });

  app.post('/api/admin/clients', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
      const created = ipoStore.createClient(req.body || {}, actor);
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create client record.',
      });
    }
  });

  app.put('/api/admin/clients/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
      const updated = ipoStore.updateClient(String(req.params.id || ''), req.body || {}, actor);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Client record not found.' });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update client record.',
      });
    }
  });

  app.delete('/api/admin/clients/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
    const deleted = ipoStore.deleteClient(String(req.params.id || ''), actor);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Client record not found.' });
      return;
    }
    res.json({ success: true });
  });

  app.post('/api/admin/clients/:id/payments', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
      const updated = ipoStore.addClientPayment(String(req.params.id || ''), req.body || {}, actor);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Client record not found.' });
        return;
      }
      res.status(201).json({ success: true, data: updated });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to record payment.',
      });
    }
  });

  app.delete(
    '/api/admin/clients/:id/payments/:paymentId',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const actor = { id: req.authUser!.id, name: req.authUser!.displayName };
      const updated = ipoStore.deleteClientPayment(
        String(req.params.id || ''),
        String(req.params.paymentId || ''),
        actor
      );
      if (!updated) {
        res.status(404).json({ success: false, error: 'Client or payment record not found.' });
        return;
      }
      res.json({ success: true, data: updated });
    }
  );

  app.get('/api/admin/applications', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    const sorted = [...applicationsStore].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    res.json({ success: true, data: sorted });
  });

  app.get('/api/admin/settings', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: serverSettings });
  });

  app.put('/api/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const gmp = Math.min(168, Math.max(1, Number(req.body?.gmpStalenessHours) || 24));
    const sub = Math.min(168, Math.max(1, Number(req.body?.subStalenessHours) || 12));
    serverSettings.gmpStalenessHours = gmp;
    serverSettings.subStalenessHours = sub;
    res.json({ success: true, data: serverSettings });
  });

  // --- Vite Dev Middleware or Static Production Serving ---
  if (isProduction) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return new Promise((resolve) => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[IPO Insiders] Server running on http://0.0.0.0:${PORT} (Production: ${isProduction})`);
      resolve(server);
    });
  });
}
