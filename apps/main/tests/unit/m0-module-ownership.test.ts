import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { InMemoryModuleOwnershipStore } from '../../src/db/repositories/module-ownership.repository.js';
import {
  decideModuleOwnership,
  type ModuleOwnershipRecord,
} from '../../src/module-system/module-ownership.js';

const ownedByA: ModuleOwnershipRecord = {
  slug: 'x',
  ownerDevId: 'dev-a',
  createdAt: new Date(),
  ownershipTransferredAt: null,
};

describe('module ownership decision (§15.8)', () => {
  test('a fresh slug is claimed', () => {
    expect(decideModuleOwnership(undefined, 'dev-a')).toEqual({ kind: 'claim' });
  });

  test('the owning developer may re-upload', () => {
    expect(decideModuleOwnership(ownedByA, 'dev-a')).toEqual({ kind: 'owned' });
  });

  test('a different developer is denied and the owner is named', () => {
    expect(decideModuleOwnership(ownedByA, 'dev-b')).toEqual({
      kind: 'denied',
      ownerDevId: 'dev-a',
    });
  });
});

describe('module ownership store (in-memory)', () => {
  test('claim inserts once; a second claim on the same slug fails', async () => {
    const store = new InMemoryModuleOwnershipStore();
    expect(await store.findBySlug('x')).toBeUndefined();
    expect(await store.claim('x', 'dev-a')).toBe(true);
    expect(await store.claim('x', 'dev-b')).toBe(false);
    expect((await store.findBySlug('x'))?.ownerDevId).toBe('dev-a');
  });

  test('transfer moves ownership and stamps the transfer time; unknown slug fails', async () => {
    const store = new InMemoryModuleOwnershipStore();
    expect(await store.transfer('missing', 'dev-b')).toBe(false);
    await store.claim('x', 'dev-a');
    expect(await store.transfer('x', 'dev-b')).toBe(true);
    const record = await store.findBySlug('x');
    expect(record?.ownerDevId).toBe('dev-b');
    expect(record?.ownershipTransferredAt).toBeInstanceOf(Date);
  });
});

describe('swastik ownership enforcement (structural — the entry point is not importable)', () => {
  test('upload and deploy resolve ownership, audit a non-owner refusal, and require manifest.devId', () => {
    const source = readFileSync(
      join(import.meta.dirname, '..', '..', 'src', 'entry', 'swastik.ts'),
      'utf8',
    );
    expect(source).toContain('resolveModuleOwnership');
    expect(source).toContain('MODULE_UPLOAD_DENIED_NON_OWNER');
    expect(source).toContain('MODULE_DEPLOY_DENIED_NON_OWNER');
    expect(source).toContain('manifest devId is required');
  });
});
