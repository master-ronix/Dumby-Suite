import { ApplicationCommandType } from 'discord.js';
import { ConfigurationError } from '../../errors/taxonomy.js';
import { CommandKeyCodec } from './CommandKeyCodec.js';
import type { CommandRegistry } from './CommandRegistry.js';
import type { GuildModuleStatePort, PersonaBindingRepositoryPort } from './ports.js';
import {
  DISCORD_GUILD_COMMAND_CEILING,
  MAIN_IDENTITY_ID,
  type CommandDeploymentEnvironment,
  type CommandJson,
  type DeploymentPlan,
  type DeploymentTarget,
  type IdentityId,
  type RegisteredCommand,
  type Snowflake,
} from './types.js';

export interface CommandDeploymentPlannerOptions {
  environment: CommandDeploymentEnvironment;
  registry: CommandRegistry;
  guildModuleState: GuildModuleStatePort;
  personaBindings?: PersonaBindingRepositoryPort;
  knownGuildIds?: () => Promise<Snowflake[]>;
  installedMarketplaceGuildIds?: (moduleSlug: string) => Promise<Snowflake[]>;
  dynamicGuildCommands?: () => Promise<CommandJson[]>;
}

export class CommandDeploymentPlanner {
  constructor(private readonly options: CommandDeploymentPlannerOptions) {}

  async plan(): Promise<DeploymentPlan> {
    const env = this.options.environment;
    const byTarget = new Map<string, DeploymentTarget>();
    const rejected: DeploymentPlan['rejected'] = [];

    for (const entry of this.options.registry.all()) {
      const targets = await this.targetsFor(entry);
      for (const target of targets) {
        const command = this.toCommandJson(entry, target.scope, target.guildId);
        const key = this.targetKey(target.identityId, target.scope, target.guildId);
        const current: DeploymentTarget = byTarget.get(key) ?? {
          identityId: target.identityId,
          scope: target.scope,
          commands: [],
        };
        if (target.guildId !== undefined) current.guildId = target.guildId;
        current.commands.push(command);
        byTarget.set(key, current);
      }
    }

    for (const dynamic of await this.options.dynamicGuildCommands?.() ?? []) {
      if (dynamic.guildId === undefined) {
        throw new ConfigurationError('Dynamic commands must be guild scoped');
      }
      const key = this.targetKey(dynamic.identityId, 'guild', dynamic.guildId);
      const current: DeploymentTarget = byTarget.get(key) ?? {
        identityId: dynamic.identityId,
        scope: 'guild',
        guildId: dynamic.guildId,
        commands: [],
      };
      current.commands.push(dynamic);
      byTarget.set(key, current);
    }

    const targets: DeploymentTarget[] = [];
    for (const target of byTarget.values()) {
      const unique = this.dedupe(target.commands);
      const concreteTarget = { ...target, commands: unique };
      if (
        concreteTarget.scope !== 'global' &&
        concreteTarget.commands.length > DISCORD_GUILD_COMMAND_CEILING
      ) {
        if (concreteTarget.guildId !== undefined) {
          rejected.push({
            identityId: concreteTarget.identityId,
            guildId: concreteTarget.guildId,
            projectedCount: concreteTarget.commands.length,
            reason: 'Discord 100-command ceiling would be exceeded',
          });
        } else {
          rejected.push({
            identityId: concreteTarget.identityId,
            projectedCount: concreteTarget.commands.length,
            reason: 'Discord 100-command ceiling would be exceeded',
          });
        }
        continue;
      }
      targets.push(concreteTarget);
    }

    return { targets, rejected };
  }

  private async targetsFor(entry: RegisteredCommand): Promise<
    Array<{
      identityId: IdentityId;
      scope: 'global' | 'guild' | 'development-guild';
      guildId?: Snowflake | undefined;
    }>
  > {
    const meta = entry.metadata;
    const env = this.options.environment;
    const isDevelopment = env.nodeEnv === 'development' || env.nodeEnv === 'test';

    if (isDevelopment) {
      return [{ identityId: meta.identityId, scope: 'development-guild', guildId: env.devGuildId }];
    }

    if (meta.tier === 'admin') {
      return [{ identityId: meta.identityId, scope: 'development-guild', guildId: env.devGuildId }];
    }

    if (meta.tier === 'core' || meta.tier === 'standard') {
      return [{ identityId: meta.identityId, scope: 'global' }];
    }

    const guildIds =
      (await this.options.installedMarketplaceGuildIds?.(meta.moduleSlug)) ??
      (await this.options.guildModuleState.listGuildsWhereActive(meta.moduleSlug, meta.tier));

    const targets: Array<{ identityId: IdentityId; scope: 'guild'; guildId: Snowflake }> = [];
    for (const guildId of guildIds) {
      const identityId = await this.identityFor(guildId, meta.moduleSlug);
      targets.push({ identityId, scope: 'guild', guildId });
    }
    return targets;
  }

  private async identityFor(guildId: Snowflake, moduleSlug: string): Promise<IdentityId> {
    const binding = await this.options.personaBindings?.getBinding(guildId, moduleSlug);
    return binding ?? MAIN_IDENTITY_ID;
  }

  private toCommandJson(
    entry: RegisteredCommand,
    scope: 'global' | 'guild' | 'development-guild',
    guildId?: Snowflake,
  ): CommandJson {
    const json = entry.command.data.toJSON();
    const body = {
      ...json,
      name_localizations: entry.metadata.localization.name,
      description_localizations:
        (json.type ?? ApplicationCommandType.ChatInput) === ApplicationCommandType.ChatInput
          ? entry.metadata.localization.description
          : undefined,
      nsfw: entry.metadata.nsfw || undefined,
      default_member_permissions:
        entry.metadata.tier === 'admin'
          ? '0'
          : entry.metadata.defaultMemberPermissions?.toString(),
    };

    const commandJson: CommandJson = {
      key: entry.metadata.commandKey,
      moduleSlug: entry.metadata.moduleSlug,
      tier: entry.metadata.tier,
      identityId: entry.metadata.identityId,
      scope,
      body: JSON.parse(JSON.stringify(body)) as CommandJson['body'],
    };
    if (guildId !== undefined) commandJson.guildId = guildId;
    return commandJson;
  }

  private dedupe(commands: CommandJson[]): CommandJson[] {
    const seen = new Set<string>();
    const out: CommandJson[] = [];
    for (const command of commands) {
      const nameKey = CommandKeyCodec.decode(command.key);
      const discriminator = `${nameKey.type}:${command.body.name}`;
      if (seen.has(discriminator)) continue;
      seen.add(discriminator);
      out.push(command);
    }
    return out.sort((a, b) => a.key.localeCompare(b.key));
  }

  private targetKey(identityId: IdentityId, scope: string, guildId?: Snowflake): string {
    return `${identityId}:${scope}:${guildId ?? 'global'}`;
  }
}
