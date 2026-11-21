import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../server/index.mjs';
import { Engine } from '../server/engine.mjs';
import { loadPack } from '../server/pack.mjs';
import { ROOT } from '../server/contracts.mjs';
import { loadConfig } from '../server/config.mjs';

async function withServer(config, reader, fn) {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'konstellation-render-route-'));
  fs.mkdirSync(path.join(dist, 'v11'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>demo home</title>');
  fs.writeFileSync(path.join(dist, 'v11', 'index.html'), '<!doctype html><title>local v11</title>');
  const server = createServer({ engine: new Engine(loadPack(path.join(ROOT, 'data/demo.pack.json'))), config, dist, v11Reader: reader });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dist, { recursive: true, force: true });
  }
}

const demoReader = { principals: new Set(['local-user']), datasets: [] };
const shared = loadConfig({
  KONSTELLATION_DEPLOYMENT_PROFILE: 'shared',
  KONSTELLATION_ALLOWED_HOSTS: '127.0.0.1',
  KONSTELLATION_AUTH_TOKEN: 'test-token-for-render-routes-1234567890',
  KONSTELLATION_AUTH_SCOPES: 'read',
});

test('Render/shared keeps v11 local-only for every route spelling and exposes no nav capability', async () => {
  await withServer(shared, demoReader, async (base) => {
    for (const route of ['/v11', '/v11/', '/v11/index.html', '/v11//index.html', '/%76%31%31', '/%76%31%31/index.html']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 404, route);
      assert.match((await response.json()).error.message, /uniquement sur une instance locale/);
    }
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /demo home/);
    const denied = await fetch(base + '/api/bootstrap');
    assert.equal(denied.status, 401);
    const authorized = await fetch(base + '/api/bootstrap', {
      headers: { Authorization: 'Bearer test-token-for-render-routes-1234567890' },
    });
    assert.equal(authorized.status, 200);
    assert.equal((await authorized.json()).v11Available, false);
  });
});

test('explicitly configured local reader resolves both Astro v11 URL variants', async () => {
  await withServer(loadConfig({}), demoReader, async (base) => {
    for (const route of ['/v11', '/v11/', '/v11/index.html']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      assert.match(await response.text(), /local v11/);
    }
    const boot = await fetch(base + '/api/bootstrap');
    assert.equal(boot.status, 200);
    assert.equal((await boot.json()).v11Available, true);
  });
});

test('unconfigured local reader is never advertised or served', async () => {
  await withServer(loadConfig({}), null, async (base) => {
    assert.equal((await fetch(base + '/v11')).status, 404);
    const boot = await fetch(base + '/api/bootstrap');
    assert.equal((await boot.json()).v11Available, false);
  });
});


test('local-only reader refuses the page to principals absent from its allowlist', async () => {
  await withServer(loadConfig({}), { principals: new Set(['someone-else']), datasets: [] }, async (base) => {
    assert.equal((await fetch(base + '/v11')).status, 404);
    const boot = await fetch(base + '/api/bootstrap');
    assert.equal((await boot.json()).v11Available, false);
  });
});
