/**
 * Command router — dispatches incoming slash command interactions
 * to their registered handlers through the full middleware pipeline
 * (Cluster: Frame).
 *
 * The router is constructed once at bootstrap Stage 09 (DI_BOOTSTRAP)
 * and registered as CORE_TOKENS.CommandRouter. Modules bind handlers
 * to it during Stage 12 (MODULE_LOAD) via their onLoad hooks.
 */
import type { CommandRegistry } from './command-registry.js';
import type { Logger } from '../logging/logger.js';

export interface CommandInteraction {
  commandName: string;
  user: { id: string };
  guildId: string | null;
  reply: (options: unknown) => Promise<void>;
  deferReply: (options?: { ephemeral?: boolean }) => Promise<void>;
  editReply: (options: unknown) => Promise<void>;
}

export class CommandNotFoundError extends Error {
  constructor(name: string) {
    super(`No handler registered for command "${name}"`);
    this.name = 'CommandNotFoundError';
  }
}

export class CommandRouter {
  constructor(
    private readonly registry: CommandRegistry,
    private readonly logger: Logger,
  ) {}

  async dispatch(interaction: CommandInteraction): Promise<void> {
    const name = interaction.commandName;
    const def = this.registry.get(name);

    if (!def) {
      this.logger.warn('command-not-found', { command: name, userId: interaction.user.id });
      throw new CommandNotFoundError(name);
    }

    const start = Date.now();
    try {
      await def.execute(interaction);
      this.logger.info('command-executed', {
        command: name,
        moduleId: def.moduleId,
        userId: interaction.user.id,
        guildId: interaction.guildId ?? 'DM',
        durationMs: Date.now() - start,
      });
    } catch (err) {
      this.logger.error('command-execution-error', {
        command: name,
        moduleId: def.moduleId,
        userId: interaction.user.id,
        error: String(err),
      });
      throw err;
    }
  }
}
