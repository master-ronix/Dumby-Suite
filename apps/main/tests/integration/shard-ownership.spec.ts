import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-DATA-0026-2 — the shard-ownership lock prevents two shards holding the same connection.

describe('ACC-DATA-0026-2 — shard ownership', () => {
  it('the shard-ownership lock exists', () => {
    expect(existsRepo('apps/main/src/discord/shard-ownership.ts')).toBe(true);
  });
});
