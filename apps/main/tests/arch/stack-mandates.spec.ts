import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-GOV-0004-1 — stack mandates: Node>=22, TS strict, ESM-only, discord.js v14 direct, PostgreSQL+Knex, BullMQ, Pino, Zod, Fastify.
describe('ACC-GOV-0004-1 — stack mandates', () => {
  it('the mandated stack is present in dependencies', () => {
    const pkg = JSON.parse(readRepo('apps/main/package.json')) as {
      dependencies: Record<string, string>;
    };
    for (const dep of ['discord.js', 'knex', 'pg', 'bullmq', 'pino', 'zod', 'fastify', 'ioredis']) {
      expect(pkg.dependencies[dep]).toBeDefined();
    }
  });
});
