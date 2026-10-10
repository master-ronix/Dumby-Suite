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
): Promise<EffectiveCommandNames> {
  if (guildId === null) return new Map();
  const rows = (await knex('guild_command_renames')
    .where({ guildId })
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
 * The current display name for a command key: the applied rename when one exists, otherwise the
 * key unchanged. The submitted value stays the command key — a rename changes what a command is
 * called, never how it is invoked.
 */
export function effectiveCommandName(names: EffectiveCommandNames, commandKey: string): string {
  return names.get(commandKey) ?? commandKey;
}
