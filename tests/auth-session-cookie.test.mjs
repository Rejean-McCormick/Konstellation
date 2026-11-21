import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../server/config.mjs';
import { authenticate, issueSessionCookie, expireSessionCookie } from '../server/auth.mjs';

const TOKEN = 'a'.repeat(64);
const baseEnv = { KONSTELLATION_DEPLOYMENT_PROFILE: 'shared', KONSTELLATION_AUTH_TOKEN: TOKEN,
  KONSTELLATION_AUTH_SCOPES: 'read', KONSTELLATION_ROLES: 'public' };
const config = loadConfig(baseEnv);
const noAuth = (cookie = '') => ({ headers: { cookie } });

test('session cookie carries no bearer token, is HttpOnly Secure Strict and restores read principal', () => {
  const session = issueSessionCookie(TOKEN, config);
  assert.match(session.header, /; HttpOnly; SameSite=Strict; Max-Age=1209600; Secure$/);
  assert.doesNotMatch(session.header, /a{32}/);
  const cookie = session.header.split(';')[0];
  assert.equal(authenticate(noAuth(cookie), config).id, 'legacy-token');
  assert.deepEqual(authenticate(noAuth(cookie), config).scopes, ['read']);
});

test('session refuses tampered or expired receipts and any rotated auth token', () => {
  const cookie = issueSessionCookie(TOKEN, config).header.split(';')[0];
  const tampered = cookie.replace(/.$/, (c) => c === 'A' ? 'B' : 'A');
  assert.throws(() => authenticate(noAuth(tampered), config), { code: 'ACCESS_DENIED' });
  const parts = cookie.split('.');
  const expired = cookie.replace(parts[1], '1000000000');
  assert.throws(() => authenticate(noAuth(expired), config), { code: 'ACCESS_DENIED' });
  const rotated = loadConfig({ ...baseEnv, KONSTELLATION_AUTH_TOKEN: 'b'.repeat(64) });
  assert.throws(() => authenticate(noAuth(cookie), rotated), { code: 'ACCESS_DENIED' });
  assert.match(expireSessionCookie(config), /Max-Age=0; Secure$/);
});

test('explicit bearer overrides cookie, and wrong bearer cannot fall through to valid cookie', () => {
  const cookie = issueSessionCookie(TOKEN, config).header.split(';')[0];
  assert.throws(() => authenticate({ headers: { authorization: 'Bearer wrong', cookie } }, config), { code: 'ACCESS_DENIED' });
  assert.equal(authenticate({ headers: { authorization: `Bearer ${TOKEN}`, cookie } }, config).id, 'legacy-token');
  assert.throws(() => issueSessionCookie('wrong', config), { code: 'ACCESS_DENIED' });
});

test('login receipt also works with multiple principals and stays scoped to the token', () => {
  const two = loadConfig({ KONSTELLATION_DEPLOYMENT_PROFILE: 'shared',
    KONSTELLATION_AUTH_TOKENS: JSON.stringify({
      ['x'.repeat(32)]: { id: 'alice', roles: ['reader'], scopes: ['read'] },
      ['y'.repeat(32)]: { id: 'bob', roles: ['analyst'], scopes: ['read','metrics'] },
    }) });
  const cookie = issueSessionCookie('y'.repeat(32), two).header.split(';')[0];
  assert.equal(authenticate(noAuth(cookie), two).id, 'bob');
  assert.throws(() => authenticate(noAuth(cookie), loadConfig({
    KONSTELLATION_DEPLOYMENT_PROFILE:'shared',
    KONSTELLATION_AUTH_TOKENS: JSON.stringify({ ['x'.repeat(32)]: { id: 'alice' } }),
  })), { code: 'ACCESS_DENIED' });
});
