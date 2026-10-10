import type { CommandContext, CommandDeclaration } from '@workspace/swastik';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import type { CoreRenderer, RenderIdentity } from '../rendering/core-renderer.js';
import type { Rank } from '../permissions/rank.js';
import type { CommandDefinition } from './command-registry.js';

export interface ModuleCommandBridgeOptions {
  readonly moduleId: string;
  readonly identity: RenderIdentity;
  readonly renderer: CoreRenderer;
  readonly config?: Readonly<Record<string, unknown>>;
}

/** The command vocabulary is the canonical short form; the resolver's `Rank` is the long form. */
const RBAC_TO_RANK: Record<string, Rank> = {
  RESTRICTED: 'RESTRICTED',
  MEMBER: 'MEMBER',
  HELPER: 'HELPER',
  MOD: 'MODERATOR',
  ADMIN: 'ADMINISTRATOR',
  OWNER: 'OWNER',
};

/**
 * UR-11 — bridges a module's `defineCommand` declaration to the registry's `CommandDefinition`.
 * The handler returns page data and the Renderer derives the frame, so module code never touches
 * components; the buffer-then-render contract stays the router's.
 */
export function toCommandDefinition(
  declaration: CommandDeclaration,
  options: ModuleCommandBridgeOptions,
): CommandDefinition {
  const data: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: declaration.name,
    description: declaration.description,
    ...(declaration.options !== undefined
      ? {
          options: declaration.options.map((option) => ({
            name: option.name,
            description: option.description,
            type: option.type,
            ...(option.required !== undefined ? { required: option.required } : {}),
            ...(option.autocomplete !== undefined ? { autocomplete: option.autocomplete } : {}),
          })),
        }
      : {}),
  };
  const declared = declaration.permissions;
  return {
    data,
    moduleId: options.moduleId,
    guildOnly: declaration.guildOnly ?? true,
    permissionDeclared: declared !== undefined,
    ...(declaration.requiresDefer !== undefined
      ? { requiresDefer: declaration.requiresDefer }
      : {}),
    ...(declaration.ephemeral !== undefined ? { ephemeral: declaration.ephemeral } : {}),
    ...(declaration.cooldownMs !== undefined ? { cooldownMs: declaration.cooldownMs } : {}),
    ...(declared !== undefined
      ? {
          permissions: {
            ...(declared.discord !== undefined ? { discord: declared.discord } : {}),
            ...(declared.rbac !== undefined ? { rbac: RBAC_TO_RANK[declared.rbac] } : {}),
            ...(declared.nsfw !== undefined ? { nsfw: declared.nsfw } : {}),
          },
        }
      : {}),
    moduleConfig: options.config ?? {},
    ...(options.identity.developer !== undefined ||
    options.identity.version !== undefined ||
    options.identity.displayName !== undefined ||
    options.identity.accent !== undefined ||
    options.identity.banner !== undefined ||
    options.identity.buildId !== undefined ||
    options.identity.devUsername !== undefined
      ? {
          identity: {
            ...(options.identity.developer !== undefined
              ? { developer: options.identity.developer }
              : {}),
            ...(options.identity.version !== undefined
              ? { version: options.identity.version }
              : {}),
            ...(options.identity.displayName !== undefined
              ? { displayName: options.identity.displayName }
              : {}),
            ...(options.identity.accent !== undefined ? { accent: options.identity.accent } : {}),
            ...(options.identity.banner !== undefined ? { banner: options.identity.banner } : {}),
            ...(options.identity.buildId !== undefined
              ? { buildId: options.identity.buildId }
              : {}),
            ...(options.identity.devUsername !== undefined
              ? { devUsername: options.identity.devUsername }
              : {}),
          },
        }
      : {}),
    execute: (interaction: unknown, context: CommandContext) =>
      Promise.resolve(declaration.execute(interaction, context)),
  };
}
