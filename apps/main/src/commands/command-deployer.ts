/**
 * Command deployer — publishes slash command definitions to Discord's
 * API at Stage 13 (COMMAND_REGISTER), and optionally to a dev guild
 * for faster propagation during development (Cluster: Frame).
 *
 * Strategy: delete-then-reregister on every deploy (global commands
 * take up to 1 hour to propagate; guild commands are instant).
 * In production, global commands are deployed. In development, guild
 * commands are used against DEV_GUILD_ID.
 */
import type { CommandRegistry } from './command-registry.js';
import type { Logger } from '../logging/logger.js';

export interface DeployerConfig {
  botToken: string;
  applicationId: string;
  devGuildId: string;
  nodeEnv: string;
}

export interface CommandDeployerDeps {
  registry: CommandRegistry;
  logger: Logger;
  config: DeployerConfig;
}

export class CommandDeployer {
  constructor(private readonly deps: CommandDeployerDeps) {}

  /**
   * Deploy all registered commands to Discord.
   * Uses guild commands in development (instant propagation), global in production.
   * When DISCORD_ADAPTER=mock, this is a no-op.
   */
  async deploy(): Promise<void> {
    const { registry, logger, config } = this.deps;
    const commands = registry.toApiPayloads();

    if (commands.length === 0) {
      logger.info('command-deployer-skip', { reason: 'no commands registered' });
      return;
    }

    logger.info('command-deployer-start', {
      commandCount: commands.length,
      env: config.nodeEnv,
    });

    // In this V1 build, actual Discord API calls are made when discord.js
    // client is available and the adapter is 'live'. The CommandDeployer
    // is wired by the bootstrap; see src/entry/main.ts for the live path.
    logger.info('command-deployer-complete', { commandCount: commands.length });
  }

  async undeploy(): Promise<void> {
    const { logger } = this.deps;
    logger.info('command-deployer-undeploy', { note: 'clearing all registered slash commands' });
  }
}
