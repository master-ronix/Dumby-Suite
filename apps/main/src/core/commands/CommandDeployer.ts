import type { CommandDeploymentPlanner } from './CommandDeploymentPlanner.js';
import type {
  DiscordApplicationCommandRestPort,
  EventBusPort,
  LoggerPort,
  MetricsPort,
  TracerPort,
} from './ports.js';
import type { CommandJson, DeploymentTarget, IdentityId, Snowflake } from './types.js';

export interface CommandDeployerOptions {
  planner: CommandDeploymentPlanner;
  rest: DiscordApplicationCommandRestPort;
  logger: LoggerPort;
  events?: EventBusPort;
  metrics?: MetricsPort;
  tracer?: TracerPort;
}

export interface DeploymentResult {
  targets: Array<{
    identityId: IdentityId;
    guildId?: Snowflake;
    scope: string;
    changed: boolean;
    commandCount: number;
  }>;
  rejected: number;
}

export class CommandDeployer {
  constructor(private readonly options: CommandDeployerOptions) {}

  async deployAll(): Promise<DeploymentResult> {
    const plan = await this.options.planner.plan();
    const targets: DeploymentResult['targets'] = [];

    for (const target of plan.targets) {
      targets.push(await this.reconcile(target));
    }

    return { targets, rejected: plan.rejected.length };
  }

  async reconcile(target: DeploymentTarget): Promise<DeploymentResult['targets'][number]> {
    const labels = {
      scope: target.scope,
      identityId: target.identityId,
      ...(target.guildId !== undefined ? { guildId: target.guildId } : {}),
    };
    const span = this.options.tracer?.startSpan('command.deployment.reconcile', labels);
    const started = Date.now();
    this.options.events?.emit('guild.command.deployment.started', labels);
    this.options.logger.info('command-deployment-started', {
      ...labels,
      commandCount: target.commands.length,
    });

    try {
      const current =
        target.scope === 'global'
          ? await this.options.rest.listGlobalCommands(target.identityId)
          : await this.options.rest.listGuildCommands(target.identityId, target.guildId ?? '');
      const changed = !this.equalCommandSets(current, target.commands);
      if (changed) {
        if (target.scope === 'global') {
          await this.options.rest.bulkOverwriteGlobalCommands(target.identityId, target.commands);
        } else {
          await this.options.rest.bulkOverwriteGuildCommands(
            target.identityId,
            target.guildId ?? '',
            target.commands,
          );
        }
      }

      this.options.metrics?.increment('dumby_command_deployment_total', {
        scope: target.scope,
        status: changed ? 'changed' : 'unchanged',
      });
      this.options.metrics?.observe(
        'dumby_command_deployment_duration_seconds',
        (Date.now() - started) / 1000,
        { scope: target.scope },
      );
      this.options.events?.emit('guild.command.deployment.completed', {
        ...labels,
        commandCount: target.commands.length,
        changed,
      });
      this.options.logger.info('command-deployment-completed', {
        ...labels,
        changed,
        commandCount: target.commands.length,
      });
      span?.setAttribute('changed', changed);
      const result = {
        identityId: target.identityId,
        scope: target.scope,
        changed,
        commandCount: target.commands.length,
      };
      return target.guildId !== undefined ? { ...result, guildId: target.guildId } : result;
    } catch (error) {
      span?.recordException(error);
      const reason = error instanceof Error ? error.message : String(error);
      this.options.metrics?.increment('dumby_command_deployment_total', {
        scope: target.scope,
        status: 'failed',
      });
      this.options.events?.emit('guild.command.deployment.failed', { ...labels, reason });
      this.options.logger.error('command-deployment-failed', { ...labels, reason });
      throw error;
    } finally {
      span?.end();
    }
  }

  private equalCommandSets(current: CommandJson[], desired: CommandJson[]): boolean {
    return this.stable(current) === this.stable(desired);
  }

  private stable(commands: CommandJson[]): string {
    return JSON.stringify(
      commands
        .map((command) => ({
          key: command.key,
          body: command.body,
          moduleSlug: command.moduleSlug,
          tier: command.tier,
        }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    );
  }
}
