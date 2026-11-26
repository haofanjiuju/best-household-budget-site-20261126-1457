// Hearth & Ledger — a tiny static server for local testing only.
//
// Serves the site's app/ folder so it can be opened in a desktop browser and
// at a phone's size, with no build step and no network beyond this machine:
//
//   node serve.ts            serves app/ on http://localhost:8080
//   node serve.ts --port 9000   serves it on http://localhost:9000
//
// Only files under app/ are ever sent, and only with the MIME types a browser
// needs for HTML, CSS, JavaScript, JSON and images. Anything else gets a 404.
// This is a development convenience, not a server for the internet.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
]);

function pickPort() {
  const flag = process.argv.indexOf('--port');
  const wanted = flag === -1 ? 8080 : Number(process.argv[flag + 1]);
  return Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;
}

function resolveInside(requestPath) {
  let pathname = requestPath;
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(appRoot, normalize(pathname)));
  if (file !== appRoot && !file.startsWith(appRoot + sep)) return null;
  return file;
}

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  const file = resolveInside(pathname);
  let size;
  try {
    if (!file) throw new Error('outside app/');
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(file === null ? 403 : 404).end(file === null ? 'forbidden' : 'not found');
    return;
  }
  response.writeHead(200, {
    'content-type': mimeTypes.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});

const port = pickPort();
server.listen(port, '127.0.0.1', () => {
  console.log(`Hearth & Ledger is on http://localhost:${port}`);
});
