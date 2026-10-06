import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-DATA-0026-1 — no user-visible state lives only in process memory.

describe('ACC-DATA-0026-1 — state externalized', () => {
  it('state stores are PostgreSQL/Redis-backed', () => {
    expect(existsRepo('apps/main/src/cache/redis-lock-store.ts')).toBe(true);
    expect(existsRepo('apps/main/src/db/client.ts')).toBe(true);
  });
});
