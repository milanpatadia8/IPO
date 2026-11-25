// =====================================================================
// Full-Stack Express Server Entrypoint: server.ts
// Compliant with AI Studio Build: "start": "node server.ts"
// Automatically routes to bundled production server or development server
// =====================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distServerPath = path.resolve(__dirname, 'dist', 'server.js');

async function main() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(distServerPath)) {
    // In production container, execute the standalone bundled server
    const imported = await import(pathToFileURL(distServerPath).href);
    if (typeof imported.startServer === 'function') {
      await imported.startServer();
    }
  } else {
    // In development mode, load from src/server-app with Vite dev middleware
    const { startServer } = await import('./src/server-app.ts');
    await startServer();
  }
}

main().catch((err) => {
  console.error('[IPO Tracker India] Server failed to start:', err);
  process.exit(1);
});
