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
  /**
   * UR-20261012-071 — §11.7: start active processes on the DISABLED → ENABLED transition (a polling
   * loop, an external connection, a scheduled task). Optional; idempotent; ≤ 5 s.
   *
   * These are GLOBAL transitions — load, re-enable, shutdown — not per-guild ones. §13.7 is explicit
   * that a per-guild toggle "never touches the module's loaded state, DI registrations, or event
   * subscriptions", so disabling a module in ONE guild must not stop a process that other guilds are
   * still served by. The per-guild case is handled by the execution gates (UR-20261012-069).
   */
  onEnable?: (container: Container) => Promise<void> | void;
  /**
   * UR-20261012-071 — §11.7: stop them on the ENABLED → DISABLED transition. Optional; idempotent;
   * ≤ 5 s. A throw is logged and the module still transitions to DISABLED. Always runs BEFORE
   * `onUnload`.
   */
  onDisable?: () => Promise<void> | void;
  /**
   * UR-20261012-072 — §11.7: "cleanup on an unrecoverable error". Called when the framework gives up
   * on the module — a load or ready failure it cannot recover from. Idempotent; a throw here is
   * logged and does not change the outcome.
   */
  onError?: (error: Error) => Promise<void> | void;
  /**
   * UR-20261012-072 — §11.7: "react to a per-guild config change without a reload". Called when THIS
   * module's per-guild config is written, so a module can refresh cached values rather than recompute
   * them on every read. Idempotent.
   */
  onConfigChange?: (
    guildId: string,
    config: Readonly<Record<string, unknown>>,
  ) => Promise<void> | void;
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
