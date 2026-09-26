import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerInfoRoutes } from '../../src/http/routes/info.routes.js';
import Fastify from 'fastify';

const projectRoot = new URL('../../', import.meta.url);
const srcInfo = fileURLToPath(new URL('src/http/routes/info.routes.ts', projectRoot));
const packageJson = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

/**
 * UR-B-25: /api/info must report the version from the built package.json,
 * never a hardcoded literal.
 */
test('GET /api/info reports the package.json version', async () => {
  const app = Fastify();
  registerInfoRoutes(app, {
    get: (key: string) => (key === 'NODE_ENV' ? 'test' : ''),
  } as never);

  const res = await app.inject({ method: 'GET', url: '/api/info' });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.version).toBe(packageJson.version);
  expect(typeof body.version).toBe('string');
  expect(body.version.length).toBeGreaterThan(0);
  expect(body.runtimeVersions.node).toBe(process.versions.node);
});

test('the package.json version is not a hardcoded throwaway (guards regressions)', () => {
  const src = readFileSync(srcInfo, 'utf8');
  expect(src).not.toContain("version: '1.0.0'");
});
