import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-ARCH-0005-3 — discord.js v14 is used directly (no wrapper) and all DB access uses Knex, never an ORM.
describe('ACC-ARCH-0005-3 — no wrapper, no ORM', () => {
  it('discord.js is a direct dependency and no ORM is present', () => {
    const pkg = JSON.parse(readRepo('apps/main/package.json')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['discord.js']).toBeDefined();
    for (const orm of [
      'drizzle-orm',
      'prisma',
      '@prisma/client',
      'typeorm',
      'sequelize',
      'mongoose',
    ]) {
      expect(pkg.dependencies[orm]).toBeUndefined();
    }
    expect(pkg.dependencies['knex']).toBeDefined();
  });
});
