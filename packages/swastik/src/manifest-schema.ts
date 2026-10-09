import { z } from 'zod';

/**
 * The module manifest — the specified contract.
 *
 * Authority: `docs/spec/modules/module-anatomy-manifest.md` (SPEC-03-MODULES) and
 * `docs/contracts/module-manifest.schema.json`. Where the two once disagreed with this file, this
 * file was the gap; it now expresses the contract.
 *
 * The shape is a **discriminated union on `hardcoded`**: a `hardcoded: true` build is a private
 * build pinned to one guild, so it carries `hardcodeGuildId` and admits only `releaseStatus:
 * 'private'`; a `hardcoded: false` build forbids `hardcodeGuildId` and admits either release status.
 * On top of the union the **visibility triad** runs as one `superRefine`, so a violating manifest
 * fails with a single error naming the conflicting fields together rather than three independent
 * ones.
 */
export const moduleTierSchema = z.enum(['admin', 'core', 'standard', 'marketplace']);

export const moduleVisibilitySchema = z.enum(['public', 'unlisted', 'private']);

export const moduleReleaseStatusSchema = z.enum(['private', 'public']);

export const marketplaceCategorySchema = z.enum([
  'audio',
  'community',
  'security',
  'integrations',
  'utility',
]);

/** Mirrors the DI container's `Lifetime` (src/di/container.ts). */
export const serviceLifetimeSchema = z.enum(['singleton', 'transient', 'scoped']);

export const commandManifestSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  guildOnly: z.boolean().default(true),
  requiresDefer: z.boolean().default(false),
  ephemeral: z.boolean().default(false),
  nsfw: z.boolean().default(false),
  permissions: z
    .object({
      discord: z.array(z.string()).default([]),
    })
    .default({ discord: [] }),
  defaultMemberPermissions: z.string().nullable().optional(),
  rbacRequirement: z
    .enum(['RESTRICTED', 'MEMBER', 'HELPER', 'MOD', 'ADMIN', 'OWNER'])
    .nullable()
    .optional(),
});

export const eventCatalogEntrySchema = z.object({
  name: z
    .string()
    .regex(
      /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){2}$/,
      'event name must be {domain}.{entity}.{action}',
    ),
  description: z.string().min(1),
  // §18 — every catalog entry declares a payload schema; a change to it is a breaking change.
  payload: z.record(z.string(), z.unknown()),
});

export const crossModuleReadSchema = z.object({
  targetModule: z.string().min(1),
  accessor: z
    .string()
    .regex(/ForCrossModuleRead$/, 'accessor name must end with "ForCrossModuleRead"'),
});

/**
 * `depends` entries are `{ token, version }` pins, never bare tokens: Stage 11 runs a
 * range-satisfaction evaluator over them (see `topo-sort.ts`).
 */
export const dependencyEntrySchema = z
  .object({
    token: z.string().min(1),
    version: z.string().min(1),
  })
  .strict();

/** `provides` entries are `{ token, contract }` — the contract names a TS interface `tsc` checks. */
export const providedServiceSchema = z
  .object({
    token: z.string().min(1),
    contract: z.string().min(1),
  })
  .strict();

/** `services` entries are `{ token, class, lifetime, deps }`. */
export const declaredServiceSchema = z
  .object({
    token: z.string().min(1),
    class: z.string().min(1),
    lifetime: serviceLifetimeSchema,
    deps: z.array(z.string()).default([]),
  })
  .strict();

/** §1.3 / ADR-012 / ADR-013 — a module's declared UI identity: banner, accent, logo icon, name. */
export const moduleUiSchema = z
  .object({
    banner: z.string().min(1).optional(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'accent must be a #RRGGBB hex colour').optional(),
    icon: z.string().min(1).optional(),
    displayName: z.string().min(1).optional(),
    devUsername: z.string().min(1).optional(),
  })
  .strict();

