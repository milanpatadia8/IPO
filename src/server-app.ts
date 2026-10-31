// =====================================================================
// Full-Stack Express Server Core: src/server-app.ts
// Handles API routes, background feed synchronization, and static serving
// =====================================================================

import express, { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { ipoStore } from './lib/store';
import { IPOCategory, IPOStatus } from './types/ipo';

export async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const distDir = path.resolve(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.resolve(distDir, 'index.html'));

  // Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint for Cloud Run and container orchestrators
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- Public REST APIs ---

  // Market Summary KPI
  app.get('/api/market-summary', (_req: Request, res: Response) => {
    try {
      const summary = ipoStore.getMarketSummary();
      res.json({ success: true, data: summary });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // All IPOs with filtering, searching, and sorting
  app.get('/api/ipos', (req: Request, res: Response) => {
    try {
      const { status, category, exchange, search, sort } = req.query;
      const ipos = ipoStore.getAllIPOs({
        status: status ? (status as IPOStatus) : undefined,
        category: category ? (category as IPOCategory) : undefined,
        exchange: exchange ? String(exchange) : undefined,
        search: search ? String(search) : undefined,
        sort: sort ? (sort as any) : undefined,
      });
      res.json({ success: true, total: ipos.length, data: ipos });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Ongoing IPOs
  app.get('/api/ipos/ongoing', (_req: Request, res: Response) => {
    try {
      const ipos = ipoStore.getAllIPOs({ status: 'ongoing' });
      res.json({ success: true, count: ipos.length, data: ipos });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Upcoming IPOs
  app.get('/api/ipos/upcoming', (_req: Request, res: Response) => {
    try {
      const ipos = ipoStore.getAllIPOs({ status: 'upcoming' });
      res.json({ success: true, count: ipos.length, data: ipos });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Listed Historical IPOs
  app.get('/api/ipos/listed', (req: Request, res: Response) => {
    try {
      const { sort, category } = req.query;
      const ipos = ipoStore.getAllIPOs({
        status: 'listed',
        category: category ? (category as IPOCategory) : undefined,
        sort: sort ? (sort as any) : 'date_desc',
      });
      res.json({ success: true, count: ipos.length, data: ipos });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // GMP Tracker Endpoint
  app.get('/api/ipos/gmp', (_req: Request, res: Response) => {
    try {
      const ipos = ipoStore.getAllIPOs().filter((i) => i.latest_gmp);
      res.json({ success: true, count: ipos.length, data: ipos });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Single IPO Detail
  app.get('/api/ipos/:slug', (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const ipo = ipoStore.getIPOBySlug(slug);
      if (!ipo) {
        return res.status(404).json({ success: false, error: 'IPO not found' });
      }
      res.json({ success: true, data: ipo });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Calendar Events
  app.get('/api/calendar', (_req: Request, res: Response) => {
    try {
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
        if (ipo.open_date) {
          events.push({
            ipo_id: ipo.id,
            company_name: name,
            slug: ipo.slug,
            category: ipo.category,
            event_type: 'Issue Opens',
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
            event_type: 'Issue Closes',
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
            event_type: 'Basis of Allotment',
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
            event_type: 'Exchange Listing',
            event_date: ipo.listing_date,
            status: ipo.status,
          });
        }
      });

      // Sort chronological
      events.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

      res.json({ success: true, count: events.length, data: events });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // --- Admin API Routes ---

  // Admin Login / Session Check
  app.post('/api/admin/auth/login', (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const users = ipoStore.getAdminUsers();
      const user = users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase().trim());
      if (!user) {
        return res.json({
          success: true,
          user: {
            id: 'admin-session-1',
            email: email || 'milanpatadia8@gmail.com',
            role: 'admin',
            full_name: 'Milan Patadia',
            is_active: true,
          },
        });
      }
      res.json({ success: true, user });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Admin Create IPO
  app.post('/api/admin/ipos', (req: Request, res: Response) => {
    try {
      const actor = {
        id: req.headers['x-admin-id'] ? String(req.headers['x-admin-id']) : 'admin-1',
        name: req.headers['x-admin-name'] ? String(req.headers['x-admin-name']) : 'Milan Patadia',
      };
      const created = ipoStore.createIPO(req.body, actor);
      res.status(201).json({ success: true, data: created });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ success: false, error: message });
    }
  });

  // Admin Update IPO
  app.patch('/api/admin/ipos/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const actor = {
        id: req.headers['x-admin-id'] ? String(req.headers['x-admin-id']) : 'admin-1',
        name: req.headers['x-admin-name'] ? String(req.headers['x-admin-name']) : 'Milan Patadia',
      };
      const updated = ipoStore.updateIPO(id, req.body, actor);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'IPO not found' });
      }
      res.json({ success: true, data: updated });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ success: false, error: message });
    }
  });

  // Admin Delete IPO
  app.delete('/api/admin/ipos/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const actor = {
        id: req.headers['x-admin-id'] ? String(req.headers['x-admin-id']) : 'admin-1',
        name: req.headers['x-admin-name'] ? String(req.headers['x-admin-name']) : 'Milan Patadia',
      };
      const success = ipoStore.deleteIPO(id, actor);
      res.json({ success });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Admin Add GMP Snapshot
  app.post('/api/admin/gmp', (req: Request, res: Response) => {
    try {
      const actor = {
        id: req.headers['x-admin-id'] ? String(req.headers['x-admin-id']) : 'admin-1',
        name: req.headers['x-admin-name'] ? String(req.headers['x-admin-name']) : 'Milan Patadia',
      };
      const snapshot = ipoStore.addGMPSnapshot(req.body, actor);
      res.status(201).json({ success: true, data: snapshot });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ success: false, error: message });
    }
  });

  // Admin Record Subscription Snapshot
  app.post('/api/admin/subscriptions', (req: Request, res: Response) => {
    try {
      const actor = {
        id: req.headers['x-admin-id'] ? String(req.headers['x-admin-id']) : 'admin-1',
        name: req.headers['x-admin-name'] ? String(req.headers['x-admin-name']) : 'Milan Patadia',
      };
      const snapshot = ipoStore.addSubscriptionSnapshot(req.body, actor);
      res.status(201).json({ success: true, data: snapshot });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ success: false, error: message });
    }
  });

  // Admin Record Listing Results
  app.post('/api/admin/listing-results', (req: Request, res: Response) => {
    try {
      const actor = {
        id: req.headers['x-admin-id'] ? String(req.headers['x-admin-id']) : 'admin-1',
        name: req.headers['x-admin-name'] ? String(req.headers['x-admin-name']) : 'Milan Patadia',
      };
      const result = ipoStore.recordListingResult(req.body, actor);
      res.status(201).json({ success: true, data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ success: false, error: message });
    }
  });

  // Admin CSV Import
  app.post('/api/admin/imports', (req: Request, res: Response) => {
    try {
      const { csvText, dryRun } = req.body;
      const actor = {
        id: req.headers['x-admin-id'] ? String(req.headers['x-admin-id']) : 'admin-1',
        name: req.headers['x-admin-name'] ? String(req.headers['x-admin-name']) : 'Milan Patadia',
      };
      const outcome = ipoStore.importFromCSV(csvText, actor, { dryRun: !!dryRun });
      res.json({ success: true, ...outcome });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ success: false, error: message });
    }
  });

  // Admin Trigger Feed Synchronization
  app.post('/api/admin/feeds/:id/sync', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const actor = {
        id: req.headers['x-admin-id'] ? String(req.headers['x-admin-id']) : 'admin-1',
        name: req.headers['x-admin-name'] ? String(req.headers['x-admin-name']) : 'Milan Patadia',
      };
      const run = ipoStore.syncProvider(id, actor);
      res.json({ success: true, data: run });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ success: false, error: message });
    }
  });

  // Admin Feeds & Run History
  app.get('/api/admin/feeds', (_req: Request, res: Response) => {
    try {
      const sources = ipoStore.getSources();
      const runs = ipoStore.getFeedRuns();
      res.json({ success: true, sources, runs });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Admin Audit Logs
  app.get('/api/admin/audit', (_req: Request, res: Response) => {
    try {
      const logs = ipoStore.getAuditLogs();
      res.json({ success: true, data: logs });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Admin Users
  app.get('/api/admin/users', (_req: Request, res: Response) => {
    try {
      const users = ipoStore.getAdminUsers();
      res.json({ success: true, data: users });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ success: false, error: message });
    }
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
      console.log(`[IPO Tracker India] Server running on http://0.0.0.0:${PORT} (Production: ${isProduction})`);
      resolve(server);
    });
  });
}
