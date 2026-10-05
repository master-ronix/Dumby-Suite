import type { CommandDeclaration } from '@workspace/swastik';
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
  const context = { config: options.config ?? {} };
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
    execute: (interaction: unknown) => Promise.resolve(declaration.execute(interaction, context)),
  };
}
