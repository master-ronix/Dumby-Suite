import { ConfigurationError } from '../../errors/taxonomy.js';
import { CommandKeyCodec } from './CommandKeyCodec.js';
import type { CommandRegistry } from './CommandRegistry.js';
import type { AuditLogPort } from './ports.js';
import type { CommandCountProjectionService } from './CommandCountProjectionService.js';
import type { GuildCommandChangeQueue } from './GuildCommandChangeQueue.js';
import type { IdentityId, Snowflake } from './types.js';

const RESERVED_NATIVE_COMMANDS = new Set(['help', 'settings', 'permissions', 'applications']);

export class CommandCosmeticsService {
  constructor(
    private readonly registry: CommandRegistry,
    private readonly queue: GuildCommandChangeQueue,
    private readonly projection: CommandCountProjectionService,
    private readonly audit?: AuditLogPort,
  ) {}

  async rename(input: {
    guildId: Snowflake;
    identityId?: IdentityId | null;
    commandKey: string;
    targetName: string;
    actorId: string;
  }): Promise<unknown> {
    const entry = this.mustResolveEnabled(input.commandKey);
    this.assertCosmeticAllowed(input.targetName);
    const projection = await this.projection.project(input.guildId, input.identityId ?? null, {
      changeType: 'rename',
      commandKey: input.commandKey,
      moduleSlug: entry.metadata.moduleSlug,
      targetName: input.targetName,
    });
    if (projection.wouldExceedCeiling) {
      throw new ConfigurationError(projection.reason, { projection });
    }
    const queued = await this.queue.queue({
      guildId: input.guildId,
      identityId: input.identityId ?? null,
      changeType: 'rename',
      commandKey: input.commandKey,
      moduleSlug: entry.metadata.moduleSlug,
      targetName: input.targetName,
      actorId: input.actorId,
    });
    await this.audit?.write({
      source: 'COMMANDS',
      actorId: input.actorId,
      action: 'bccm.rename.requested',
      targetType: 'command',
      targetId: input.commandKey,
      beforeState: { commandKey: input.commandKey },
      afterState: queued,
      timestamp: new Date(),
    });
    return queued;
  }

  async addAlias(input: {
    guildId: Snowflake;
    identityId?: IdentityId | null;
    commandKey: string;
    aliasName: string;
    actorId: string;
  }): Promise<unknown> {
    const entry = this.mustResolveEnabled(input.commandKey);
    this.assertCosmeticAllowed(input.aliasName);
    const projection = await this.projection.project(input.guildId, input.identityId ?? null, {
      changeType: 'alias_add',
      commandKey: input.commandKey,
      moduleSlug: entry.metadata.moduleSlug,
      aliasName: input.aliasName,
    });
    if (projection.wouldExceedCeiling) {
      throw new ConfigurationError(projection.reason, { projection });
    }
    const queued = await this.queue.queue({
      guildId: input.guildId,
      identityId: input.identityId ?? null,
      changeType: 'alias_add',
      commandKey: input.commandKey,
      moduleSlug: entry.metadata.moduleSlug,
      aliasName: input.aliasName,
      actorId: input.actorId,
    });
    await this.audit?.write({
      source: 'COMMANDS',
      actorId: input.actorId,
      action: 'bccm.alias_add.requested',
      targetType: 'command',
      targetId: input.commandKey,
      beforeState: { commandKey: input.commandKey },
      afterState: queued,
      timestamp: new Date(),
    });
    return queued;
  }

  async removeAlias(input: {
    guildId: Snowflake;
    identityId?: IdentityId | null;
    commandKey: string;
    aliasName: string;
    actorId: string;
  }): Promise<unknown> {
    const entry = this.mustResolveEnabled(input.commandKey);
    this.assertCosmeticAllowed(input.aliasName);
    const projection = await this.projection.project(input.guildId, input.identityId ?? null, {
      changeType: 'alias_remove',
      commandKey: input.commandKey,
      moduleSlug: entry.metadata.moduleSlug,
      aliasName: input.aliasName,
    });
    if (projection.wouldExceedCeiling) {
      throw new ConfigurationError(projection.reason, { projection });
    }
    const queued = await this.queue.queue({
      guildId: input.guildId,
      identityId: input.identityId ?? null,
      changeType: 'alias_remove',
      commandKey: input.commandKey,
      moduleSlug: entry.metadata.moduleSlug,
      aliasName: input.aliasName,
      actorId: input.actorId,
    });
    await this.audit?.write({
      source: 'COMMANDS',
      actorId: input.actorId,
      action: 'bccm.alias_remove.requested',
      targetType: 'command',
      targetId: input.commandKey,
      beforeState: { commandKey: input.commandKey, aliasName: input.aliasName },
      afterState: queued,
      timestamp: new Date(),
    });
    return queued;
  }

  private mustResolveEnabled(commandKey: string) {
    const entry = this.registry.resolve(commandKey);
    if (entry === undefined) throw new ConfigurationError('Cannot customize unknown command', { commandKey });
    if (entry.metadata.tier === 'admin') {
      throw new ConfigurationError('Admin commands are not BCCM-customizable', { commandKey });
    }
    return entry;
  }

  private assertCosmeticAllowed(name: string): void {
    CommandKeyCodec.assertNoPrefixLikeName(name);
    if (RESERVED_NATIVE_COMMANDS.has(name.toLowerCase())) {
      throw new ConfigurationError('Alias conflicts with a reserved native Discord command', { name });
    }
  }
}
