/**
 * scripts/scaffold-module.ts (Cluster: Ring). Generates one module's full
 * file set from a ModuleSpec. Run directly (`pnpm scaffold:module`) to
 * regenerate everything, or import `MODULES` / `writeModule` to add a new
 * module following the exact same pattern used for the 22 illustrative
 * skeletons.
 *
 * Per spec section 9, every generated module skeleton "must prove
 * framework capability, not implement full moderation/economy/music
 * product logic" — so each one only ever does a safe self-test: write a
 * row, read it back, emit one event, expose one route. No Discord
 * commands, no product business logic.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type ModuleTier = 'admin' | 'core' | 'standard' | 'marketplace';

export interface ModuleSpec {
  slug: string;
  displayName: string;
  tier: ModuleTier;
  index: number;
  devGuildOnly?: boolean;
  marketplaceCategory?: string;
  depends?: string[];
}

export const MODULES: ModuleSpec[] = [
  { slug: 'core-admin', displayName: 'Core Admin', tier: 'admin', index: 1, devGuildOnly: true },
  { slug: 'guild-settings', displayName: 'Guild Settings', tier: 'core', index: 2 },
  { slug: 'utility', displayName: 'Utility', tier: 'core', index: 3 },
  { slug: 'moderation', displayName: 'Moderation', tier: 'standard', index: 4, depends: ['guild-settings'] },
  { slug: 'auto-moderation', displayName: 'Auto Moderation', tier: 'standard', index: 5, depends: ['moderation'] },
  { slug: 'anti-raid', displayName: 'Anti Raid', tier: 'standard', index: 6, depends: ['moderation'] },
  { slug: 'verification', displayName: 'Verification', tier: 'standard', index: 7, depends: ['guild-settings'] },
  { slug: 'logging', displayName: 'Logging', tier: 'standard', index: 8, depends: ['guild-settings'] },
  { slug: 'welcome', displayName: 'Welcome', tier: 'standard', index: 9, depends: ['guild-settings'] },
  { slug: 'leveling', displayName: 'Leveling', tier: 'standard', index: 10, depends: ['guild-settings'] },
  { slug: 'economy', displayName: 'Economy', tier: 'standard', index: 11, depends: ['guild-settings'] },
  { slug: 'starboard', displayName: 'Starboard', tier: 'standard', index: 12, depends: ['guild-settings'] },
  { slug: 'reaction-roles', displayName: 'Reaction Roles', tier: 'standard', index: 13, depends: ['guild-settings'] },
  { slug: 'polls', displayName: 'Polls', tier: 'standard', index: 14, depends: ['guild-settings'] },
  { slug: 'birthdays', displayName: 'Birthdays', tier: 'standard', index: 15, depends: ['guild-settings'] },
  { slug: 'tags', displayName: 'Tags', tier: 'standard', index: 16, depends: ['guild-settings'] },
  { slug: 'reminders', displayName: 'Reminders', tier: 'standard', index: 17, depends: ['guild-settings'] },
  { slug: 'threads-manager', displayName: 'Threads Manager', tier: 'standard', index: 18, depends: ['guild-settings'] },
  { slug: 'giveaways', displayName: 'Giveaways', tier: 'standard', index: 19, depends: ['guild-settings'] },
  { slug: 'tickets', displayName: 'Tickets', tier: 'standard', index: 20, depends: ['guild-settings'] },
  { slug: 'music', displayName: 'Music', tier: 'marketplace', index: 21, marketplaceCategory: 'entertainment' },
  { slug: 'integrations', displayName: 'Integrations', tier: 'marketplace', index: 22, marketplaceCategory: 'utility' },
];

function pascalCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function tableName(slug: string): string {
  return `mod_${slug.replace(/-/g, '_')}_selftest`;
}

function manifestFile(spec: ModuleSpec): string {
  const name = pascalCase(spec.slug);
  const dependsLiteral = JSON.stringify(spec.depends ?? []);
  const extra: string[] = [];
  if (spec.tier === 'admin') extra.push(`  devGuildOnly: true,`);
  if (spec.tier === 'marketplace') extra.push(`  marketplaceCategory: ${JSON.stringify(spec.marketplaceCategory)},`);
  return `import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * ${spec.displayName} module manifest (illustrative skeleton #${String(spec.index).padStart(2, '0')}, tier: ${spec.tier}).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const ${name}Manifest: ModuleManifest = {
  name: '${spec.slug}',
  version: '1.0.0',
  description: '${spec.displayName} illustrative module skeleton — self-test and status only.',
  tier: '${spec.tier}',
  hardcoded: false,
${extra.join('\n')}
  required: ${spec.tier === 'core' || spec.tier === 'admin' ? 'true' : 'false'},
  depends: ${dependsLiteral},
  provides: ['${spec.slug}.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['${spec.slug}.selftest.executed'],
  services: ['${name}Service'],
  repositories: ['${name}Repository'],
  jobs: ['${spec.slug}-selftest-job'],
  tasks: ['${spec.slug}-selftest-heartbeat'],
  routes: ['GET /api/modules/${spec.slug}/selftest'],
  middleware: [],
  migrations: ['create_${tableName(spec.slug)}'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: '${spec.slug}.selftest.executed',
      description: 'Emitted every time the ${spec.displayName} module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
`;
}

function serviceFile(spec: ModuleSpec): string {
  const name = pascalCase(spec.slug);
  return `/**
 * ${name}Service — the module's one provided service. Deliberately free of
 * any database/queue/HTTP import: it depends only on the small
 * SelfTestRepository interface below, so it can be unit tested with an
 * in-memory fake (see tests/unit/modules/generated-modules.test.ts)
 * without a live Postgres connection.
 */

