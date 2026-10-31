import type { Knex } from 'knex';
import type { SealedEnvelope } from '@workspace/swastik';
import { type PersonaBinding, type PersonaIdentity } from './persona.js';

export interface PersonaIdentityStore {
  create(persona: PersonaIdentity): Promise<void>;
  findById(id: string): Promise<PersonaIdentity | undefined>;
  findByApplicationId(discordApplicationId: string): Promise<PersonaIdentity | undefined>;
  findByBoundGuildId(guildId: string): Promise<PersonaIdentity | undefined>;
  list(): Promise<PersonaIdentity[]>;
  /**
   * UR-20261012-073 — record that this persona's OAuth leg completed. Keyed by application id,
   * because that is what the callback holds. A no-op for an unknown application (the callback also
   * serves the main bot, which is not a persona).
   */
  markOauthVerified(discordApplicationId: string): Promise<void>;
  /**
   * UR-20261012-081 — apply a partial update. Only the keys present are written, so an update that
   * omits a field leaves it untouched; a key explicitly set to `null` clears it.
   */
  update(id: string, patch: Readonly<Record<string, unknown>>): Promise<void>;
  /** UR-20261012-081 — revoke: retire the persona and soft-delete it in one write. */
  revoke(id: string): Promise<void>;
  /** UR-20261012-081 — replace the sealed bot token and its digest. */
  rotateBotToken(id: string, digest: string, sealed: unknown): Promise<void>;
  /** UR-20261012-081 — replace the sealed OAuth client secret, or clear it with `undefined`. */
  rotateOauthSecret(id: string, sealed: unknown | undefined): Promise<void>;
}

export interface PersonaBindingStore {
  /** `trx` runs the write inside a caller's transaction — used to make the claim and the module state
   * one atomic change, so the two rows can never disagree, even for a moment. */
  bind(binding: PersonaBinding, trx?: Knex.Transaction): Promise<void>;
  unbind(guildId: string, moduleSlug: string, trx?: Knex.Transaction): Promise<void>;
  findLive(guildId: string, moduleSlug: string): Promise<PersonaBinding | undefined>;
  listForGuild(guildId: string): Promise<PersonaBinding[]>;
  listForPersona(personaId: string): Promise<PersonaBinding[]>;
}

interface PersonaIdentityRow {
  id: string;
  name: string;
  discordApplicationId: string;
  boundGuildId: string;
  dmBehavior: 'prohibited' | 'allowed';
  shardAllocation: number;
  charter: 'free';
  grandfathered: boolean;
  status: 'active' | 'retired';
  botTokenDigest: string;
  botTokenSealed: SealedEnvelope;
  oauthClientSecretSealed?: SealedEnvelope | null;
  oauthVerifiedAt?: Date | string | null;
  presenceStatus?: string | null;
  note?: string | null;
  accent?: string | null;
}

interface PersonaBindingRow {
  guildId: string;
  moduleSlug: string;
  personaId: string;
  deletedAt?: Date | string | null;
}

function toIdentity(row: PersonaIdentityRow): PersonaIdentity {
  return {
    id: row.id,
    name: row.name,
    discordApplicationId: row.discordApplicationId,
    boundGuildId: row.boundGuildId,
    dmBehavior: row.dmBehavior,
    shardAllocation: row.shardAllocation,
    charter: row.charter,
    grandfathered: row.grandfathered,
    status: row.status,
    botTokenDigest: row.botTokenDigest,
    botTokenSealed: row.botTokenSealed,
    ...(row.oauthClientSecretSealed !== undefined && row.oauthClientSecretSealed !== null
      ? { oauthClientSecretSealed: row.oauthClientSecretSealed }
      : {}),
    ...(row.presenceStatus !== undefined && row.presenceStatus !== null
      ? { presenceStatus: row.presenceStatus as never }
      : {}),
    ...(row.note !== undefined && row.note !== null ? { note: row.note } : {}),
    ...(row.accent !== undefined && row.accent !== null ? { accent: row.accent } : {}),
  };
}

export class PostgresPersonaIdentityStore implements PersonaIdentityStore {
  constructor(private readonly knex: Knex) {}

  async create(persona: PersonaIdentity): Promise<void> {
    await this.knex('persona_identities').insert(toRow(persona));
  }

  async findById(id: string): Promise<PersonaIdentity | undefined> {
    const rows = await this.knex<PersonaIdentityRow>('persona_identities')
      .where({ id })
      .whereNull('deletedAt')
      .limit(1);
    return rows[0] === undefined ? undefined : toIdentity(rows[0]);
  }

