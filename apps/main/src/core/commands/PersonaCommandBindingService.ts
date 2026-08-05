import { CommandCeilingExceededError } from '../../errors/taxonomy.js';
import type { AuditLogPort, PersonaBindingRepositoryPort } from './ports.js';
import type { CommandCountProjectionService } from './CommandCountProjectionService.js';
import { DISCORD_GUILD_COMMAND_CEILING, MAIN_IDENTITY_ID, type IdentityId, type Snowflake } from './types.js';

export class PersonaCommandBindingService {
  constructor(
    private readonly repository: PersonaBindingRepositoryPort,
    private readonly projection: CommandCountProjectionService,
    private readonly audit?: AuditLogPort,
  ) {}

  async identityFor(guildId: Snowflake, moduleSlug: string): Promise<IdentityId> {
    return (await this.repository.getBinding(guildId, moduleSlug)) ?? MAIN_IDENTITY_ID;
  }

  async bind(input: {
    guildId: Snowflake;
    moduleSlug: string;
    identityId: IdentityId;
    actorId: string;
  }): Promise<void> {
    const projected = await this.projection.project(input.guildId, input.identityId);
    if (projected.projectedCount > DISCORD_GUILD_COMMAND_CEILING) {
      throw new CommandCeilingExceededError(projected.projectedCount, DISCORD_GUILD_COMMAND_CEILING);
    }
    const before = await this.repository.getBinding(input.guildId, input.moduleSlug);
    await this.repository.setBinding(input.guildId, input.moduleSlug, input.identityId, input.actorId);
    await this.audit?.write({
      source: 'COMMANDS',
      actorId: input.actorId,
      action: 'persona.binding.changed',
      targetType: 'module',
      targetId: input.moduleSlug,
      beforeState: { identityId: before ?? MAIN_IDENTITY_ID },
      afterState: { identityId: input.identityId },
      timestamp: new Date(),
    });
  }

  async assertDispatchAllowed(identityId: IdentityId): Promise<boolean> {
    return !(await this.repository.isSuspended(identityId));
  }
}
