/**
 * The module manifest schema is owned by the Swastik authoring surface
 * (`@workspace/swastik/manifest`), so the bot's Stage 11 validator and Swastik's upload validator
 * share one definition and cannot drift (ACC-MOD-0011-2). This module re-exports it under the
 * import path the bot already uses.
 */
export * from '@workspace/swastik/manifest';
export { parseManifest, validateManifest, assertValidManifest } from '@workspace/swastik/validate';
export type { ManifestValidationResult } from '@workspace/swastik/validate';