  async findByApplicationId(discordApplicationId: string): Promise<PersonaIdentity | undefined> {
    const rows = await this.knex<PersonaIdentityRow>('persona_identities')
      .where({ discordApplicationId })
      .whereNull('deletedAt')
      .limit(1);
    return rows[0] === undefined ? undefined : toIdentity(rows[0]);
  }

  async findByBoundGuildId(guildId: string): Promise<PersonaIdentity | undefined> {
    const rows = await this.knex<PersonaIdentityRow>('persona_identities')
      .where({ boundGuildId: guildId })
      .whereNull('deletedAt')
      .limit(1);
    return rows[0] === undefined ? undefined : toIdentity(rows[0]);
  }

  /** UR-20261012-073 — a completed OAuth leg proves the redirect URI is registered. */
  async markOauthVerified(discordApplicationId: string): Promise<void> {
    await this.knex('persona_identities')
      .where({ discordApplicationId })
      .whereNull('deletedAt')
      .update({ oauthVerifiedAt: this.knex.fn.now(), updatedAt: this.knex.fn.now() });
  }

  /** UR-20261012-081 — a partial update; absent keys are untouched, explicit nulls clear. */
  async update(id: string, patch: Readonly<Record<string, unknown>>): Promise<void> {
    await this.knex('persona_identities')
      .where({ id })
      .whereNull('deletedAt')
      .update({ ...patch, updatedAt: this.knex.fn.now() });
  }

  /** UR-20261012-081 — revoke: retired AND soft-deleted, so no read returns it again. */
  async revoke(id: string): Promise<void> {
    await this.knex('persona_identities').where({ id }).whereNull('deletedAt').update({
      status: 'retired',
      deletedAt: this.knex.fn.now(),
      updatedAt: this.knex.fn.now(),
    });
  }

  /** UR-20261012-081 — a new bot token, sealed and digested together. */
  async rotateBotToken(id: string, digest: string, sealed: unknown): Promise<void> {
    await this.knex('persona_identities')
      .where({ id })
      .whereNull('deletedAt')
      .update({
        botTokenDigest: digest,
        botTokenSealed: JSON.stringify(sealed),
        updatedAt: this.knex.fn.now(),
      });
  }

  /** UR-20261012-081 — a new OAuth client secret, or `undefined` to clear it (Route B then applies). */
  async rotateOauthSecret(id: string, sealed: unknown | undefined): Promise<void> {
    await this.knex('persona_identities')
      .where({ id })
      .whereNull('deletedAt')
      .update({
        oauthClientSecretSealed: sealed === undefined ? null : JSON.stringify(sealed),
        // A new secret invalidates the old authorization; the verification is re-earned.
        oauthVerifiedAt: null,
        updatedAt: this.knex.fn.now(),
      });
  }

  async list(): Promise<PersonaIdentity[]> {
    const rows = await this.knex<PersonaIdentityRow>('persona_identities')
      .whereNull('deletedAt')
      .orderBy('name', 'asc');
    return rows.map(toIdentity);
  }
}

function toRow(persona: PersonaIdentity): PersonaIdentityRow {
  return {
    id: persona.id,
    name: persona.name,
    discordApplicationId: persona.discordApplicationId,
    boundGuildId: persona.boundGuildId,
    dmBehavior: persona.dmBehavior,
    shardAllocation: persona.shardAllocation,
    charter: persona.charter,
    grandfathered: persona.grandfathered,
    status: persona.status,
    botTokenDigest: persona.botTokenDigest,
    botTokenSealed: persona.botTokenSealed,
    oauthClientSecretSealed: persona.oauthClientSecretSealed ?? null,
    // UR-20261012-081 — presentation. Absent stays absent rather than becoming an empty string, so
    // "not configured" is distinguishable from "configured as blank".
    presenceStatus: persona.presenceStatus ?? null,
    note: persona.note ?? null,
    accent: persona.accent ?? null,
  };
}

export class PostgresPersonaBindingStore implements PersonaBindingStore {
  constructor(private readonly knex: Knex) {}

  async bind(binding: PersonaBinding, trx?: Knex.Transaction): Promise<void> {
    await (trx ?? this.knex)('guild_persona_bindings')
      .insert(row(binding))
      .onConflict(['guildId', 'moduleSlug'])
      .merge({ personaId: binding.personaId, deletedAt: null, updatedAt: new Date() });
  }

  async unbind(guildId: string, moduleSlug: string, trx?: Knex.Transaction): Promise<void> {
    await (trx ?? this.knex)('guild_persona_bindings')
      .where({ guildId, moduleSlug })
      .whereNull('deletedAt')
      .update({ deletedAt: new Date(), updatedAt: new Date() });
  }

