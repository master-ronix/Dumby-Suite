import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-DATA-0026-3 — cross-shard coordination uses broadcastEval only for low-frequency ops; Redis pub/sub for high-frequency.
describe('ACC-DATA-0026-3 — cross-shard coordination', () => {
  it('the shard-ownership lock is Redis-backed', () => {
    expect(readSrc('discord/shard-ownership.ts')).toMatch(/redis/i);
  });
});
