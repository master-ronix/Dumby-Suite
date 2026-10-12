/**
 * UR-20261012-037 — the registrar registry's storage and its seed parser.
 *
 * A registration is allowed only when the (authority, application) pair is recorded — or when the
 * authority holds an "any application" grant (`discordApplicationId` of `''`).
 */
import type { Knex } from 'knex';

export interface PersonaRegistrarRecord {
  readonly authority: string;
  readonly discordApplicationId: string;
  readonly grantedBy: string;
}

export interface PersonaRegistrarStore {
  isAuthorised(authority: string, discordApplicationId: string): Promise<boolean>;
  /**
   * UR-20261012-041 — whether ANY grant exists. An empty registry means the operator has not asked
   * for an allowlist, so registration is governed by ownership alone (bring-your-own-identity).
   */
  hasAny(): Promise<boolean>;
  grant(record: PersonaRegistrarRecord): Promise<void>;
  revoke(authority: string, discordApplicationId: string): Promise<boolean>;
  list(): Promise<PersonaRegistrarRecord[]>;
}

interface PersonaRegistrarRow {
  authority: string;
  discordApplicationId: string;
  grantedBy: string;
}

/**
 * Parses the boot seed: a comma-separated list where each entry is either a bare authority (granted
 * for ANY application) or `authority=applicationId`. Blank entries are ignored, so an unset variable
 * is an empty seed rather than an error.
 */
export function parseRegistrarSeed(value: string): PersonaRegistrarRecord[] {
  const out: PersonaRegistrarRecord[] = [];
  for (const raw of value.split(',')) {
    const entry = raw.trim();
    if (entry === '') continue;
    const eq = entry.indexOf('=');
    const authority = (eq === -1 ? entry : entry.slice(0, eq)).trim();
    const applicationId = eq === -1 ? '' : entry.slice(eq + 1).trim();
    if (authority === '') continue;
    out.push({ authority, discordApplicationId: applicationId, grantedBy: 'config-seed' });
  }
  return out;
}

export class PostgresPersonaRegistrarStore implements PersonaRegistrarStore {
  constructor(private readonly knex: Knex) {}

  async isAuthorised(authority: string, discordApplicationId: string): Promise<boolean> {
    if (authority === '') return false;
    const row = await this.knex<PersonaRegistrarRow>('persona_registrars')
      .where({ authority })
      .whereNull('deletedAt')
      .andWhere((builder) => {
        builder.where({ discordApplicationId }).orWhere({ discordApplicationId: '' });
      })
      .first();
    return row !== undefined;
  }

  async hasAny(): Promise<boolean> {
    const row = await this.knex('persona_registrars').whereNull('deletedAt').first();
    return row !== undefined;
  }

  async grant(record: PersonaRegistrarRecord): Promise<void> {
    await this.knex('persona_registrars')
      .insert({ ...record, deletedAt: null })
      .onConflict(['authority', 'discordApplicationId'])
      .merge({ grantedBy: record.grantedBy, deletedAt: null, updatedAt: new Date() });
  }

  async revoke(authority: string, discordApplicationId: string): Promise<boolean> {
    const updated = await this.knex('persona_registrars')
      .where({ authority, discordApplicationId })
      .whereNull('deletedAt')
      .update({ deletedAt: new Date(), updatedAt: new Date() });
    return updated > 0;
  }

  async list(): Promise<PersonaRegistrarRecord[]> {
    const rows = await this.knex<PersonaRegistrarRow>('persona_registrars')
      .whereNull('deletedAt')
      .orderBy('authority', 'asc');
    return rows.map((row) => ({
      authority: row.authority,
      discordApplicationId: row.discordApplicationId,
      grantedBy: row.grantedBy,
    }));
  }
}

/** Applies the boot seed idempotently. Returns how many entries were written. */
export async function seedRegistrars(
  store: PersonaRegistrarStore,
  seed: readonly PersonaRegistrarRecord[],
): Promise<number> {
  for (const record of seed) await store.grant(record);
  return seed.length;
}

/**
 * UR-20261012-040 — the boot-time seed, which CANNOT throw.
 *
 * A boot path must not die on a registry write: an unwritable seed leaves the registry as it was,
 * and registration simply stays refused (it already fails closed) rather than the process failing to
 * start.
 */
export async function seedRegistrarsSafely(
  store: PersonaRegistrarStore,
  seed: readonly PersonaRegistrarRecord[],
  warn: (message: string) => void,
): Promise<number> {
  try {
    return await seedRegistrars(store, seed);
  } catch (err) {
    warn(`persona-registrar-seed-failed: ${String(err)} — the registry is left as it was`);
    return 0;
  }
}