export interface SelfTestRunRecord {
  id: string;
  status: 'pass' | 'fail';
  details: Record<string, unknown>;
  ranAt: string;
}

export interface SelfTestRepository {
  recordRun(status: 'pass' | 'fail', details: Record<string, unknown>): Promise<SelfTestRunRecord>;
  countRuns(): Promise<number>;
}

export interface DomainEventEmitter {
  emit(eventName: string, payload: unknown): Promise<void>;
}

export interface SelfTestResult {
  ok: boolean;
  moduleSlug: string;
  details: Record<string, unknown>;
}

export class ${name}Service {
  constructor(
    private readonly repository: SelfTestRepository,
    private readonly eventBus?: DomainEventEmitter,
  ) {}

  async selfTest(): Promise<SelfTestResult> {
    const details = { module: '${spec.slug}', ranAt: new Date().toISOString() };
    await this.repository.recordRun('pass', details);
    await this.eventBus?.emit('${spec.slug}.selftest.executed', details);
    return { ok: true, moduleSlug: '${spec.slug}', details };
  }

  async status(): Promise<{ moduleSlug: string; totalRuns: number }> {
    const totalRuns = await this.repository.countRuns();
    return { moduleSlug: '${spec.slug}', totalRuns };
  }
}
`;
}

function repositoryFile(spec: ModuleSpec): string {
  const name = pascalCase(spec.slug);
  const table = tableName(spec.slug);
  return `import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import type { SelfTestRepository, SelfTestRunRecord } from './service.js';

/**
 * ${name}Repository — the module's one provided repository, backed by the
 * module-owned table "${table}" created in migrations/. This is the only
 * file in the module that touches Postgres directly.
 */
export class ${name}Repository implements SelfTestRepository {
  constructor(private readonly knex: Knex) {}

  async recordRun(status: 'pass' | 'fail', details: Record<string, unknown>): Promise<SelfTestRunRecord> {
    const id = randomUUID();
    const ranAt = new Date().toISOString();
    await this.knex('${table}').insert({
      id,
      status,
      details: JSON.stringify(details),
      ranAt,
    });
    return { id, status, details, ranAt };
  }

  async countRuns(): Promise<number> {
    const row = await this.knex('${table}').whereNull('deletedAt').count<{ count: string }>('id as count').first();
    return Number(row?.count ?? 0);
  }
}
`;
}

function migrationFile(spec: ModuleSpec): string {
  const table = tableName(spec.slug);
  return `import type { Knex } from 'knex';
import { addTimestamps, addSoftDelete } from '../../../db/migration-helpers.js';

