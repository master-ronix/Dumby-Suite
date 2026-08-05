import { ApplicationCommandType } from 'discord.js';
import { ConfigurationError } from '../../errors/taxonomy.js';
import { CommandKeyCodec } from './CommandKeyCodec.js';
import {
  DEFAULT_COOLDOWN_SECONDS,
  DEFAULT_RBAC_ROLE,
  MESSAGE_CONTEXT_MENU_COMMAND_LIMIT,
  USER_CONTEXT_MENU_COMMAND_LIMIT,
  type CommandTier,
  type ICommand,
  type ModuleCommandDefinition,
  type NormalizedCommand,
} from './types.js';

export class CommandValidationService {
  validateAndNormalize(command: ICommand, tier: CommandTier): NormalizedCommand {
    if (command === null || typeof command !== 'object') {
      throw new ConfigurationError('Command must be an object');
    }
    if (!('data' in command) || command.data === undefined || command.data === null) {
      throw new ConfigurationError('Command is missing required data builder');
    }
    if (typeof command.execute !== 'function') {
      throw new ConfigurationError('Command is missing required execute handler');
    }

    const json = command.data.toJSON();
    const type = json.type ?? ApplicationCommandType.ChatInput;
    if (type !== 1 && type !== 2 && type !== 3) {
      throw new ConfigurationError('Unsupported command type', { type });
    }

    CommandKeyCodec.encodeCommand(command);
    const rbac = command.permissions?.rbac ?? DEFAULT_RBAC_ROLE;
    if (tier === 'core' && rbac !== DEFAULT_RBAC_ROLE) {
      throw new ConfigurationError('Core-tier commands may not declare non-default RBAC', {
        command: json.name,
        rbac,
      });
    }
    if (tier === 'admin' && command.ownerOnly === false) {
      throw new ConfigurationError('Admin-tier commands must be compatible with owner-only enforcement', {
        command: json.name,
      });
    }
    if (command.forbidsPrefixBehavior === false) {
      throw new ConfigurationError('Command definitions may not imply text-prefix behavior', {
        command: json.name,
      });
    }

    return {
      data: command.data,
      execute: command.execute,
      permissions: {
        discord: [...(command.permissions?.discord ?? [])],
        rbac,
      },
      defaultMemberPermissions: command.defaultMemberPermissions,
      cooldown: {
        duration: command.cooldown?.duration ?? DEFAULT_COOLDOWN_SECONDS,
        scope: command.cooldown?.scope ?? 'USER',
      },
      guildOnly: command.guildOnly ?? true,
      ownerOnly: command.ownerOnly ?? tier === 'admin',
      requiresDefer: command.requiresDefer ?? false,
      ephemeral: command.ephemeral ?? false,
      nsfw: command.nsfw ?? false,
      middleware: [...(command.middleware ?? [])],
      autocomplete: { ...(command.autocomplete ?? {}) },
      localization: {
        name: { ...(command.localization?.name ?? {}) },
        description: { ...(command.localization?.description ?? {}) },
      },
      forbidsPrefixBehavior: command.forbidsPrefixBehavior ?? true,
    };
  }

  validateContextMenuLimits(definitions: readonly ModuleCommandDefinition[]): void {
    const counts = new Map<string, { user: number; message: number }>();
    for (const def of definitions) {
      const type = CommandKeyCodec.commandType(def.command);
      const identityId = def.identityId ?? 'main';
      const current = counts.get(identityId) ?? { user: 0, message: 0 };
      if (type === 'USER_CONTEXT_MENU') current.user += 1;
      if (type === 'MESSAGE_CONTEXT_MENU') current.message += 1;
      counts.set(identityId, current);
    }

    for (const [identityId, count] of counts) {
      if (count.user > USER_CONTEXT_MENU_COMMAND_LIMIT) {
        throw new ConfigurationError('Too many user context menu commands for identity', {
          identityId,
          count: count.user,
          limit: USER_CONTEXT_MENU_COMMAND_LIMIT,
        });
      }
      if (count.message > MESSAGE_CONTEXT_MENU_COMMAND_LIMIT) {
        throw new ConfigurationError('Too many message context menu commands for identity', {
          identityId,
          count: count.message,
          limit: MESSAGE_CONTEXT_MENU_COMMAND_LIMIT,
        });
      }
    }
  }
}
