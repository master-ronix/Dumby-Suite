import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Fastify from 'fastify';
import { describe, expect, test } from 'vitest';
import { INTERNAL_API_HEADER, registerInternalAuth } from '../../src/http/internal-auth.js';
import { assertSafeSlug, assertSafeVersion, safeJoin } from '../../src/shared/utils/path-guard.js';

const repoRoot = join(import.meta.dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('M0 control-plane authentication', () => {
  test('internal auth rejects missing or incorrect keys before the route handler', async () => {
    const app = Fastify();
    let called = false;
    registerInternalAuth(app, { expectedKey: 'x'.repeat(32) });
    app.post('/internal/check', async (_request, reply) => {
      called = true;
      return reply.send({ ok: true });
    });

    const missing = await app.inject({ method: 'POST', url: '/internal/check' });
    const wrong = await app.inject({
      method: 'POST',
      url: '/internal/check',
      headers: { [INTERNAL_API_HEADER]: 'wrong' },
    });
    const allowed = await app.inject({
      method: 'POST',
      url: '/internal/check',
      headers: { [INTERNAL_API_HEADER]: 'x'.repeat(32) },
    });

    expect(missing.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
    expect(allowed.statusCode).toBe(200);
    expect(called).toBe(true);
  });

  test('PEP and Credentials entrypoints install the shared internal-auth preHandler', () => {
    expect(readSource('src/entry/pep.ts')).toContain('registerInternalAuth(app');
    expect(readSource('src/entry/credentials.ts')).toContain('registerInternalAuth(app');
  });

  test('PEP derives its source server-side instead of trusting request body source', () => {
    const source = readSource('src/entry/pep.ts');
    expect(source).toContain("source: 'pep-internal'");
    expect(source).not.toContain("source: String(body['source']");
  });
});

describe('M0 Swastik path containment', () => {
  test('path guards reject traversal slugs and versions', () => {
    expect(() => safeJoin('/tmp/dumby-root', '../escape')).toThrow('path escapes root');
    expect(() => assertSafeSlug('../../bad')).toThrow('module slug must be lowercase kebab-case');
    expect(() => assertSafeVersion('../../1.0.0')).toThrow('module version must be semver-like');
  });

  test('internal deploy requires the internal key and never auto-approves developers', () => {
    const source = readSource('src/entry/swastik.ts');
    expect(source).toContain("app.post('/internal/deploy'");
    expect(source).toContain('requireInternalKey(request, reply)');
    expect(source).toContain('developer is not registered for deployment');
    expect(source).not.toContain('swastik-auto-dev-created');
    expect(source).not.toContain("approvalStatus: 'approved',");
  });
});

describe('M0 CLAI transport', () => {
  test('CLAI uses ssh2 public-key transport and no plaintext TCP REPL entry remains', () => {
    const source = readSource('src/entry/ssh-clai.ts');
    expect(source).toContain("from 'ssh2'");
    expect(source).toContain("ctx.method !== 'publickey'");
    expect(source).toContain('startClaiSshServer');
  });
});
