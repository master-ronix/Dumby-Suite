import { CommandCeilingExceededError, ConfigurationError } from '../../errors/taxonomy.js';
import type {
  AuditLogPort,
  ClockPort,
  CommandChangeQueueRepositoryPort,
  EventBusPort,
  IdGeneratorPort,
  MetricsPort,
} from './ports.js';
import type { CommandCountProjectionService } from './CommandCountProjectionService.js';
import type {
  CommandChangeEntry,
  CommandChangeType,
  IdentityId,
  ProjectionRequestChange,
  Snowflake,
} from './types.js';

const PUSH_DELAY_MS = 13 * 60 * 60 * 1000;
const OUTER_CEILING_MS = 24 * 60 * 60 * 1000;

export class GuildCommandChangeQueue {
  constructor(
    private readonly repository: CommandChangeQueueRepositoryPort,
    private readonly projection: CommandCountProjectionService,
    private readonly clock: ClockPort,
    private readonly ids: IdGeneratorPort,
    private readonly events?: EventBusPort,
    private readonly audit?: AuditLogPort,
    private readonly metrics?: MetricsPort,
  ) {}

  async queue(change: {
    guildId: Snowflake;
    identityId?: IdentityId | null;
    changeType: CommandChangeType;
    commandKey: string;
    moduleSlug: string;
    targetName?: string;
    aliasName?: string;
    actorId: string;
    reason?: string;
  }): Promise<CommandChangeEntry> {
    const request: ProjectionRequestChange = {
      changeType: change.changeType,
      commandKey: change.commandKey,
      moduleSlug: change.moduleSlug,
    };
    if (change.targetName !== undefined) request.targetName = change.targetName;
    if (change.aliasName !== undefined) request.aliasName = change.aliasName;
    const projected = await this.projection.project(change.guildId, change.identityId ?? null, request);
    if (projected.wouldExceedCeiling) {
      throw new CommandCeilingExceededError(projected.projectedCount, 100);
    }

    const now = this.clock.now();
    const open = await this.repository.findOpenBatch(change.guildId, change.identityId ?? null, now);
    const anchor = open[0]?.batchAnchorT0 ?? now;
    const entry: CommandChangeEntry = {
      id: this.ids.uuid(),
      guildId: change.guildId,
      identityId: change.identityId ?? null,
      changeType: change.changeType,
      commandKey: change.commandKey,
      moduleSlug: change.moduleSlug,
      targetName: change.targetName ?? null,
      aliasName: change.aliasName ?? null,
      status: 'pending',
      batchAnchorT0: anchor,
      scheduledPushAt: new Date(anchor.getTime() + PUSH_DELAY_MS),
      outerCeilingAt: new Date(anchor.getTime() + OUTER_CEILING_MS),
      projectionSnapshot: projected,
      invalidatedAt: null,
      failureReason: null,
      createdAt: now,
      updatedAt: now,
      createdBy: change.actorId,
      updatedBy: change.actorId,
    };
    const inserted = await this.repository.insert(entry);
    this.events?.emit('guild.command.change.queued', { entry: inserted });
    this.metrics?.increment('dumby_command_change_queue_depth', { status: inserted.status });
    await this.audit?.write({
      source: 'COMMANDS',
      actorId: change.actorId,
      action: `guild_command_change.${change.changeType}.queued`,
      targetType: 'guild_command_change',
      targetId: inserted.id,
      beforeState: null,
      afterState: inserted,
      reason: change.reason,
      timestamp: now,
    });
    return inserted;
  }

  async revoke(id: string, actorId: string, reason?: string): Promise<CommandChangeEntry> {
    const entries = await this.repository.findDueBatches(new Date(8_640_000_000_000));
    const entry = entries.flat().find((candidate) => candidate.id === id);
    if (entry === undefined) throw new ConfigurationError('Queued command change not found', { id });
    if (entry.status === 'pushing' || entry.status === 'pushed') {
      throw new ConfigurationError('Cannot revoke a command change after push started', { id });
    }
    const now = this.clock.now();
    const updated = await this.repository.update({
      ...entry,
      status: 'invalidated',
      invalidatedAt: now,
      updatedAt: now,
      updatedBy: actorId,
    });
    this.events?.emit('guild.command.change.invalidated', { ids: [id], reason: reason ?? 'revoked' });
    return updated;
  }

  async invalidateModuleDeletion(moduleSlug: string, reason: string): Promise<CommandChangeEntry[]> {
    const invalidated = await this.repository.invalidatePendingDeletion(
      moduleSlug,
      reason,
      this.clock.now(),
    );
    if (invalidated.length > 0) {
      this.events?.emit('guild.command.change.invalidated', {
        ids: invalidated.map((entry) => entry.id),
        reason,
      });
    }
    return invalidated;
  }
}
