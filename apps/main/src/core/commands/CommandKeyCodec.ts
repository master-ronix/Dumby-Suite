import { ApplicationCommandType, type APIApplicationCommandOption } from 'discord.js';
import { ConfigurationError } from '../../errors/taxonomy.js';
import {
  discordTypeToCommandType,
  isSubcommandGroupOption,
  isSubcommandOption,
  type CommandKey,
  type CommandType,
  type DecodedCommandKey,
  type ICommand,
} from './types.js';

const SLASH_NAME_RE = /^[a-z0-9_-]{1,32}$/;
const CONTEXT_MENU_NAME_RE = /^[^\n\r]{1,32}$/;
const PREFIX_LIKE_RE = /^[!?.>$]/;

export class CommandKeyCodec {
  static encodeCommand(command: ICommand): CommandKey[] {
    const json = command.data.toJSON();
    const type = discordTypeToCommandType(json.type ?? ApplicationCommandType.ChatInput);

    if (type === 'USER_CONTEXT_MENU') {
      this.assertContextName(json.name);
      return [`USER::${json.name}`];
    }

    if (type === 'MESSAGE_CONTEXT_MENU') {
      this.assertContextName(json.name);
      return [`MESSAGE::${json.name}`];
    }

    this.assertSlashName(json.name);
    const options = (json.options ?? []) as APIApplicationCommandOption[];
    const keys: string[] = [];

    for (const option of options) {
      if (isSubcommandOption(option)) {
        this.assertSlashName(option.name);
        keys.push(`/${json.name}.${option.name}`);
      } else if (isSubcommandGroupOption(option)) {
        this.assertSlashName(option.name);
        for (const child of option.options ?? []) {
          if (!isSubcommandOption(child)) {
            throw new ConfigurationError('Subcommand groups may contain only subcommands', {
              command: json.name,
              group: option.name,
            });
          }
          this.assertSlashName(child.name);
          keys.push(`/${json.name}.${option.name}.${child.name}`);
        }
      }
    }

    return keys.length > 0 ? keys : [`/${json.name}`];
  }

  static encodeSlash(name: string, subcommand?: string, subcommandGroup?: string): CommandKey {
    this.assertSlashName(name);
    if (subcommandGroup !== undefined) this.assertSlashName(subcommandGroup);
    if (subcommand !== undefined) this.assertSlashName(subcommand);
    if (subcommandGroup !== undefined && subcommand === undefined) {
      throw new ConfigurationError('Grouped slash command key requires a subcommand');
    }
    if (subcommandGroup !== undefined) return `/${name}.${subcommandGroup}.${subcommand}`;
    if (subcommand !== undefined) return `/${name}.${subcommand}`;
    return `/${name}`;
  }

  static encodeContext(type: Exclude<CommandType, 'CHAT_INPUT'>, name: string): CommandKey {
    this.assertContextName(name);
    return `${type === 'USER_CONTEXT_MENU' ? 'USER' : 'MESSAGE'}::${name}`;
  }

  static decode(key: CommandKey): DecodedCommandKey {
    if (key.startsWith('USER::')) {
      const name = key.slice('USER::'.length);
      this.assertContextName(name);
      return { type: 'USER_CONTEXT_MENU', name };
    }

    if (key.startsWith('MESSAGE::')) {
      const name = key.slice('MESSAGE::'.length);
      this.assertContextName(name);
      return { type: 'MESSAGE_CONTEXT_MENU', name };
    }

    if (!key.startsWith('/')) {
      throw new ConfigurationError('Invalid command key shape', { key });
    }

    const parts = key.slice(1).split('.');
    if (parts.length < 1 || parts.length > 3) {
      throw new ConfigurationError('Invalid slash command key shape', { key });
    }

    const [name, second, third] = parts;
    if (!name) throw new ConfigurationError('Slash command key is missing a name', { key });
    this.assertSlashName(name);
    if (second !== undefined) this.assertSlashName(second);
    if (third !== undefined) this.assertSlashName(third);

    return third !== undefined
      ? { type: 'CHAT_INPUT', name, subcommandGroup: second, subcommand: third }
      : { type: 'CHAT_INPUT', name, subcommand: second };
  }

  static commandType(command: ICommand): CommandType {
    const json = command.data.toJSON();
    return discordTypeToCommandType(json.type ?? ApplicationCommandType.ChatInput);
  }

  static assertNoPrefixLikeName(name: string): void {
    if (PREFIX_LIKE_RE.test(name)) {
      throw new ConfigurationError('Command names and aliases must not imply text-prefix behavior', {
        name,
      });
    }
  }

  private static assertSlashName(name: string): void {
    this.assertNoPrefixLikeName(name);
    if (!SLASH_NAME_RE.test(name)) {
      throw new ConfigurationError('Invalid slash command name', { name });
    }
  }

  private static assertContextName(name: string): void {
    this.assertNoPrefixLikeName(name);
    if (!CONTEXT_MENU_NAME_RE.test(name)) {
      throw new ConfigurationError('Invalid context menu command name', { name });
    }
  }
}
