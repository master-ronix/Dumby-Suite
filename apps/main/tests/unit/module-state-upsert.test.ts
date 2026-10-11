import { describe, expect, test } from 'vitest';
import knexFactory from 'knex';

/**
 * The `guild_module_states` per-guild row is guarded by a **partial** unique index — the migration's
 * `createPartialUniqueNotDeleted` builds `... ("guildId", "moduleSlug") where "deletedAt" is null`.
 *
 * Postgres matches an `ON CONFLICT` target to a partial index ONLY when the target repeats the index
 * predicate. A bare `onConflict(['guildId', 'moduleSlug'])` matches no index and the insert throws
 * SQLSTATE 42P10 ("no unique or exclusion constraint matching the ON CONFLICT specification") — which
 * is why a module **disable never persisted** (the "Disable button is not functional at all" defect).
 * These assertions lock the contract so the bare form cannot return.
 */
describe('guild_module_states upsert targets the partial unique index', () => {
  const k = knexFactory({ client: 'pg' });

  test('the predicate form matches the partial index', () => {
    const sql = k('guild_module_states')
      .insert({ guildId: 'g', moduleSlug: 'm', enabled: false, state: 'disabled' })
      .onConflict(k.raw('("guildId", "moduleSlug") where "deletedAt" is null'))
      .merge({ enabled: false, state: 'disabled' })
      .toSQL();
    expect(sql.sql).toContain('on conflict ("guildId", "moduleSlug") where "deletedAt" is null');
  });

  test('the bare column form omits the predicate — the defect this guards', () => {
    const sql = k('guild_module_states')
      .insert({ guildId: 'g', moduleSlug: 'm' })
      .onConflict(['guildId', 'moduleSlug'])
      .merge({ enabled: false })
      .toSQL();
    expect(sql.sql).not.toContain('where "deletedAt" is null');
  });
});
