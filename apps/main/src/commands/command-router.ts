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
import type { CommandDefinition } from './command-registry.js';
import type { Logger } from '../logging/logger.js';
import type { ModuleTier } from '../modules/tier-rules.js';

export interface CommandInteraction {
  commandName: string;
  user: { id: string };
  guildId: string | null;
  reply: (options: unknown) => Promise<void>;
  deferReply: (options?: { ephemeral?: boolean }) => Promise<void>;
  editReply: (options: unknown) => Promise<void>;
  replied?: boolean;
  deferred?: boolean;
}

export class CommandNotFoundError extends Error {
  constructor(name: string) {
    super(`No handler registered for command "${name}"`);
    this.name = 'CommandNotFoundError';
  }
}

export class CommandScopeDeniedError extends Error {
  constructor(
    readonly commandName: string,
    readonly moduleId: string,
    readonly tier: ModuleTier,
    readonly guildId: string | null,
  ) {
    super(
      `Command "${commandName}" from ${tier} module "${moduleId}" is not available in guild "${guildId ?? 'DM'}"`,
    );
    this.name = 'CommandScopeDeniedError';
  }
}

export interface CommandRouterOptions {
  devGuildId?: string;
  ackTimeoutMs?: number;
  isModuleEnabledInGuild?: (moduleId: string, guildId: string) => Promise<boolean>;
}

export class CommandRouter {
  private readonly devGuildId: string;
  private readonly ackTimeoutMs: number;

  constructor(
    private readonly registry: CommandRegistry,
    private readonly logger: Logger,
    private readonly options: CommandRouterOptions = {},
  ) {
    this.devGuildId = options.devGuildId ?? '';
    this.ackTimeoutMs = options.ackTimeoutMs ?? 2_500;
  }

  async dispatch(interaction: CommandInteraction): Promise<void> {
    const name = interaction.commandName;
    const def = this.registry.get(name);

    if (!def) {
      this.logger.warn('command-not-found', { command: name, userId: interaction.user.id });
      throw new CommandNotFoundError(name);
    }

    await this.assertCommandInScope(def, interaction.guildId);

    const start = Date.now();
    const guardedInteraction = this.withAcknowledgementGuard(interaction);
    try {
      await def.execute(guardedInteraction.interaction);
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
    } finally {
      guardedInteraction.clear();
    }
  }

  private async assertCommandInScope(
    command: CommandDefinition,
    guildId: string | null,
  ): Promise<void> {
    const tier = this.registry.tierForCommand(command);
    const guildOnly = command.guildOnly ?? true;

    if (guildOnly && !guildId) {
      throw new CommandScopeDeniedError(
        command.data.name,
        command.moduleId,
        tier ?? 'standard',
        guildId,
      );
    }

    if (!tier) return;

    if (tier === 'admin') {
      if (guildId !== this.devGuildId) {
        throw new CommandScopeDeniedError(command.data.name, command.moduleId, tier, guildId);
      }
      return;
    }

    if (tier === 'core') return;

    if (!guildId) {
      throw new CommandScopeDeniedError(command.data.name, command.moduleId, tier, guildId);
    }

    if (!this.options.isModuleEnabledInGuild) return;

    const enabled = await this.options.isModuleEnabledInGuild(command.moduleId, guildId);
    if (!enabled) {
      throw new CommandScopeDeniedError(command.data.name, command.moduleId, tier, guildId);
    }
  }

  private withAcknowledgementGuard(interaction: CommandInteraction): {
    interaction: CommandInteraction;
    clear: () => void;
  } {
    let acknowledged = interaction.replied === true || interaction.deferred === true;
    let autoDeferred = false;

    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (acknowledged) return;
      acknowledged = true;
      autoDeferred = true;
      void interaction.deferReply({ ephemeral: true }).catch((err) => {
        this.logger.error('command-auto-defer-failed', {
          command: interaction.commandName,
          error: String(err),
        });
      });
    }, this.ackTimeoutMs);

    const guarded = new Proxy(interaction, {
      get(target, prop, receiver) {
        if (prop === 'reply') {
          return async (options: unknown): Promise<void> => {
            if (autoDeferred) {
              await target.editReply(options);
              return;
            }
            acknowledged = true;
            await target.reply(options);
          };
        }

        if (prop === 'deferReply') {
          return async (options?: { ephemeral?: boolean }): Promise<void> => {
            acknowledged = true;
            await target.deferReply(options);
          };
        }

        if (prop === 'editReply') {
          return async (options: unknown): Promise<void> => {
            acknowledged = true;
            await target.editReply(options);
          };
        }

        return Reflect.get(target, prop, receiver);
      },
    });

    return {
      interaction: guarded,
      clear: () => clearTimeout(timer),
    };
  }
}
