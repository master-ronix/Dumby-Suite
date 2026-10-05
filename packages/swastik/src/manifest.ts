export const moduleTiers = [
  "admin",
  "core",
  "standard",
  "marketplace",
] as const;

export type ModuleTier = (typeof moduleTiers)[number];

import type { ModuleManifest } from "./manifest-schema.js";
import type { z } from "zod";
import { commandManifestSchema } from "./manifest-schema.js";

export type { ModuleManifest } from "./manifest-schema.js";
export type {
  DependencyEntry,
  ProvidedService,
  DeclaredService,
  ModuleVisibility,
  ModuleReleaseStatus,
  MarketplaceCategory,
} from "./manifest-schema.js";
export * from "./manifest-schema.js";

/** The per-command entry of a manifest, derived from the shared schema. */
export type ModuleCommandManifest = z.infer<typeof commandManifestSchema>;

export interface ModuleLifecycle<Container = unknown> {
  onLoad?: (container: Container) => Promise<void> | void;
  onReady?: (container: Container) => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
}

export interface SwastikModule<
  Container = unknown,
> extends ModuleLifecycle<Container> {
  manifest: ModuleManifest;
}

export function defineModule<Container = unknown>(
  moduleDefinition: SwastikModule<Container>,
): SwastikModule<Container> {
  return moduleDefinition;
}
