/**
 * Command deployer — publishes slash command definitions to Discord's
 * API at Stage 13 (COMMAND_REGISTER) inventory time, with the actual
 * network calls issued once the live adapter is ready (Cluster: Frame).
 *
 * Strategy: delete-then-reregister (bulk PUT overwrite) on every deploy.
 * Global commands (Discord's source of truth for every guild the bot is
 * in) are always registered — propagation takes up to ~1 hour. When
 * devGuildId is configured, the same set is additionally mirrored to that
 * guild for instant propagation during development/manual verification.
 */
import { Routes } from 'discord.js';
import type { CommandRegistry } from './command-registry.js';
import type { Logger } from '../logging/logger.js';

export interface DeployerConfig {
  botToken: string;
  applicationId: string;
  devGuildId: string;
  nodeEnv: string;
}

/**
 * Minimal subset of discord.js's REST client CommandDeployer needs. Kept as
 * an interface (rather than importing discord.js's REST class directly)
 * so unit tests can construct a CommandDeployer without one — deploy()
 * and undeploy() then only log the command inventory, making no network
 * calls. Bootstrap wires a real `new REST().setToken(...)` instance here
 * when DISCORD_ADAPTER=live.
 */
export interface DiscordRestClient {
  put(route: `/${string}`, options: { body: unknown[] }): Promise<unknown>;
}

export interface CommandDeployerDeps {
  registry: CommandRegistry;
  logger: Logger;
  config: DeployerConfig;
  /** Present only in live mode. Absent in mock/test mode (no-op, logging only). */
  rest?: DiscordRestClient;
}

export class CommandDeployer {
  constructor(private readonly deps: CommandDeployerDeps) {}

  /**
   * Deploy all registered commands to Discord.
   * When `rest` is absent (mock/test mode), this only logs the inventory.
   */
  async deploy(): Promise<void> {
    const { registry, logger, config, rest } = this.deps;
    const commands = registry.toApiPayloads();

    if (commands.length === 0) {
      logger.info('command-deployer-skip', { reason: 'no commands registered' });
      return;
    }

    logger.info('command-deployer-start', {
      commandCount: commands.length,
      env: config.nodeEnv,
    });

    if (rest) {
      await rest.put(Routes.applicationCommands(config.applicationId), { body: commands });
      logger.info('command-deployer-global-registered', { commandCount: commands.length });

      if (config.devGuildId) {
        await rest.put(Routes.applicationGuildCommands(config.applicationId, config.devGuildId), {
          body: commands,
        });
        logger.info('command-deployer-guild-registered', {
          commandCount: commands.length,
          guildId: config.devGuildId,
        });
      }
    }

    logger.info('command-deployer-complete', { commandCount: commands.length });
  }

  async undeploy(): Promise<void> {
    const { logger, config, rest } = this.deps;
    logger.info('command-deployer-undeploy', { note: 'clearing all registered slash commands' });

    if (rest) {
      await rest.put(Routes.applicationCommands(config.applicationId), { body: [] });
      if (config.devGuildId) {
        await rest.put(Routes.applicationGuildCommands(config.applicationId, config.devGuildId), { body: [] });
      }
    }
  }
}
