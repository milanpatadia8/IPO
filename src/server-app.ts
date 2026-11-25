// =====================================================================
// Full-Stack Express Server Core: src/server-app.ts
// Handles health checks and Vite dev / static production SPA serving.
// All authenticated IPO reads and Admin writes are enforced by
// Firebase Auth + Firestore Security Rules.
// =====================================================================

import express, { Request, Response } from 'express';
import path from 'node:path';

export async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = isProduction ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 8080) : 3000;
  const distDir = path.resolve(process.cwd(), 'dist');

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint for Cloud Run and container orchestrators
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Block legacy unauthenticated admin routes so all mutations strictly pass through Firebase Auth + Firestore Rules
  app.all('/api/admin/*', (_req: Request, res: Response) => {
    res.status(403).json({
      success: false,
      error: 'Direct unauthenticated admin routes are disabled. Authenticate via Firebase Auth.',
    });
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
