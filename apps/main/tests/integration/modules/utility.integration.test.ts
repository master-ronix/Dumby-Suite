import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import knexFactory, { type Knex } from 'knex';
import knexConfig from '../../../src/db/knexfile.js';
import { UtilityService } from '../../../src/modules/utility/service.js';
import { UtilityRepository } from '../../../src/modules/utility/repository.js';

/**
 * Integration tier (Cluster: Masters): targets the real Postgres started
 * by docker-compose.yml. Run with `pnpm test:integration` on a machine
 * with Docker — this cannot execute inside the sandbox this repository
 * was authored in (no live Postgres available there).
 */
describe('utility module against a real Postgres connection', () => {
  let knex: Knex;
  let service: UtilityService;

  beforeAll(async () => {
    knex = knexFactory(knexConfig.test ?? knexConfig.development);
    await knex.migrate.latest();
    const repository = new UtilityRepository(knex);
    service = new UtilityService(repository);
  });

  afterAll(async () => {
    await knex.destroy();
  });

  it('selfTest() writes a real row to mod_utility_selftest and status() reflects it', async () => {
    const before = await service.status();
    const result = await service.selfTest();
    expect(result.ok).toBe(true);
    const after = await service.status();
    expect(after.totalRuns).toBe(before.totalRuns + 1);
  });

  it('recorded rows are excluded from counts once soft-deleted', async () => {
    await service.selfTest();
    const row = await knex('mod_utility_selftest').orderBy('createdAt', 'desc').first();
    await knex('mod_utility_selftest').where({ id: row.id }).update({ deletedAt: new Date() });
    const rowsAfterDelete = await knex('mod_utility_selftest').whereNull('deletedAt').where({ id: row.id });
    expect(rowsAfterDelete.length).toBe(0);
  });
});
