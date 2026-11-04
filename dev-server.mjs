// Servidor local sin dependencias: sirve /public y ejecuta las funciones de /api.
// Uso:  npm run dev
// Probar la cápsula ya abierta (PowerShell):  $env:UNLOCK_AT="2020-01-01T00:00:00Z"; npm run dev

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = resolve(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    const api = url.pathname.match(/^\/api\/([a-z0-9-]+)\/?$/i);
    if (api) {
      const file = join(ROOT, 'api', `${api[1]}.js`);
      await stat(file);
      const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
      return await mod.default(req, res);
    }

    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(PUBLIC, `.${path}`);
    if (!file.startsWith(PUBLIC + sep)) {
      res.writeHead(403).end('403');
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
    } else {
      console.error(err);
      if (!res.headersSent) res.writeHead(500);
      res.end('500');
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n  Cápsula lista en http://localhost:${PORT}`);
  if (process.env.UNLOCK_AT) console.log(`  UNLOCK_AT = ${process.env.UNLOCK_AT}`);
  console.log('  Ctrl+C para detener\n');
});