  async findLive(guildId: string, moduleSlug: string): Promise<PersonaBinding | undefined> {
    const rows = await this.knex<PersonaBindingRow>('guild_persona_bindings')
      .where({ guildId, moduleSlug })
      .whereNull('deletedAt')
      .limit(1);
    return rows[0] === undefined ? undefined : fromRow(rows[0]);
  }

  async listForGuild(guildId: string): Promise<PersonaBinding[]> {
    const rows = await this.knex<PersonaBindingRow>('guild_persona_bindings')
      .where({ guildId })
      .whereNull('deletedAt');
    return rows.map(fromRow);
  }

  async listForPersona(personaId: string): Promise<PersonaBinding[]> {
    const rows = await this.knex<PersonaBindingRow>('guild_persona_bindings')
      .where({ personaId })
      .whereNull('deletedAt');
    return rows.map(fromRow);
  }
}

function row(binding: PersonaBinding): PersonaBindingRow {
  return { guildId: binding.guildId, moduleSlug: binding.moduleSlug, personaId: binding.personaId };
}

function fromRow(r: PersonaBindingRow): PersonaBinding {
  return { guildId: r.guildId, moduleSlug: r.moduleSlug, personaId: r.personaId };
}

export class InMemoryPersonaStores implements PersonaIdentityStore, PersonaBindingStore {
  readonly identities = new Map<string, PersonaIdentity>();
  readonly bindings = new Map<string, PersonaBinding>();
  private nextId = 0;

  create(persona: PersonaIdentity): Promise<void> {
    this.identities.set(persona.id, persona);
    return Promise.resolve();
  }

  findById(id: string): Promise<PersonaIdentity | undefined> {
    return Promise.resolve(this.identities.get(id));
  }

  findByApplicationId(discordApplicationId: string): Promise<PersonaIdentity | undefined> {
    return Promise.resolve(
      [...this.identities.values()].find((p) => p.discordApplicationId === discordApplicationId),
    );
  }

  findByBoundGuildId(guildId: string): Promise<PersonaIdentity | undefined> {
    return Promise.resolve([...this.identities.values()].find((p) => p.boundGuildId === guildId));
  }

  list(): Promise<PersonaIdentity[]> {
    return Promise.resolve([...this.identities.values()]);
  }

  /** UR-20261012-081 — the in-memory mirrors of the persisted operations. */
  update(id: string, patch: Readonly<Record<string, unknown>>): Promise<void> {
    const persona = this.identities.get(id);
    if (persona !== undefined) {
      this.identities.set(id, { ...persona, ...patch } as never);
    }
    return Promise.resolve();
  }

  revoke(id: string): Promise<void> {
    const persona = this.identities.get(id);
    if (persona !== undefined) {
      this.identities.set(id, { ...persona, status: 'retired' } as never);
    }
    return Promise.resolve();
  }

  rotateBotToken(id: string, digest: string, sealed: unknown): Promise<void> {
    const persona = this.identities.get(id);
    if (persona !== undefined) {
      this.identities.set(id, {
        ...persona,
        botTokenDigest: digest,
        botTokenSealed: sealed,
      } as never);
    }
    return Promise.resolve();
  }

  rotateOauthSecret(id: string, sealed: unknown | undefined): Promise<void> {
    const persona = this.identities.get(id);
    if (persona !== undefined) {
      this.identities.set(id, { ...persona, oauthClientSecretSealed: sealed } as never);
    }
    return Promise.resolve();
  }

  /** UR-20261012-073 — the in-memory mirror of the persisted mark. */
  markOauthVerified(discordApplicationId: string): Promise<void> {
    const persona = [...this.identities.values()].find(
      (p) => p.discordApplicationId === discordApplicationId,
    );
    if (persona !== undefined) {
      this.identities.set(persona.id, { ...persona, oauthVerifiedAt: new Date().toISOString() });
    }
    return Promise.resolve();
  }

  bind(binding: PersonaBinding): Promise<void> {
    this.bindings.set(`${binding.guildId}:${binding.moduleSlug}`, binding);
    return Promise.resolve();
  }

  unbind(guildId: string, moduleSlug: string): Promise<void> {
    this.bindings.delete(`${guildId}:${moduleSlug}`);
    return Promise.resolve();
  }

  findLive(guildId: string, moduleSlug: string): Promise<PersonaBinding | undefined> {
    return Promise.resolve(this.bindings.get(`${guildId}:${moduleSlug}`));
  }

  listForGuild(guildId: string): Promise<PersonaBinding[]> {
    return Promise.resolve([...this.bindings.values()].filter((b) => b.guildId === guildId));
  }

  listForPersona(personaId: string): Promise<PersonaBinding[]> {
    return Promise.resolve([...this.bindings.values()].filter((b) => b.personaId === personaId));
  }
}
