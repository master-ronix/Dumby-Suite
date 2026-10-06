import { moduleManifestSchema } from './manifest-schema.js';
import type { ModuleManifest } from './manifest-schema.js';

export interface ManifestValidationResult {
  readonly valid: boolean;
  /** One message per issue, each naming the offending path. Empty when `valid` is true. */
  readonly errors: readonly string[];
}

/**
 * The Swastik upload validator. It imports the *same* schema the bot's Stage 11 validator uses
 * (`./manifest-schema.ts`, re-exported by `apps/main/src/module-system/manifest.schema.ts`), so an
 * upload that passes here cannot fail at Stage 11 for a schema reason — and vice versa
 * (ACC-MOD-0011-2, "no drift").
 */
export function validateManifest(input: unknown): ManifestValidationResult {
  const parsed = moduleManifestSchema.safeParse(input);
  if (parsed.success) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: parsed.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path.length > 0 ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}

/** Throws on an invalid manifest, naming every issue — the upload path's fail-closed entry point. */
export function assertValidManifest(input: unknown): ModuleManifest {
  const result = validateManifest(input);
  if (!result.valid) {
    throw new Error(`invalid module manifest:\n  ${result.errors.join('\n  ')}`);
  }
  return moduleManifestSchema.parse(input);
}

/**
 * The bot's Stage 11 validator entry point. Same schema, same result as `assertValidManifest` —
 * kept under this name because `swastik-loader.ts`, `promotion.ts` and `entry/swastik.ts` all call
 * it, and a rename would be drift of a different kind.
 */
export const parseManifest = assertValidManifest;
