import { Routes } from 'discord.js';
import type { CommandRegistry } from './command-registry.js';
import type { CommandDefinition } from './command-registry.js';
import type { Logger } from '../logging/logger.js';
import type { ModuleTier } from '../module-system/tier-rules.js';
import { resolveCommandPayloads } from './bccm-batch-push.js';

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
  /**
   * UR-20261012-063 — the APPLIED renames for a guild: command key -> its current name, from
   * `guild_command_renames` (written when a BCCM rename is pushed).
   *
   * WITHOUT THIS the deployer re-registered the registry's names at every boot and silently REVERTED
   * every rename: a rename applied on a queue window was undone by the next restart, so the operator
   * saw the old name, then the new one, then neither.
   */
  commandRenames?: (guildId: string) => Promise<ReadonlyMap<string, string>>;
  /**
   * The guilds the bot is currently in. The boot deploy clears and re-registers EVERY one of them, so a
   * stale registration — left by an earlier deploy, or by a module that has since been disabled — is
   * REMOVED rather than lingering beside the current set. Without it, only the guilds the scope
   * resolver happens to return are ever touched, and a stale set survives indefinitely.
   */
  guildIds?: () => Promise<readonly string[]>;
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

    // Every guild the bot is in, plus the dev guild. The deploy clears and re-registers all of them.
    const knownGuilds = new Set<string>(
      this.deps.guildIds !== undefined ? await this.deps.guildIds() : [],
    );
    if (config.devGuildId !== '') knownGuilds.add(config.devGuildId);

    if (commands.length === 0) {
      // An EMPTY registry is NOT a reason to skip. Leaving the previous registrations in place is
      // exactly what produces duplicate entries — a stale global set beside a stale guild set — and
      // commands the bot then answers with UNKNOWN_COMMAND. Clear the global set and every known
      // guild, so what Discord offers matches what the bot can actually do.
      logger.warn('command-deployer-empty', {
        reason: 'no commands registered — clearing stale registrations',
        guilds: knownGuilds.size,
      });
      if (rest) {
        await rest.put(Routes.applicationCommands(config.applicationId), { body: [] });
        for (const guildId of knownGuilds) {
          await rest.put(Routes.applicationGuildCommands(config.applicationId, guildId), {
            body: [],
          });
        }
      }
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
        // Clear and re-register EVERY known guild, not only the ones the resolver returned: a guild
        // that no longer has an enabled module must still have its stale set removed.
        for (const guildId of knownGuilds) {
          if (!guilds.has(guildId)) guilds.set(guildId, []);
        }

        for (const [guildId, guildCommands] of guilds) {
          const guildLabel = guildId === config.devGuildId ? 'dev' : 'guild';
          // UR-20261012-063 — register the RENAMED set, not the registry's names. The applied renames
          // live in `guild_command_renames`; reusing `resolveCommandPayloads` with a source map means a
          // renamed command keeps its real definition here exactly as it does on the BCCM push.
          const renamed = await (this.deps.commandRenames?.(guildId) ?? new Map<string, string>());
          const payloads =
            renamed.size === 0
              ? guildCommands
              : resolveCommandPayloads(
                  guildCommands.map(
                    (command) =>
                      renamed.get((command as { name?: string }).name ?? '') ??
                      (command as { name?: string }).name ??
                      '',
                  ),
                  registry,
                  (name, reason) =>
                    logger.warn(`command-deployer-command-skipped: ${name} (${reason})`, {
                      guildId,
                      name,
                      reason,
                    }),
                  new Map([...renamed].map(([key, next]) => [next, key])),
                );
          await rest.put(Routes.applicationGuildCommands(config.applicationId, guildId), {
            body: [],
          });
          await rest.put(Routes.applicationGuildCommands(config.applicationId, guildId), {
            body: payloads,
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

  /**
   * UR-20261011-023 — register ONE guild's commands. Called when a guild joins, so a new guild does
   * not wait for the next boot: the boot deploy only covers the guilds known at that moment, and a
   * guild joining afterwards would otherwise have no commands at all.
   */
  async deployForGuild(guildId: string): Promise<void> {
    const { registry, logger, config, rest } = this.deps;
    if (rest === undefined) return;
    const commands = registry.all();
    if (commands.length === 0) return;

    // Development registers EVERY command to the development guild, and nothing elsewhere.
    if (config.nodeEnv === 'development') {
      if (guildId !== config.devGuildId) return;
      await rest.put(Routes.applicationGuildCommands(config.applicationId, guildId), { body: [] });
      await rest.put(Routes.applicationGuildCommands(config.applicationId, guildId), {
        body: commands.map((c) => this.apiPayload(c)),
      });
      logger.info('command-deployer-dev-registered', { commandCount: commands.length, guildId });
      return;
    }

    const admin = commands.filter((c) => this.tierOf(c) === 'admin');
    const guildScoped = commands.filter((c) => isGuildScopedTier(this.tierOf(c)));
    const desired: unknown[] = [];
    if (guildId === config.devGuildId) {
      desired.push(...admin.map((c) => ({ ...c.data, default_member_permissions: '0' })));
    }
    if (this.deps.enabledGuildResolver !== undefined) {
      const byModule = new Map<string, CommandDefinition[]>();
      for (const command of guildScoped) {
        const list = byModule.get(command.moduleId) ?? [];
        list.push(command);
        byModule.set(command.moduleId, list);
      }
      for (const [moduleSlug, moduleCommands] of byModule) {
        const guildIds = await this.deps.enabledGuildResolver(moduleSlug);
        if (guildIds.includes(guildId)) desired.push(...moduleCommands.map((c) => c.data));
      }
    }
    await rest.put(Routes.applicationGuildCommands(config.applicationId, guildId), { body: [] });
    await rest.put(Routes.applicationGuildCommands(config.applicationId, guildId), {
      body: desired,
    });
    logger.info('command-deployer-guild-registered', { guildId, commandCount: desired.length });
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
