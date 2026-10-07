import { Routes } from 'discord.js';
import type { CommandRegistry } from './command-registry.js';
import type { CommandDefinition } from './command-registry.js';
import type { Logger } from '../logging/logger.js';
import type { ModuleTier } from '../module-system/tier-rules.js';

export interface DeployerConfig {
  botToken: string;
  applicationId: string;
  devGuildId: string;
  nodeEnv: string;
}

export interface DiscordRestClient {
  put(route: `/${string}`, options: { body: unknown[] }): Promise<unknown>;
}

export interface CommandDeployerDeps {
  registry: CommandRegistry;
  logger: Logger;
  config: DeployerConfig;
  rest?: DiscordRestClient;
  enabledGuildResolver?: (moduleSlug: string) => Promise<readonly string[]>;
}

const isGuildScopedTier = (tier: ModuleTier): boolean =>
  tier === 'standard' || tier === 'marketplace';

class MissingModuleTierError extends Error {
  constructor(moduleId: string) {
    super(`No manifest tier registered for module \"${moduleId}\"`);
    this.name = 'MissingModuleTierError';
  }
}

export class CommandDeployer {
  constructor(private readonly deps: CommandDeployerDeps) {}

  async deploy(): Promise<void> {
    const { registry, logger, config, rest } = this.deps;
    const commands = registry.all();

    if (commands.length === 0) {
      logger.info('command-deployer-skip', { reason: 'no commands registered' });
      return;
    }

    const admin = commands.filter((c) => this.tierOf(c) === 'admin');
    const core = commands.filter((c) => this.tierOf(c) === 'core');
    const guildScoped = commands.filter((c) => isGuildScopedTier(this.tierOf(c)));

    logger.info('command-deployer-start', {
      commandCount: commands.length,
      env: config.nodeEnv,
      scopes: {
        admin: admin.length,
        core: core.length,
        standardOrMarketplace: guildScoped.length,
      },
    });

    if (rest) {
      // §17.4 TABLE 17-C — Development registers EVERY command to the development guild,
      // where it propagates in seconds. A global registration takes up to ~1 hour to reach
      // clients, which is why a development deploy otherwise looks like it registered
      // nothing at all while the previous global set lingers.
      if (config.nodeEnv === 'development' && config.devGuildId !== '') {
        // Clear the global set first, so stale global registrations from earlier deploys
        // stop showing up alongside the guild-scoped ones.
        await rest.put(Routes.applicationCommands(config.applicationId), { body: [] });
        await rest.put(Routes.applicationGuildCommands(config.applicationId, config.devGuildId), {
          body: [],
        });
        await rest.put(Routes.applicationGuildCommands(config.applicationId, config.devGuildId), {
          body: commands.map((c) => this.apiPayload(c)),
        });
        logger.info('command-deployer-dev-registered', {
          commandCount: commands.length,
          guildId: config.devGuildId,
          note: 'development: every tier registered to the development guild',
        });
      } else {
        await rest.put(Routes.applicationCommands(config.applicationId), { body: [] });
        if (core.length > 0) {
          await rest.put(Routes.applicationCommands(config.applicationId), {
            body: core.map((c) => c.data),
          });
          logger.info('command-deployer-core-global-registered', {
            commandCount: core.length,
            commands: core.map((c) => c.data.name),
          });
        }

        const guilds = await this.computeGuildScopes({ admin, guildScoped });

        for (const [guildId, guildCommands] of guilds) {
          const guildLabel = guildId === config.devGuildId ? 'dev' : 'guild';
          await rest.put(Routes.applicationGuildCommands(config.applicationId, guildId), {
            body: [],
          });
          await rest.put(Routes.applicationGuildCommands(config.applicationId, guildId), {
            body: guildCommands,
          });
          logger.info(`command-deployer-${guildLabel}-registered`, {
            commandCount: guildCommands.length,
            guildId,
          });
        }

        if (guildScoped.length > 0 && this.deps.enabledGuildResolver === undefined) {
          logger.warn('command-deployer-guild-scope-skip', {
            reason: 'no enabled-guild resolver available; standard/marketplace not registered',
          });
        }
      }
    }

    logger.info('command-deployer-complete', {
      commandCount: commands.length,
      scopes: {
        admin: admin.length,
        core: core.length,
        standardOrMarketplace: guildScoped.length,
      },
    });
  }

  /** The REST payload for a command: admin-tier commands carry a deny-by-default permission. */
  private apiPayload(command: CommandDefinition): unknown {
    return this.tierOf(command) === 'admin'
      ? { ...command.data, default_member_permissions: '0' }
      : command.data;
  }

  private async computeGuildScopes(args: {
    admin: CommandDefinition[];
    guildScoped: CommandDefinition[];
  }): Promise<Map<string, unknown[]>> {
    const { admin, guildScoped } = args;
    const scopes = new Map<string, unknown[]>();

    if (admin.length > 0) {
      if (!this.deps.config.devGuildId) {
        this.deps.logger.warn('command-deployer-admin-skip', {
          reason: 'no development guild configured; admin-tier commands are not deployed',
        });
      } else {
        scopes.set(this.deps.config.devGuildId, [
          ...(scopes.get(this.deps.config.devGuildId) ?? []),
          ...admin.map((c) => ({ ...c.data, default_member_permissions: '0' })),
        ]);
      }
    }

    if (guildScoped.length > 0 && this.deps.enabledGuildResolver) {
      const byModule = new Map<string, CommandDefinition[]>();
      for (const command of guildScoped) {
        const list = byModule.get(command.moduleId) ?? [];
        list.push(command);
        byModule.set(command.moduleId, list);
      }

      for (const [moduleSlug, moduleCommands] of byModule) {
        const guildIds = await this.deps.enabledGuildResolver(moduleSlug);
        for (const guildId of guildIds) {
          const existing = scopes.get(guildId) ?? [];
          scopes.set(guildId, [...existing, ...moduleCommands.map((c) => c.data)]);
        }
      }
    }

    return scopes;
  }

  private tierOf(command: CommandDefinition): ModuleTier {
    const tier = this.deps.registry.tierForCommand(command);
    if (!tier) throw new MissingModuleTierError(command.moduleId);
    return tier;
  }

  async undeploy(): Promise<void> {
    const { logger, config, rest } = this.deps;
    logger.info('command-deployer-undeploy', { note: 'clearing all registered slash commands' });

    if (rest) {
      await rest.put(Routes.applicationCommands(config.applicationId), { body: [] });
      if (config.devGuildId) {
        await rest.put(Routes.applicationGuildCommands(config.applicationId, config.devGuildId), {
          body: [],
        });
      }
    }
  }
}