/** Module-owned table for ${spec.displayName} (illustrative skeleton). Audit columns + soft-delete per spec section 15. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('${table}', (table) => {
    table.uuid('id').primary();
    table.enu('status', ['pass', 'fail'], { useNative: true, enumName: '${table}_status' }).notNullable();
    table.jsonb('details').notNullable().defaultTo('{}');
    table.timestamp('ranAt', { useTz: true }).notNullable();
    addTimestamps(knex, table);
    addSoftDelete(table);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('${table}');
  await knex.raw('drop type if exists ${table}_status');
}
`;
}

function jobFile(spec: ModuleSpec): string {
  const name = pascalCase(spec.slug);
  return `import type { Job } from 'bullmq';
import type { ${name}Service } from './service.js';

export interface ${name}SelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "${spec.slug}-selftest-job". */
export function create${name}SelfTestProcessor(service: ${name}Service) {
  return async function ${spec.slug.replace(/-/g, '_')}SelfTestProcessor(job: Job<${name}SelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
`;
}

function taskFile(spec: ModuleSpec): string {
  const name = pascalCase(spec.slug);
  return `import type { ${name}Service } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:${spec.slug}-selftest-heartbeat".
 */
export const ${name}_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function create${name}SelfTestHeartbeat(service: ${name}Service) {
  return async function ${spec.slug.replace(/-/g, '_')}SelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
`;
}

function routeFile(spec: ModuleSpec): string {
  const name = pascalCase(spec.slug);
  return `import type { ${name}Service } from './service.js';

export interface RouteHandlerContext {
  service: ${name}Service;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/${spec.slug}/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handle${name}SelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
`;
}

function localeFile(spec: ModuleSpec): string {
  return JSON.stringify(
    {
      'module.name': spec.displayName,
      'module.selftest.success': `${spec.displayName} self-test completed successfully.`,
      'module.selftest.failure': `${spec.displayName} self-test failed.`,
      'module.status.summary': `${spec.displayName} has run {{totalRuns}} self-test(s).`,
    },
    null,
    2,
  ) + '\n';
}

function dashboardSchemaFile(spec: ModuleSpec): string {
  const name = pascalCase(spec.slug);
  return `/**
 * ${name} dashboardSchema — describes the one status panel MDIS renders
 * for this module. Pure data, no UI code (backend-only V1).
 */
export const ${name}DashboardSchema = {
  moduleSlug: '${spec.slug}',
  panels: [
    {
      id: '${spec.slug}-selftest-status',
      title: '${spec.displayName} status',
      fields: [
        { key: 'totalRuns', label: 'Self-test runs', type: 'number' },
        { key: 'lastRunAt', label: 'Last run', type: 'datetime' },
      ],
    },
  ],
} as const;
`;
}

function eraserFile(spec: ModuleSpec): string {
  const name = pascalCase(spec.slug);
  return `import type { Knex } from 'knex';

/**
 * ${name} eraser registration — deletes every self-test row this module
 * ever wrote, for a data-erasure request. Self-test rows carry no PII, so
 * this is a hard delete rather than a soft delete for this module.
 */
export async function erase${name}Data(knex: Knex): Promise<{ deletedRows: number }> {
  const deletedRows = await knex('${tableName(spec.slug)}').delete();
  return { deletedRows };
}
`;
}

function exporterFile(spec: ModuleSpec): string {
  const name = pascalCase(spec.slug);
  return `import type { Knex } from 'knex';

/**
 * ${name} exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function export${name}Data(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('${tableName(spec.slug)}').whereNull('deletedAt').select('*');
}
`;
}

function indexFile(spec: ModuleSpec): string {
  const name = pascalCase(spec.slug);
  return `import type { Container } from '../../di/container.js';
import { CORE_TOKENS, moduleTokenNamespace } from '../../di/tokens.js';
import { ${name}Service } from './service.js';
import { ${name}Repository } from './repository.js';

/**
 * ${spec.displayName} module lifecycle hooks (onLoad/onReady/onUnload).
 * This is the ONLY place the module registers itself into the DI
 * container; every other file in the module is a plain, independently
 * testable unit. By the time onLoad runs (bootstrap Stage 12, after
 * Stage 09 DI_BOOTSTRAP), CORE_TOKENS.Db is already registered, so the
 * repository is wired to the real connection pool rather than a stub.
 */
const tokens = moduleTokenNamespace('${spec.slug}');
export const ${name}Tokens = {
  Service: tokens.token<${name}Service>('Service'),
  Repository: tokens.token<${name}Repository>('Repository'),
};

export function onLoad(container: Container): void {
  container.register(${name}Tokens.Repository, (c) => new ${name}Repository(c.resolve(CORE_TOKENS.Db).knex));
  container.register(${name}Tokens.Service, (c) =>
    new ${name}Service(c.resolve(${name}Tokens.Repository), {
      emit: (eventName, payload) => c.resolve(CORE_TOKENS.EventBus).emit(eventName, payload),
    }),
  );
}

export function onReady(): void {
  // No gateway-shaped readiness work required for this illustrative module.
}

export function onUnload(): void {
  // No held resources to release for this illustrative module.
}
`;
}

const __filenamePath = fileURLToPath(import.meta.url);
const __dirnamePath = path.dirname(__filenamePath);
const REPO_ROOT = path.resolve(__dirnamePath, '..');

export function writeModule(spec: ModuleSpec): string[] {
  const base = path.join(REPO_ROOT, 'src', 'modules', spec.slug);
  const written: string[] = [];

  const write = (relPath: string, content: string): void => {
    const full = path.join(base, relPath);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content, 'utf8');
    written.push(full);
  };

  write('manifest.ts', manifestFile(spec));
  write('service.ts', serviceFile(spec));
  write('repository.ts', repositoryFile(spec));
  write('job.ts', jobFile(spec));
  write('task.ts', taskFile(spec));
  write('route.ts', routeFile(spec));
  write('dashboard-schema.ts', dashboardSchemaFile(spec));
  write('eraser.ts', eraserFile(spec));
  write('exporter.ts', exporterFile(spec));
  write('index.ts', indexFile(spec));
  write(path.join('locales', 'en-US.json'), localeFile(spec));
  write(
    path.join('migrations', `20260102${String(spec.index).padStart(6, '0')}_create_${tableName(spec.slug)}.ts`),
    migrationFile(spec),
  );

  return written;
}

function main(): void {
  if (!existsSync(path.join(REPO_ROOT, 'src', 'modules'))) {
    throw new Error(`Expected src/modules to exist under ${REPO_ROOT}`);
  }
  let totalFiles = 0;
  for (const spec of MODULES) {
    const files = writeModule(spec);
    totalFiles += files.length;
    console.log(`[${String(spec.index).padStart(2, '0')}] ${spec.slug} (${spec.tier}) -> ${files.length} files`);
  }
  console.log(`\nGenerated ${MODULES.length} modules, ${totalFiles} files total.`);
}

const isMainModule = process.argv[1] === __filenamePath;
if (isMainModule) {
  main();
}
