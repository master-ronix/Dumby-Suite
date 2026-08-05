import { PermissionDeniedError } from '../../errors/taxonomy.js';
import type { AuditLogPort } from './ports.js';
import type { RegisteredCommand, SupportedDispatchInteraction } from './types.js';

export interface CommandRestrictionGuardOptions {
  ownerIds: readonly string[];
  devGuildId: string;
  audit?: AuditLogPort;
}

export interface RestrictionDecision {
  allowed: boolean;
  silent: boolean;
  reason?: string;
}

export class CommandRestrictionGuard {
  constructor(private readonly options: CommandRestrictionGuardOptions) {}

  async check(interaction: SupportedDispatchInteraction, command: RegisteredCommand): Promise<RestrictionDecision> {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const isOwner = this.options.ownerIds.includes(userId);
    const isAdmin = command.metadata.tier === 'admin';

    if (command.metadata.guildOnly && guildId === null && !isAdmin) {
      return { allowed: false, silent: false, reason: 'GUILD_ONLY' };
    }

    if (!isAdmin && command.metadata.guildOnly === false) {
      return { allowed: false, silent: false, reason: 'NON_ADMIN_DM_FORBIDDEN' };
    }

    if (isAdmin) {
      const validContext = guildId === this.options.devGuildId || guildId === null;
      const allowed = isOwner && validContext;
      await this.options.audit?.write({
        source: 'COMMANDS',
        actorId: userId,
        action: allowed ? 'admin_command.invocation.granted' : 'admin_command.invocation.rejected',
        targetType: 'command',
        targetId: command.metadata.commandKey,
        beforeState: null,
        afterState: { guildId, validContext, isOwner },
        timestamp: new Date(),
      });
      return allowed
        ? { allowed: true, silent: false }
        : { allowed: false, silent: true, reason: 'ADMIN_OWNER_GATE' };
    }

    if (command.metadata.ownerOnly && !isOwner) {
      return { allowed: false, silent: false, reason: 'OWNER_ONLY' };
    }

    return { allowed: true, silent: false };
  }

  assertAllowed(decision: RestrictionDecision): void {
    if (!decision.allowed) {
      throw new PermissionDeniedError(3, decision.reason ?? 'COMMAND_RESTRICTED');
    }
  }
}
