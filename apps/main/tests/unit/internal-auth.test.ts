import { test, expect, vi } from 'vitest';
import Fastify from 'fastify';
import {
  registerInternalAuth,
  fingerprintKey,
  shouldProtectSwastikRoute,
  INTERNAL_API_HEADER,
} from '../../src/http/internal-auth.js';

test('fingerprintKey is (none) for absent keys, else an 8-char digest', () => {
  expect(fingerprintKey(undefined)).toBe('(none)');
  expect(fingerprintKey('secret')).toHaveLength(8);
});

test('shouldProtectSwastikRoute protects internal + register/status, exempts developer routes', () => {
  expect(shouldProtectSwastikRoute({ method: 'GET', url: '/internal/reload' })).toBe(true);
  expect(shouldProtectSwastikRoute({ method: 'POST', url: '/swastik/developers/register' })).toBe(
    true,
  );
  expect(shouldProtectSwastikRoute({ method: 'GET', url: '/swastik/status?x=1' })).toBe(true);
  expect(shouldProtectSwastikRoute({ method: 'GET', url: '/swastik/developers/me' })).toBe(false);
  expect(shouldProtectSwastikRoute({ method: 'POST', url: '/swastik/modules/upload' })).toBe(false);
  expect(shouldProtectSwastikRoute({ method: 'GET', url: '/swastik/modules/x/builds/y' })).toBe(
    false,
  );
});

test('registerInternalAuth gates routes on the internal key', async () => {
  const app = Fastify();
  const audit = vi.fn();
  registerInternalAuth(app, { expectedKey: 'k', audit });
  app.get('/x', async () => ({ ok: true }));

  const denied = await app.inject({ method: 'GET', url: '/x' });
  expect(denied.statusCode).toBe(401);

  const wrong = await app.inject({
    method: 'GET',
    url: '/x',
    headers: { [INTERNAL_API_HEADER]: 'nope' },
  });
  expect(wrong.statusCode).toBe(401);

  const ok = await app.inject({
    method: 'GET',
    url: '/x',
    headers: { [INTERNAL_API_HEADER]: 'k' },
  });
  expect(ok.statusCode).toBe(200);
  expect(audit).toHaveBeenCalledWith('allowed', expect.objectContaining({ method: 'GET' }));
});

test('shouldProtect can exempt a route from the gate', async () => {
  const app = Fastify();
  registerInternalAuth(app, { expectedKey: 'k', shouldProtect: () => false });
  app.get('/open', async () => ({ ok: true }));
  const res = await app.inject({ method: 'GET', url: '/open' });
  expect(res.statusCode).toBe(200);
});

test('custom failure status and message are honoured', async () => {
  const app = Fastify();
  registerInternalAuth(app, { expectedKey: 'k', onFailStatus: 403, failMessage: 'no' });
  app.get('/x', async () => ({ ok: true }));
  const res = await app.inject({ method: 'GET', url: '/x' });
  expect(res.statusCode).toBe(403);
  expect(res.json()).toStrictEqual({ error: 'no' });
});
