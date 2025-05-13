import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, '../frontend');

export function log(message) {
  console.log(`[server] ${message}`);
}

export async function setupVite(app, server) {
  const vite = await createServer({
    root: clientDir,
    logLevel: 'info',
    server: {
      middlewareMode: true,
      hmr: {
        server
      }
    },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Always read the index.html
      let template = fs.readFileSync(
        resolve(clientDir, 'index.html'),
        'utf-8'
      );

      // Apply Vite HTML transforms
      template = await vite.transformIndexHtml(url, template);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}

export function serveStatic(app) {
  const distDir = resolve(clientDir, 'dist');
  
  // Serve static assets
  app.use(express.static(distDir, {
    index: false
  }));

  // Serve index.html for all other routes
  app.get('*', (req, res) => {
    res.sendFile(resolve(distDir, 'index.html'));
  });
} 