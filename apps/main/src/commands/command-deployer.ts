/**
 * Command deployer — publishes slash command definitions to Discord's
 * API at Stage 16 (CLIENT_READY) inventory time (Cluster: Frame).
 *
 * Deployment scope is tier-based (directive.md Rule 20.3, blueprint.md
 * §13.2 / §17.4):
 *
 *   admin         → registered to the DEVELOPMENT GUILD ONLY, with
 *                   default_member_permissions: 0 (Layer 1 of the
 *                   Admin-tier defense, §13.6). Never global, never in
 *                   any other guild.
 *   core          → registered GLOBALLY (application commands). Present
 *                   in every guild unconditionally.
 *   standard /
 *   marketplace   → registered per-guild, only for guilds whose
 *                   guild_module_states row marks the module enabled.
 *
 * Startup never trusts a prior run (Rule 17.4 / 20.4): global scope and
 * each managed guild scope are cleared and re-registered from the set
 * computed fresh from the currently-loaded modules.
 */
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
  /**
   * Resolves the guild IDs where a standard/marketplace module is enabled
   * (guild_module_states, §13.4). Injected by bootstrap; absent in
   * mock/test mode, where per-guild registration is logged but skipped.
   */
  enabledGuildResolver?: (moduleSlug: string) => Promise<readonly string[]>;
}

const isGuildScopedTier = (tier: ModuleTier): boolean =>
  tier === 'standard' || tier === 'marketplace';

class MissingModuleTierError extends Error {
  constructor(moduleId: string) {
    super(`No manifest tier registered for module "${moduleId}"`);
    this.name = 'MissingModuleTierError';
  }
}

export class CommandDeployer {
  constructor(private readonly deps: CommandDeployerDeps) {}

  /**
   * Deploy all registered commands to Discord using tier-based scoping.
   * When `rest` is absent (mock/test mode), this only logs the inventory.
   */
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
      // ── Global scope: Core-tier commands, delete-then-reregister ──────
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

      // ── Per-guild scopes ──────────────────────────────────────────────
      const guilds = await this.computeGuildScopes({ admin, guildScoped });

      for (const [guildId, guildCommands] of guilds) {
        const guildLabel = guildId === config.devGuildId ? 'dev' : 'guild';
        // Delete-then-reregister per managed guild scope (Rule 20.4).
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

    logger.info('command-deployer-complete', {
      commandCount: commands.length,
      scopes: {
        admin: admin.length,
        core: core.length,
        standardOrMarketplace: guildScoped.length,
      },
    });
  }

  /**
   * Build the per-guild command map:
   *  - Admin-tier commands → the development guild only (never global,
   *    never any other guild), with default_member_permissions: 0n (§13.6
   *    Layer 1 — hidden from every member's UI).
   *  - Standard/Marketplace commands → every guild where the owning
   *    module is enabled in guild_module_states.
   */
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
