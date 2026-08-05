import type {
  AuditLogPort,
  ClockPort,
  CommandCollisionRepositoryPort,
  CommandOverrideRepositoryPort,
  EventBusPort,
  GuildModuleStatePort,
  IdGeneratorPort,
  MetricsPort,
  TracerPort,
} from './ports.js';
import type { CollisionCandidate, CollisionDetectionResult, CommandTier, IdentityId, Snowflake } from './types.js';

export class CommandCollisionResolver {
  constructor(
    private readonly collisions: CommandCollisionRepositoryPort,
    private readonly overrides: CommandOverrideRepositoryPort,
    private readonly moduleState: GuildModuleStatePort,
    private readonly ids: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly events?: EventBusPort,
    private readonly audit?: AuditLogPort,
    private readonly metrics?: MetricsPort,
    private readonly tracer?: TracerPort,
  ) {}

  detect(newModuleSlug: string, newCommands: CollisionCandidate[], active: CollisionCandidate[]): CollisionDetectionResult {
    const activeByKey = new Map(active.map((candidate) => [candidate.commandKey, candidate.moduleSlug]));
    const collisions = newCommands
      .map((candidate) => ({
        commandKey: candidate.commandKey,
        existingModuleSlug: activeByKey.get(candidate.commandKey),
        newModuleSlug,
      }))
      .filter(
        (collision): collision is { commandKey: string; existingModuleSlug: string; newModuleSlug: string } =>
          collision.existingModuleSlug !== undefined && collision.existingModuleSlug !== newModuleSlug,
      );
    return { hasCollision: collisions.length > 0, collisions };
  }

  async pauseForCollisions(input: {
    guildId: Snowflake;
    identityId?: IdentityId | null;
    newModuleSlug: string;
    tier: CommandTier;
    newCommands: CollisionCandidate[];
    activeCommands: CollisionCandidate[];
    actorId: string;
  }): Promise<CollisionDetectionResult> {
    const result = this.detect(input.newModuleSlug, input.newCommands, input.activeCommands);
    if (!result.hasCollision) return result;
    await this.moduleState.setStatus(
      input.guildId,
      input.newModuleSlug,
      input.tier,
      'install_pending_resolution',
      input.actorId,
    );
    const now = this.clock.now();
    for (const collision of result.collisions) {
      const row = await this.collisions.create({
        id: this.ids.uuid(),
        guildId: input.guildId,
        identityId: input.identityId ?? null,
        commandKey: collision.commandKey,
        status: 'unresolved',
        selectedModuleSlug: null,
        createdAt: now,
        updatedAt: now,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      });
      this.events?.emit('guild.command.collision.detected', { collision: row });
      this.metrics?.increment('dumby_command_collision_total', { status: 'unresolved' });
    }
    return result;
  }

  async resolve(input: {
    guildId: Snowflake;
    identityId?: IdentityId | null;
    commandKey: string;
    winningModuleSlug: string;
    losingModuleSlug: string;
    tier: CommandTier;
    actorId: string;
  }): Promise<void> {
    const span = this.tracer?.startSpan('command.collision.resolve');
    try {
      const now = this.clock.now();
      const existing = await this.collisions.findUnresolved(
        input.guildId,
        input.identityId ?? null,
        input.commandKey,
      );
      const collision =
        existing ??
        (await this.collisions.create({
          id: this.ids.uuid(),
          guildId: input.guildId,
          identityId: input.identityId ?? null,
          commandKey: input.commandKey,
          status: 'unresolved',
          selectedModuleSlug: null,
          createdAt: now,
          updatedAt: now,
          createdBy: input.actorId,
          updatedBy: input.actorId,
        }));
      const resolved = await this.collisions.update({
        ...collision,
        status: 'resolved',
        selectedModuleSlug: input.winningModuleSlug,
        updatedAt: now,
        updatedBy: input.actorId,
      });
      const override = await this.overrides.upsert({
        id: this.ids.uuid(),
        guildId: input.guildId,
        identityId: input.identityId ?? null,
        commandKey: input.commandKey,
        winningModuleSlug: input.winningModuleSlug,
        losingModuleSlug: input.losingModuleSlug,
        collisionId: resolved.id,
        createdAt: now,
        updatedAt: now,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      });
      await this.overrides.invalidateCache(input.guildId, input.identityId ?? null);
      await this.moduleState.setStatus(input.guildId, input.losingModuleSlug, input.tier, 'active', input.actorId);
      this.events?.emit('guild.command.collision.resolved', { collision: resolved, override });
      await this.audit?.write({
        source: 'COMMANDS',
        actorId: input.actorId,
        action: 'guild_command_collision.resolved',
        targetType: 'command_collision',
        targetId: resolved.id,
        beforeState: collision,
        afterState: { resolved, override },
        timestamp: now,
      });
    } catch (error) {
      span?.recordException(error);
      throw error;
    } finally {
      span?.end();
    }
  }

  async autoReassignOnWinnerDisabled(input: {
    guildId: Snowflake;
    identityId?: IdentityId | null;
    commandKey: string;
    disabledModuleSlug: string;
    actorId: string;
  }): Promise<void> {
    const existing = await this.overrides.findByCommandKey(
      input.guildId,
      input.identityId ?? null,
      input.commandKey,
    );
    if (existing === null || existing.winningModuleSlug !== input.disabledModuleSlug) return;
    const now = this.clock.now();
    const reassigned = await this.overrides.upsert({
      ...existing,
      winningModuleSlug: existing.losingModuleSlug,
      losingModuleSlug: existing.winningModuleSlug,
      updatedAt: now,
      updatedBy: input.actorId,
    });
    await this.overrides.invalidateCache(input.guildId, input.identityId ?? null);
    this.events?.emit('guild.command.collision.auto_reassigned', { override: reassigned });
    this.metrics?.increment('dumby_command_collision_total', { status: 'auto_reassigned' });
  }
}
