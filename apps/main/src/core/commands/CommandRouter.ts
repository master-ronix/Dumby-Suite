import { ConfigurationError } from '../../errors/taxonomy.js';
import { CommandKeyCodec } from './CommandKeyCodec.js';
import type { CommandRegistry } from './CommandRegistry.js';
import type {
  CommandContextFactoryPort,
  GuildModuleStatePort,
  LoggerPort,
  MetricsPort,
  MiddlewarePipelinePort,
} from './ports.js';
import type { CommandRestrictionGuard } from './CommandRestrictionGuard.js';
import type { SupportedDispatchInteraction, SupportedCommandInteraction } from './types.js';

export interface CommandRouterOptions {
  registry: CommandRegistry;
  moduleState: GuildModuleStatePort;
  restrictions: CommandRestrictionGuard;
  middleware: MiddlewarePipelinePort;
  contextFactory: CommandContextFactoryPort;
  logger: LoggerPort;
  metrics?: MetricsPort;
  isShuttingDown?: () => boolean;
}

export class CommandRouter {
  constructor(private readonly options: CommandRouterOptions) {}

  async dispatch(interaction: SupportedDispatchInteraction): Promise<void> {
    if (this.options.isShuttingDown?.() === true) return;
    if (!interaction.isCommand() && !interaction.isAutocomplete()) return;

    const start = Date.now();
    const key = this.keyForInteraction(interaction);
    const entry = this.options.registry.resolve(key);
    this.options.metrics?.observe(
      'dumby_command_dispatch_lookup_duration_seconds',
      (Date.now() - start) / 1000,
    );

    if (entry === undefined) {
      this.options.metrics?.increment('dumby_command_unknown_key_total');
      this.options.logger.warn('unknown-command-key', { key });
      return;
    }

    if (!(await this.isModuleActive(interaction, entry))) return;

    const decision = await this.options.restrictions.check(interaction, entry);
    if (!decision.allowed) {
      if (!decision.silent && interaction.isRepliable()) {
        await interaction.reply({ content: 'This command is not available here.', ephemeral: true });
      }
      return;
    }

    const context = await this.options.contextFactory.create(interaction, entry);
    if (interaction.isAutocomplete()) {
      const focused = interaction.options.getFocused(true);
      const handler = entry.command.autocomplete[focused.name];
      if (handler !== undefined) {
        await handler(interaction, context);
      } else {
        await interaction.respond([]);
      }
      return;
    }

    await this.options.middleware.execute(
      interaction as SupportedCommandInteraction,
      context,
      entry,
      async () => entry.command.execute(interaction as SupportedCommandInteraction, context),
    );
  }

  private async isModuleActive(interaction: SupportedDispatchInteraction, entry: NonNullable<ReturnType<CommandRegistry['resolve']>>): Promise<boolean> {
    if (entry.metadata.tier === 'admin' || entry.metadata.tier === 'core') return true;
    if (interaction.guildId === null) return false;
    try {
      const status = await this.options.moduleState.getStatus(
        interaction.guildId,
        entry.metadata.moduleSlug,
        entry.metadata.tier,
      );
      return status === 'active';
    } catch (error) {
      this.options.logger.warn('command-module-state-fail-closed', {
        commandKey: entry.metadata.commandKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private keyForInteraction(interaction: SupportedDispatchInteraction): string {
    if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
      const group = interaction.options.getSubcommandGroup(false) ?? undefined;
      const subcommand = interaction.options.getSubcommand(false) ?? undefined;
      return CommandKeyCodec.encodeSlash(interaction.commandName, subcommand, group);
    }
    if (interaction.isUserContextMenuCommand()) {
      return CommandKeyCodec.encodeContext('USER_CONTEXT_MENU', interaction.commandName);
    }
    if (interaction.isMessageContextMenuCommand()) {
      return CommandKeyCodec.encodeContext('MESSAGE_CONTEXT_MENU', interaction.commandName);
    }
    throw new ConfigurationError('Unsupported interaction type for command router');
  }
}