const commonManifestFields = {
  name: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9-]*$/, 'module name must be lowercase-kebab-case'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version must be semver, e.g. "1.0.0"'),
  description: z.string().min(1).max(120),
  tier: moduleTierSchema,
  devGuildOnly: z.boolean().optional(),
  // Required by the contract: a manifest names the developer and the exact uploaded version.
  devId: z.string().min(1),
  buildId: z.string().min(1),
  // Required by the contract, always. A `hardcoded: true` build must set it to 'private'.
  visibility: moduleVisibilitySchema,
  releaseStatus: moduleReleaseStatusSchema,
  marketplaceCategory: marketplaceCategorySchema.optional(),
  required: z.boolean().default(false),
  depends: z.array(dependencyEntrySchema).default([]),
  provides: z.array(providedServiceSchema).default([]),
  intents: z.array(z.string()).default([]),
  partials: z.array(z.string()).default([]),
  commands: z.array(commandManifestSchema).default([]),
  events: z.array(z.string()).default([]),
  services: z.array(declaredServiceSchema).default([]),
  repositories: z.array(z.string()).default([]),
  jobs: z.array(z.string()).default([]),
  tasks: z.array(z.string()).default([]),
  routes: z.array(z.string()).default([]),
  middleware: z.array(z.string()).default([]),
  migrations: z.array(z.string()).default([]),
  locales: z.array(z.string()).default(['en-US']),
  config: z.record(z.string(), z.unknown()).default({}),
  eventsCatalog: z.array(eventCatalogEntrySchema).default([]),
  dashboardSchema: z.record(z.string(), z.unknown()).optional(),
  ui: moduleUiSchema.optional(),
  crossModuleReads: z.array(crossModuleReadSchema).default([]),
};

const hardcodedManifestSchema = z
  .object({
    ...commonManifestFields,
    hardcoded: z.literal(true),
    hardcodeGuildId: z.string().min(1),
  })
  .strict();

const softManifestSchema = z
  .object({
    ...commonManifestFields,
    hardcoded: z.literal(false),
    // Declared (optional) rather than omitted so the triad reports one combined error instead of a
    // bare "unrecognized key" from `.strict()`.
    hardcodeGuildId: z.string().optional(),
  })
  .strict();

/**
 * The visibility triad, as one error. A violating manifest is rejected once, naming every
 * conflicting field together — not three times.
 */
export const moduleManifestSchema = z
  .discriminatedUnion('hardcoded', [hardcodedManifestSchema, softManifestSchema])
  .superRefine((manifest, ctx) => {
    const conflicts: string[] = [];

    if (manifest.hardcoded === true) {
      if (manifest.releaseStatus !== 'private') {
        conflicts.push(`hardcoded: true requires releaseStatus 'private' (got '${manifest.releaseStatus}')`);
      }
      if (manifest.visibility !== 'private') {
        conflicts.push(`hardcoded: true requires visibility 'private' (got '${manifest.visibility}')`);
      }
    } else if (manifest.hardcodeGuildId !== undefined) {
      conflicts.push("hardcoded: false forbids hardcodeGuildId");
    }

    if (manifest.releaseStatus === 'public') {
      if (manifest.hardcoded !== false) {
        conflicts.push("releaseStatus 'public' requires hardcoded: false");
      }
      if (manifest.visibility !== 'public') {
        conflicts.push(`releaseStatus 'public' requires visibility 'public' (got '${manifest.visibility}')`);
      }
    }

    if (manifest.tier === 'admin' && manifest.devGuildOnly !== true) {
      conflicts.push("tier 'admin' requires devGuildOnly: true");
    }
    if (manifest.tier !== 'admin' && manifest.devGuildOnly === true) {
      conflicts.push(`only tier 'admin' may set devGuildOnly: true (tier is '${manifest.tier}')`);
    }
    if (manifest.tier === 'marketplace' && manifest.marketplaceCategory === undefined) {
      conflicts.push("tier 'marketplace' requires a marketplaceCategory");
    }
    if (manifest.tier !== 'marketplace' && manifest.marketplaceCategory !== undefined) {
      conflicts.push(`marketplaceCategory is forbidden for tier '${manifest.tier}'`);
    }

    if (conflicts.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `manifest "${manifest.name}" violates the hardcoded/visibility/releaseStatus triad: ${conflicts.join('; ')}`,
      });
    }
  });

export type ModuleManifest = z.infer<typeof moduleManifestSchema>;
export type DependencyEntry = z.infer<typeof dependencyEntrySchema>;
export type ProvidedService = z.infer<typeof providedServiceSchema>;
export type DeclaredService = z.infer<typeof declaredServiceSchema>;
export type ModuleVisibility = z.infer<typeof moduleVisibilitySchema>;
export type ModuleReleaseStatus = z.infer<typeof moduleReleaseStatusSchema>;
export type MarketplaceCategory = z.infer<typeof marketplaceCategorySchema>;
