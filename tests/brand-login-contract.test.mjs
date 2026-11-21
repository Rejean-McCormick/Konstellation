import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('session endpoints set an HttpOnly cookie and do not leak token into response JSON', () => {
  const server = source('server/index.mjs');
  assert.match(server, /issueSessionCookie\(credentials\.token, config\)/);
  assert.match(server, /res\.setHeader\('Set-Cookie', session\.header\)/);
  assert.match(server, /expireSessionCookie\(config\)/);
  assert.doesNotMatch(server, /send\(\{[^}]*token: credentials\.token/);
});

test('login no longer writes the bearer token to browser sessionStorage', () => {
  const ui = source('src/components/Explorer.svelte');
  assert.match(ui, /on:submit\|preventDefault=\{signIn\}/);
  assert.match(ui, /fetch\('\/api\/session'/);
  assert.doesNotMatch(ui, /sessionStorage\.setItem\('konstellation\.auth\.token'/);
});

test('user-provided logo remains in the supplied #1e6864 hue', () => {
  const svg = source('public/brand-logo.svg');
  assert.match(svg, /viewBox="0 0 209 92"/);
  assert.match(svg, /fill="#1e6864"/);
  const css = source('src/styles/global.css');
  assert.match(css, /--green: #1e6864/);
});
