import type { Knex } from 'knex';
import { type PersonaBinding, type PersonaIdentity } from './persona.js';

export interface PersonaIdentityStore {
  create(persona: PersonaIdentity): Promise<void>;
  findById(id: string): Promise<PersonaIdentity | undefined>;
  findByApplicationId(discordApplicationId: string): Promise<PersonaIdentity | undefined>;
  findByBoundGuildId(guildId: string): Promise<PersonaIdentity | undefined>;
  list(): Promise<PersonaIdentity[]>;
}

export interface PersonaBindingStore {
  bind(binding: PersonaBinding): Promise<void>;
  unbind(guildId: string, moduleSlug: string): Promise<void>;
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
  };
}

export class PostgresPersonaBindingStore implements PersonaBindingStore {
  constructor(private readonly knex: Knex) {}

  async bind(binding: PersonaBinding): Promise<void> {
    await this.knex('guild_persona_bindings')
      .insert(row(binding))
      .onConflict(['guildId', 'moduleSlug'])
      .merge({ personaId: binding.personaId, deletedAt: null, updatedAt: new Date() });
  }

  async unbind(guildId: string, moduleSlug: string): Promise<void> {
    await this.knex('guild_persona_bindings')
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
