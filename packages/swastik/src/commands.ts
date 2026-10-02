/**
 * §1.7 / interface.md §10.5 — the schema-declared authoring model. A module declares a command
 * schema with `defineCommand` and its handler returns page data; the Renderer derives the whole
 * presentation from that data, so module code never constructs components, embeds or flags.
 */
export interface CommandPageData {
  readonly page: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface CommandContext {
  readonly config: Readonly<Record<string, unknown>>;
}

export type CommandHandler = (
  interaction: unknown,
  context: CommandContext,
) => Promise<CommandPageData> | CommandPageData;

/** Layer 6 vocabulary, canonical short form (blueprint §21). */
export type CommandRbacRequirement =
  | 'RESTRICTED'
  | 'MEMBER'
  | 'HELPER'
  | 'MOD'
  | 'ADMIN'
  | 'OWNER';

export interface CommandPermissionsDeclaration {
  readonly discord?: readonly string[];
  readonly rbac?: CommandRbacRequirement;
  readonly nsfw?: boolean;
}

/** A slash-command option (Discord `ApplicationCommandOptionType` number in `type`). */
export interface CommandOptionDeclaration {
  readonly name: string;
  readonly description: string;
  readonly type: number;
  readonly required?: boolean;
  readonly autocomplete?: boolean;
}

export interface CommandDeclaration {
  readonly name: string;
  readonly description: string;
  readonly pages: readonly string[];
  readonly execute: CommandHandler;
  readonly guildOnly?: boolean;
  readonly options?: readonly CommandOptionDeclaration[];
  readonly permissions?: CommandPermissionsDeclaration;
  /** UR-A-03 / finding #3 — the middleware metadata the framework reads. */
  readonly requiresDefer?: boolean;
  readonly ephemeral?: boolean;
  readonly cooldownMs?: number;
}

export function defineCommand(declaration: CommandDeclaration): CommandDeclaration {
  if (declaration.name.trim().length === 0) {
    throw new Error('command name is required');
  }
  if (declaration.pages.length === 0) {
    throw new Error(`command "${declaration.name}" must declare at least one page`);
  }
  return declaration;
}
