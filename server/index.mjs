import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadIntegration } from './integrations/kristal.mjs';
import { SemantikAdapter } from './integrations/semantik.mjs';
import { Engine } from './engine.mjs';
import { loadPack, readJson } from './pack.mjs';
import { ROOT, AppError, fail, validate } from './contracts.mjs';
export function loadLenses(engine, dir) {
  if (!dir) {
    const enrichedDir = path.join(ROOT, 'lenses-enriched');
    const supportsTheophile = ['author', 'theme', 'position', 'editorial'].every((type) =>
      engine.pack.registry.entityTypes.includes(type),
    );
    dir =
      process.env.KONSTELLATION_LENSES ||
      (supportsTheophile && fs.existsSync(enrichedDir)
        ? enrichedDir
        : path.join(ROOT, 'examples/lenses'));
  }
  const lenses = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith('.json'))
    .sort()
    .map((n) => readJson(path.join(dir, n)));
  for (const lens of lenses) {
    validate('lens', lens);
    if (!engine.pack.registry.entityTypes.includes(lens.rootType))
      fail('INVALID_PACK', 'Lens root is unknown');
    const constellationRelations = (lens.constellation?.groups || [])
      .filter((g) => g.source.kind === 'relations')
      .flatMap((g) => g.source.ids);
    for (const id of [...lens.facets.map((f) => f.relation), ...lens.pivots, ...constellationRelations])
      if (!engine.relations.get(id)?.domain.includes(lens.rootType))
        fail('INVALID_PACK', 'Lens relation mismatch');
  }
  return lenses;
}
async function body(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) fail('PAYLOAD_TOO_LARGE', 'Requête limitée à 64 Kio.', 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    fail('INVALID_QUERY', 'JSON invalide.');
  }
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
export function createServer({
  engine = new Engine(loadPack(), {
    roles: (process.env.KONSTELLATION_ROLES || 'public').split(','),
    ...(process.env.KONSTELLATION_CURSOR_SECRET
      ? { secret: process.env.KONSTELLATION_CURSOR_SECRET }
      : {}),
  }),
  lenses,
  semantik = new SemantikAdapter(),
  dist = path.join(ROOT, 'dist'),
} = {}) {
  lenses ||= loadLenses(engine);
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    const send = (data, status = 200) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      const hostname = new URL('http://' + req.headers.host).hostname;
      const allowedHosts = (
        process.env.KONSTELLATION_ALLOWED_HOSTS || 'localhost,127.0.0.1,[::1]'
      ).split(',');
      if (!allowedHosts.includes(hostname)) fail('ACCESS_DENIED', 'Hôte non autorisé.', 403);
      if (url.pathname.startsWith('/api/')) {
        // Local single-user deployment. Cross-origin requests never gain a read surface.
        const origin = req.headers.origin;
        if (
          origin &&
          new URL(origin).host !== req.headers.host &&
          origin !== process.env.KONSTELLATION_DEV_ORIGIN
        )
          fail('ACCESS_DENIED', 'Origine non autorisée.', 403);
        if (req.headers['sec-fetch-site'] === 'cross-site')
          fail('ACCESS_DENIED', 'Requête intersite refusée.', 403);
        if (req.method === 'GET' && url.pathname === '/api/health')
          return send({ status: 'ok', version: '0.5.0' });
        if (req.method === 'GET' && ['/api/bootstrap', '/api/capabilities'].includes(url.pathname)) {
          const communication = await semantik.capabilities();
          const boot = engine.bootstrap(lenses);
          boot.capabilities.sa = communication.available;
          return send(url.pathname === '/api/bootstrap' ? {...boot, communication} : {...boot.capabilities, communication});
        }
        if (req.method !== 'POST') fail('NOT_FOUND', 'Endpoint introuvable.', 404);
        if (!req.headers['content-type']?.startsWith('application/json'))
          fail('INVALID_QUERY', 'Content-Type application/json requis.', 415);
        const b = await body(req);
        if (!b || typeof b !== 'object' || Array.isArray(b))
          fail('INVALID_QUERY', 'Objet JSON requis.');
        switch (url.pathname) {
          case '/api/query':
            return send(engine.query(b.query, b.cursor));
          case '/api/facets':
            return send(engine.facets(b.query, b.relations));
          case '/api/entity':
            return send(engine.entity(b.id, b.context));
          case '/api/constellation':
            return send(engine.constellation(b, lenses));
          case '/api/evidence':
            return send(engine.evidence(b.ids, b.context));
          case '/api/validate-state': {
            validate('exploration-state', b);
            engine.check(b.query);
            engine.scope(b.query.context);
            if (
              !lenses.some(
                (l) => l.id === b.lensRef && l.rootType === b.query.selection.entityType,
              ) &&
              b.lensRef !== 'type:' + b.query.selection.entityType
            )
              fail('INVALID_QUERY', 'Lens indisponible.');
            return send({ valid: true });
          }
          case '/api/sa/request':
            return send(semantik.request(engine, b));
          case '/api/sa':
            return send(await semantik.render(engine, b));
          default:
            fail('NOT_FOUND', 'Endpoint introuvable.', 404);
        }
      }
      if (!['GET', 'HEAD'].includes(req.method)) fail('NOT_FOUND', 'Introuvable.', 404);
      const pathname = decodeURIComponent(url.pathname);
      const file = path.resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(path.resolve(dist) + path.sep)) fail('NOT_FOUND', 'Introuvable.', 404);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile())
        fail('NOT_FOUND', 'Page introuvable. Exécutez npm run build.', 404);
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': pathname.startsWith('/_astro/')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const known = error instanceof AppError;
      send(
        {
          error: {
            code: known ? error.code : 'INTERNAL_ERROR',
            message: known ? error.message : 'Erreur interne.',
          },
        },
        known ? error.status : 500,
      );
      if (!known) console.error(error);
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 12000;
  return server;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const host = process.env.HOST || '127.0.0.1',
    port = Number(process.env.PORT || 4321);
  const pack = process.env.KONSTELLATION_BACKEND_CONFIG
    ? await loadIntegration(process.env.KONSTELLATION_BACKEND_CONFIG)
    : loadPack();
  const engine = new Engine(pack, {
    roles: (process.env.KONSTELLATION_ROLES || 'public').split(','),
    ...(process.env.KONSTELLATION_CURSOR_SECRET
      ? { secret: process.env.KONSTELLATION_CURSOR_SECRET }
      : {}),
  });
  const semantik = new SemantikAdapter(
    process.env.KONSTELLATION_SA_CONFIG ? readJson(process.env.KONSTELLATION_SA_CONFIG) : null,
  );
  createServer({ engine, semantik }).listen(port, host, () =>
    console.log(`Konstellation http://${host}:${port}`),
  );
}
