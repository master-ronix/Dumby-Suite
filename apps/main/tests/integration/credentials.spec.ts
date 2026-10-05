import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { DeveloperCredentialService } from '../../src/credentials/developer-credential.service.js';
import { repoRoot } from '../spec-utils.js';
/**
 * ACC-REQ-0022-3 — "Credentials Service hashes with Argon2id and binds to the internal network only;
 * one issuance path".
 *
 * Authority: docs/spec/request-layer/control-plane-services.md (SPEC-04-REQUEST-LAYER-0022),
 * acceptance block. §22.8: a credential secret is never persisted — only its Argon2id hash — and
 * issuance is delegated to the Credentials Service alone, so no other surface mints credentials
 * itself.
 */
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const srcRoot = `${repoRoot}apps/main/src`;

function read(rel: string): string {
  return readFileSync(`${repoRoot}apps/main/${rel}`, 'utf8');
}

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('ACC-REQ-0022-3 — the Credentials Service', () => {
  it('hashes with Argon2id, never a bare digest', () => {
    const service = read('src/credentials/developer-credential.service.ts');
    expect(service).toMatch(/import argon2 from 'argon2'/);
    expect(service).toContain('type: argon2.argon2id');
    expect(service).not.toMatch(/createHash\(/);
  });

  it('a real hash round-trips: the persisted value is an Argon2id hash, never the secret', async () => {
    // The store keeps the whole record, exactly as the Postgres store does.
    const rows: Array<Record<string, unknown>> = [];
    const store = {
      insert: async (record: Record<string, unknown>) => {
        rows.push(record);
      },
      findByKeyId: async (keyId: string) => rows.find((r) => r['keyId'] === keyId),
      markRevoked: async () => true,
      setStatus: async () => true,
    };
    const service = new DeveloperCredentialService(store as never);

    const issued = await service.issue({
      purpose: 'devId',
      devId: 'dev-1',
      registeredBy: 'op',
      status: 'active',
    });

    expect(rows).toHaveLength(1);
    const persisted = rows[0]!['credentialHash'] as string;
    expect(persisted).not.toBe(issued.secret);
    // Argon2id's own encoded form — the algorithm is not merely claimed, it is what was stored.
    expect(persisted.startsWith('$argon2id$')).toBe(true);

    const verified = await service.verify({
      keyId: issued.keyId,
      secret: issued.secret,
      devId: 'dev-1',
    });
    expect(verified.status).toBe('active');

    await expect(
      service.verify({ keyId: issued.keyId, secret: 'not-the-secret', devId: 'dev-1' }),
    ).rejects.toThrow();
  });

  it('binds to the internal network only', () => {
    const schema = read('src/config/env.schema.ts');
    expect(schema).toMatch(
      /CREDENTIALS_SERVICE_BIND_HOST: z\.string\(\)\.default\('127\.0\.0\.1'\)/,
    );
    const entry = read('src/entry/credentials.ts');
    expect(entry).toContain('host: env.CREDENTIALS_SERVICE_BIND_HOST');
    // It must never default to all interfaces.
    expect(entry).not.toContain("host: '0.0.0.0'");
    expect(entry).not.toMatch(/BIND_HOST: z\.string\(\)\.default\('0\.0\.0\.0'\)/);
  });

  it('is the single issuance path — no other surface mints credentials itself', () => {
    const hasherUsers = tsFiles(srcRoot)
      .filter((f) => !f.includes('/credentials/') && !f.endsWith('/entry/credentials.ts'))
      .filter((f) => readFileSync(f, 'utf8').includes("from 'argon2'"));
    expect(hasherUsers).toEqual([]);
  });
});
