import { ConflictError, ConfigurationError } from '../../errors/taxonomy.js';
import { CommandKeyCodec } from './CommandKeyCodec.js';
import { CommandValidationService } from './CommandValidationService.js';
import type { EventBusPort, MetricsPort } from './ports.js';
import {
  MAIN_IDENTITY_ID,
  type CommandKey,
  type ModuleCommandDefinition,
  type RegisteredCommand,
  type RegisteredCommandMetadata,
} from './types.js';

export class CommandKeyCollisionError extends ConflictError {
  constructor(
    readonly firstModuleSlug: string,
    readonly secondModuleSlug: string,
    readonly commandKey: CommandKey,
  ) {
    super('Command key collision', { firstModuleSlug, secondModuleSlug, commandKey });
    this.name = 'CommandKeyCollisionError';
  }
}

export class CommandRegistry {
  private readonly commands = new Map<CommandKey, RegisteredCommand>();
  private readonly moduleIndex = new Map<string, Set<CommandKey>>();
  private frozen = false;

  constructor(
    private readonly validation = new CommandValidationService(),
    private readonly events?: EventBusPort,
    private readonly metrics?: MetricsPort,
  ) {}

  register(definition: ModuleCommandDefinition): void {
    if (this.frozen) throw new ConfigurationError('CommandRegistry cannot be mutated after freeze');

    const normalized = this.validation.validateAndNormalize(definition.command, definition.tier);
    const keys = CommandKeyCodec.encodeCommand(definition.command);
    const commandType = CommandKeyCodec.commandType(definition.command);
    const identityId = definition.identityId ?? MAIN_IDENTITY_ID;

    for (const key of keys) {
      const existing = this.commands.get(key);
      if (existing !== undefined) {
        throw new CommandKeyCollisionError(
          existing.metadata.moduleSlug,
          definition.moduleSlug,
          key,
        );
      }

      const metadata: RegisteredCommandMetadata = {
        commandKey: key,
        moduleSlug: definition.moduleSlug,
        tier: definition.tier,
        commandType,
        identityId,
        guildOnly: normalized.guildOnly,
        ownerOnly: normalized.ownerOnly,
        nsfw: normalized.nsfw,
        defaultMemberPermissions: normalized.defaultMemberPermissions,
        localization: normalized.localization,
        autocompleteOptionNames: Object.keys(normalized.autocomplete),
        middleware: normalized.middleware,
      };

      this.commands.set(key, { command: normalized, metadata });
      const moduleKeys = this.moduleIndex.get(definition.moduleSlug) ?? new Set<CommandKey>();
      moduleKeys.add(key);
      this.moduleIndex.set(definition.moduleSlug, moduleKeys);
    }
  }

  freeze(): void {
    this.frozen = true;
    this.events?.emit('guild.command.registry.frozen', { size: this.commands.size });
    this.metrics?.setGauge('dumby_command_registry_size', this.commands.size);
    const byTier = new Map<string, number>();
    for (const entry of this.commands.values()) {
      byTier.set(entry.metadata.tier, (byTier.get(entry.metadata.tier) ?? 0) + 1);
    }
    for (const [tier, count] of byTier) {
      this.metrics?.setGauge('dumby_command_registry_commands_by_tier', count, { tier });
    }
  }

  isFrozen(): boolean {
    return this.frozen;
  }

  resolve(key: CommandKey): RegisteredCommand | undefined {
    return this.commands.get(key);
  }

  has(key: CommandKey): boolean {
    return this.commands.has(key);
  }

  all(): RegisteredCommand[] {
    return [...this.commands.values()];
  }

  getByModule(moduleSlug: string): RegisteredCommand[] {
    return [...(this.moduleIndex.get(moduleSlug) ?? [])]
      .map((key) => this.commands.get(key))
      .filter((entry): entry is RegisteredCommand => entry !== undefined);
  }

  size(): number {
    return this.commands.size;
  }

  static buildFrozen(
    definitions: readonly ModuleCommandDefinition[],
    validation = new CommandValidationService(),
    events?: EventBusPort,
    metrics?: MetricsPort,
  ): CommandRegistry {
    validation.validateContextMenuLimits(definitions);
    const registry = new CommandRegistry(validation, events, metrics);
    for (const definition of definitions) {
      registry.register(definition);
    }
    registry.freeze();
    return registry;
  }
}
