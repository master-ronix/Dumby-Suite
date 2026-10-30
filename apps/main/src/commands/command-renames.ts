import type { Knex } from 'knex';

/** A guild's effective (current) command names, keyed by the registered command key. */
export type EffectiveCommandNames = ReadonlyMap<string, string>;

/**
 * BCCM — the resolution layer for command renames. Reads the renames applied to a guild so a
 * surface can present a command under its current name rather than the name it was registered
 * under. Empty when the caller has no guild, or the guild has no renames.
 */
export async function resolveEffectiveCommandNames(
  knex: Knex,
  guildId: string | null,
  /** item 2 — the acting APPLICATION; '' is the main bot's scope. BCCM is profile-scoped. */
  applicationId = '',
): Promise<EffectiveCommandNames> {
  if (guildId === null) return new Map();
  const rows = (await knex('guild_command_renames')
    .where({ guildId, applicationId })
    .whereNull('deletedAt')
    .select('commandKey', 'newName')) as Array<{ commandKey?: unknown; newName?: unknown }>;
  const names = new Map<string, string>();
  for (const row of rows) {
    if (typeof row.commandKey === 'string' && typeof row.newName === 'string') {
      names.set(row.commandKey, row.newName);
    }
  }
  return names;
}

/**
 * OI-10 — the aliases a guild's commands carry, keyed by the registered command key.
 *
 * An alias is an extra invocable NAME for a command that already exists; it is stored in
 * `guild_command_renames.aliases` and, until this reader existed, was written by the push and never
 * read, so a boot re-registered the renamed set without it.
 */
export async function resolveCommandAliases(
  knex: Knex,
  guildId: string | null,
  /** item 2 — the acting APPLICATION; '' is the main bot's scope. BCCM is profile-scoped. */
  applicationId = '',
): Promise<ReadonlyMap<string, readonly string[]>> {
  if (guildId === null) return new Map();
  const rows = (await knex('guild_command_renames')
    .where({ guildId, applicationId })
    .whereNull('deletedAt')
    .select('commandKey', 'aliases')) as Array<{ commandKey?: unknown; aliases?: unknown }>;
  const aliases = new Map<string, string[]>();
  for (const row of rows) {
    if (typeof row.commandKey !== 'string') continue;
    const value = Array.isArray(row.aliases) ? row.aliases : [];
    const names = value.filter((alias): alias is string => typeof alias === 'string');
    if (names.length > 0) aliases.set(row.commandKey, names);
  }
  return aliases;
}

/**
 * The current display name for a command key: the applied rename when one exists, otherwise the
 * key unchanged. The submitted value stays the command key — a rename changes what a command is
 * called, never how it is invoked.
 */
export function effectiveCommandName(names: EffectiveCommandNames, commandKey: string): string {
  return names.get(commandKey) ?? commandKey;
}

/** A guild's effective command status, keyed by the registered command key. */
export type CommandStatuses = ReadonlyMap<string, 'enabled' | 'disabled'>;

/**
 * BCCM — the resolution layer for command status. Reads a guild's `enabled`/`disabled` overrides so
 * a surface can mark a command as disabled rather than presenting it as always available. Later
 * writes win, so the rows are read oldest-first and the last one for a key stands. Empty when the
 * caller has no guild or the guild has no overrides.
 */
export async function resolveCommandStatuses(
  knex: Knex,
  guildId: string | null,
  /** item 2 — the acting APPLICATION; '' is the main bot's scope. BCCM is profile-scoped. */
  applicationId = '',
): Promise<CommandStatuses> {
  if (guildId === null) return new Map();
  const rows = (await knex('guild_command_overrides')
    .where({ guildId, applicationId })
    .whereIn('overrideType', ['enabled', 'disabled'])
    .whereNull('deletedAt')
    .orderBy('updatedAt', 'asc')
    .select('commandKey', 'overrideType')) as Array<{
    commandKey?: unknown;
    overrideType?: unknown;
  }>;
  const statuses = new Map<string, 'enabled' | 'disabled'>();
  for (const row of rows) {
    if (
      typeof row.commandKey === 'string' &&
      (row.overrideType === 'enabled' || row.overrideType === 'disabled')
    ) {
      statuses.set(row.commandKey, row.overrideType);
    }
  }
  return statuses;
}
