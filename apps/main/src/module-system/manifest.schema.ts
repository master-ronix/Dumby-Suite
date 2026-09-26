import { z } from 'zod';

export const moduleTierSchema = z.enum(['admin', 'core', 'standard', 'marketplace']);

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
});

export const crossModuleReadSchema = z.object({
  targetModule: z.string().min(1),
  accessor: z
    .string()
    .regex(/ForCrossModuleRead$/, 'accessor name must end with "ForCrossModuleRead"'),
});

export const moduleManifestSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .regex(/^[a-z][a-z0-9-]*$/, 'module name must be lowercase-kebab-case'),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version must be semver, e.g. "1.0.0"'),
    description: z.string().min(1),
    tier: moduleTierSchema,
    devGuildOnly: z.boolean().optional(),
    hardcoded: z.boolean().default(false),
    hardcodeGuildId: z.string().optional(),
    releaseStatus: z.enum(['alpha', 'beta', 'stable', 'deprecated']).optional(),
    devId: z.string().optional(),
    buildId: z.string().optional(),
    marketplaceCategory: z.string().optional(),
    required: z.boolean(),
    depends: z.array(z.string()).default([]),
    provides: z.array(z.string()).default([]),
    intents: z.array(z.string()).default([]),
    partials: z.array(z.string()).default([]),
    commands: z.array(commandManifestSchema).default([]),
    events: z.array(z.string()).default([]),
    services: z.array(z.string()).default([]),
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
    crossModuleReads: z.array(crossModuleReadSchema).default([]),
  })
  .strict();

export type ModuleManifest = z.infer<typeof moduleManifestSchema>;

export class ManifestValidationError extends Error {
  constructor(
    readonly moduleName: string,
    readonly issues: readonly string[],
  ) {
    super(`Manifest validation failed for "${moduleName}": ${issues.join('; ')}`);
    this.name = 'ManifestValidationError';
  }
}

export function parseManifest(raw: unknown): ModuleManifest {
  const result = moduleManifestSchema.safeParse(raw);
  if (!result.success) {
    const name =
      typeof raw === 'object' && raw !== null && 'name' in raw
        ? String((raw as { name: unknown }).name)
        : '(unknown)';
    throw new ManifestValidationError(
      name,
      result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    );
  }
  return result.data;
}
