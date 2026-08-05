import type { CommandChangeQueueRepositoryPort, DiscordApplicationCommandRestPort, MetricsPort } from './ports.js';
import {
  DISCORD_GUILD_COMMAND_CEILING,
  type CommandChangeEntry,
  type CommandCountProjection,
  type IdentityId,
  type ProjectionRequestChange,
  type Snowflake,
} from './types.js';

export class CommandCountProjectionService {
  constructor(
    private readonly rest: DiscordApplicationCommandRestPort,
    private readonly queue: CommandChangeQueueRepositoryPort,
    private readonly metrics?: MetricsPort,
  ) {}

  async project(
    guildId: Snowflake,
    identityId: IdentityId | null,
    requestedChange?: ProjectionRequestChange,
  ): Promise<CommandCountProjection> {
    const effectiveIdentity = identityId ?? 'main';
    const current = await this.rest.listGuildCommands(effectiveIdentity, guildId);
    const pending = await this.queue.findPendingForGuildIdentity(guildId, identityId);
    const allChanges = requestedChange === undefined ? pending : [...pending, this.asPending(requestedChange)];
    const currentKeys = new Set(current.map((command) => command.key));
    let projectedCount = currentKeys.size;
    const conflicts: CommandChangeEntry[] = [];

    for (const entry of allChanges) {
      if (entry.status === 'invalidated' || entry.status === 'pushed') continue;
      if (entry.changeType === 'module_disable_deletion' || entry.changeType === 'alias_remove') {
        if (currentKeys.has(entry.commandKey)) {
          projectedCount -= 1;
          currentKeys.delete(entry.commandKey);
        }
        continue;
      }
      const newKey = entry.changeType === 'rename' ? (entry.targetName ?? entry.commandKey) : (entry.aliasName ?? entry.commandKey);
      if (currentKeys.has(newKey)) {
        conflicts.push(entry);
      } else {
        currentKeys.add(newKey);
        projectedCount += entry.changeType === 'rename' ? 0 : 1;
      }
    }

    const result = {
      currentCount: current.length,
      projectedCount,
      wouldExceedCeiling: projectedCount > DISCORD_GUILD_COMMAND_CEILING,
      conflictingEntries: conflicts,
      reason:
        projectedCount > DISCORD_GUILD_COMMAND_CEILING
          ? `Projected command count ${projectedCount} exceeds ${DISCORD_GUILD_COMMAND_CEILING}`
          : conflicts.length > 0
            ? 'Projected command change conflicts with an existing command'
            : 'Projection accepted',
    };
    if (result.wouldExceedCeiling) {
      this.metrics?.increment('dumby_command_projection_rejections_total');
    }
    return result;
  }

  private asPending(change: ProjectionRequestChange): CommandChangeEntry {
    const now = new Date(0);
    return {
      id: 'projection-request',
      guildId: '',
      identityId: null,
      changeType: change.changeType,
      commandKey: change.commandKey,
      moduleSlug: change.moduleSlug,
      targetName: change.targetName ?? null,
      aliasName: change.aliasName ?? null,
      status: 'pending',
      batchAnchorT0: now,
      scheduledPushAt: now,
      outerCeilingAt: now,
      projectionSnapshot: null,
      invalidatedAt: null,
      failureReason: null,
      createdAt: now,
      updatedAt: now,
      createdBy: 'projection',
      updatedBy: 'projection',
    };
  }
}
