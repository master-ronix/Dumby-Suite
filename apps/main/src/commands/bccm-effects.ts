import type { Knex } from 'knex';
import type { CommandRegistry } from './command-registry.js';
import { CommandNotFoundError } from './command-router.js';
import type { Logger } from '../logging/logger.js';

export interface BccmEffectDeps {
  knex: Knex;
  registry: CommandRegistry;
  logger: Logger;
}

/** §6.4 — the four BCCM action types. */
const ACTIONS = new Set(['rename', 'alias', 'disable', 'enable']);

export type EffectHandler = (
  payload: Readonly<Record<string, unknown>>,
  interaction: { guildId: string | null; user: { id: string } },
) => Promise<void>;

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/**
 * §6.7 — the host side of `/queue`'s submission. A module declares the effect because it cannot
 * reach the database itself; the validation and the write happen here.
 *
 * Validation failures throw, and the router renders them through the formal notice frame (§2.3)
 * rather than an ad-hoc error. `CommandNotFoundError` maps to `UNKNOWN_COMMAND`, which is what a
 * queue request naming a command that is not registered is.
 */
export function createBccmEffectHandlers(deps: BccmEffectDeps): Record<string, EffectHandler> {
  const { knex, registry, logger } = deps;

  return {
    'bccm.submit': async (payload, interaction) => {
      const guildId = interaction.guildId;
      if (guildId === null) return;

      const commandKey = str(payload['commandKey']);
      if (commandKey === undefined || !registry.has(commandKey)) {
        throw new CommandNotFoundError(commandKey ?? '(none)');
      }
      const action = str(payload['action']) ?? 'rename';
      if (!ACTIONS.has(action)) {
        throw new CommandNotFoundError(commandKey);
      }

      const entry: Record<string, unknown> = { action, submittedBy: interaction.user.id };
      const alias = str(payload['alias']);
      if (alias !== undefined) entry['alias'] = alias;
      const newName = str(payload['newName']);
      if (newName !== undefined) entry['newName'] = newName;
      if (typeof payload['disable'] === 'boolean') entry['disable'] = payload['disable'];

      await knex('guild_command_queue').insert({
        guildId,
        commandKey,
        payload: entry,
        status: 'pending',
      });
      logger.info('bccm-queue-submitted', { guildId, commandKey, action });
    },
  };
}
