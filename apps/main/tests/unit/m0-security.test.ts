import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify from 'fastify';
import { afterAll, describe, expect, test, vi } from 'vitest';
import { INTERNAL_API_HEADER, registerInternalAuth } from '../../src/http/internal-auth.js';
import { toErrorResponse } from '../../src/http/error-boundary.js';
import { buildApiServer } from '../../src/http/server.js';
import { PowerEngineDispatcher } from '../../src/http/power-engine-dispatcher.js';
import { InMemoryAuditWriter } from '../../src/http/power-engine-dispatcher.js';
import { registerAdminRoutes } from '../../src/http/routes/admin.routes.js';
import { parseEnv } from '../../src/config/env.schema.js';
import type { Logger } from '../../src/logging/logger.js';
import { ModuleRegistry } from '../../src/module-system/registry.js';
import { loadModulesFromTierVolumes } from '../../src/module-system/swastik-loader.js';
import { assertSafeSlug, assertSafeVersion, safeJoin } from '../../src/shared/utils/path-guard.js';
import { shouldProtectSwastikRoute } from '../../src/http/internal-auth.js';
import { CommandRegistry } from '../../src/commands/command-registry.js';
import { CommandRouter } from '../../src/commands/command-router.js';
import type { PermissionResolver } from '../../src/permissions/resolver.js';

const repoRoot = join(import.meta.dirname, '..', '..');

const INTERNAL_KEY = 'k'.repeat(32);

const tempRoots: string[] = [];

afterAll(() => {
  for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });
});

function silentLogger(): Logger {
  const noop = (): void => undefined;
  return {
    child: () => silentLogger(),
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    setLevel: noop,
  } as unknown as Logger;
}

interface RecordedCall {
  level: string;
  msg: string;
  ctx: unknown;
}

function recordingLogger(): Logger & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const noop = (): void => undefined;
  const record =
    (level: string) =>
    (msg: string, ctx: unknown = {}) => {
      calls.push({ level, msg, ctx });
    };
  return {
    calls,
    child: () => recordingLogger(),
    trace: record('trace'),
    debug: record('debug'),
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
    fatal: record('fatal'),
    setLevel: noop,
  } as unknown as Logger & { calls: RecordedCall[] };
}

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

interface HarnessOptions {
  trustedSources?: readonly string[];
}

function buildHarness(options: HarnessOptions = {}) {
  const app = buildApiServer({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } as never,
    progress: {} as never,
    metrics: {} as never,
    config: { get: (key: string) => (key === 'INTERNAL_API_KEY' ? INTERNAL_KEY : '') } as never,
    adminDeps: {
      dispatcher: new PowerEngineDispatcher(
        { trustedSources: options.trustedSources ?? ['127.0.0.1'] },
        { write: vi.fn() },
      ),
      db: { knex: () => ({ where: () => ({ first: vi.fn(), update: vi.fn() }) }) },
      config: { redactedSnapshot: () => ({ ok: true }) },
      auditWriter: { write: vi.fn() },
    } as never,
  });
  return app;
}

describe('M0 control-plane authentication', () => {
  test('internal auth rejects missing or incorrect keys before the route handler', async () => {
    const app = Fastify();
    let called = false;
    registerInternalAuth(app, { expectedKey: 'x'.repeat(32) });
    app.post('/internal/check', async (_request, reply) => {
      called = true;
      return reply.send({ ok: true });
    });

    const missing = await app.inject({ method: 'POST', url: '/internal/check' });
    const wrong = await app.inject({
      method: 'POST',
      url: '/internal/check',
      headers: { [INTERNAL_API_HEADER]: 'wrong' },
    });
    const allowed = await app.inject({
      method: 'POST',
      url: '/internal/check',
      headers: { [INTERNAL_API_HEADER]: 'x'.repeat(32) },
    });

    expect(missing.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
    expect(allowed.statusCode).toBe(200);
    expect(called).toBe(true);
  });

  test('PEP and Credentials entrypoints install the shared internal-auth preHandler', () => {
    expect(readSource('src/entry/pep.ts')).toContain('registerInternalAuth(app');
    expect(readSource('src/entry/credentials.ts')).toContain('registerInternalAuth(app');
  });

  test('PEP derives its source server-side instead of trusting request body source', () => {
    const source = readSource('src/entry/pep.ts');
    expect(source).toContain("source: 'pep-internal'");
    expect(source).not.toContain("source: String(body['source']");
  });
});

describe('M0 admin surface authentication (UR-A-01, UR-B-03, UR-B-06)', () => {
  test('every /admin route is refused without the internal key', async () => {
    const app = buildHarness();

    const missing = await app.inject({ method: 'GET', url: '/admin/config' });
    const wrong = await app.inject({
      method: 'GET',
      url: '/admin/config',
      headers: { [INTERNAL_API_HEADER]: 'not-the-key' },
    });
    const allowed = await app.inject({
      method: 'GET',
      url: '/admin/config',
      headers: { [INTERNAL_API_HEADER]: INTERNAL_KEY },
    });

    expect(missing.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
    expect(allowed.statusCode).toBe(200);
  });

  test('a rejected key is indistinguishable from a missing one (no failure oracle)', async () => {
    const app = buildHarness();

    const missing = await app.inject({ method: 'GET', url: '/admin/config' });
    const wrongLength = await app.inject({
      method: 'GET',
      url: '/admin/config',
      headers: { [INTERNAL_API_HEADER]: 'k'.repeat(31) },
    });
    const wrongValue = await app.inject({
      method: 'GET',
      url: '/admin/config',
      headers: { [INTERNAL_API_HEADER]: 'x'.repeat(32) },
    });

    expect(missing.json()).toStrictEqual(wrongLength.json());
    expect(missing.json()).toStrictEqual(wrongValue.json());
    expect(missing.json()).not.toHaveProperty('keyFingerprint');
  });

  test('the key gate does not swallow non-admin routes on the same server', async () => {
    const app = buildHarness();
    const res = await app.inject({ method: 'GET', url: '/api/info' });
    expect(res.statusCode).toBe(200);
  });

  test('a body-supplied source no longer satisfies the trusted-source allow-list', async () => {
    const app = buildHarness({ trustedSources: ['pep-internal'] });

    const forged = await app.inject({
      method: 'POST',
      url: '/admin/system/maintenance-mode',
      headers: { [INTERNAL_API_HEADER]: INTERNAL_KEY },
      body: { actorId: 'admin', source: 'pep-internal', reason: 'spoofed', enabled: true },
    });

    expect(forged.statusCode).toBe(403);
    expect(forged.json().error?.rejectionReason).toBe('UNTRUSTED_SOURCE');
  });

  test('a genuinely trusted network peer is still admitted', async () => {
    const app = buildHarness({ trustedSources: ['127.0.0.1'] });

    const res = await app.inject({
      method: 'POST',
      url: '/admin/system/maintenance-mode',
      headers: { [INTERNAL_API_HEADER]: INTERNAL_KEY },
      body: { actorId: 'admin', reason: 'real maintenance', enabled: true },
    });

    expect(res.statusCode).toBe(200);
  });

  test('admin extractRequest ignores a source supplied in the body', () => {
    const source = readSource('src/http/routes/admin.routes.ts');
    expect(source).toContain('source: request.ip');
    expect(source).not.toContain("source: b.source ?? ''");
  });
});

describe('M0 bind-host configurability (UR-B-03)', () => {
  const base = {
    DATABASE_URL: 'postgres://localhost/dumby_test',
    REDIS_URL: 'redis://localhost:6379/0',
    QUEUE_REDIS_URL: 'redis://localhost:6379/1',
    INTERNAL_API_KEY: INTERNAL_KEY,
    ENCRYPTION_ROOT_KEY: 'JF8PejG/00/nD5iuxpUtzGqh5MWW3yL1Oj6EcWYPgzM=',
    DEV_GUILD_ID: '900000000000000001',
  };

  test('internal surfaces default to loopback rather than 0.0.0.0', () => {
    const env = parseEnv(base);
    expect(env.API_BIND_HOST).toBe('127.0.0.1');
    expect(env.HEALTH_BIND_HOST).toBe('127.0.0.1');
    expect(env.METRICS_BIND_HOST).toBe('127.0.0.1');
  });

  test('a bind host can be overridden explicitly for container deployments', () => {
    const env = parseEnv({ ...base, API_BIND_HOST: '0.0.0.0' });
    expect(env.API_BIND_HOST).toBe('0.0.0.0');
  });

  test('bootstrap no longer hardcodes a wildcard bind address', () => {
    const source = readSource('src/bootstrap/bootstrap.ts');
    expect(source).not.toContain("host: '0.0.0.0'");
    expect(source).toContain("config.get('API_BIND_HOST')");
    expect(source).toContain("config.get('HEALTH_BIND_HOST')");
    expect(source).toContain("config.get('METRICS_BIND_HOST')");
  });
});

describe('M0 Swastik path containment', () => {
  test('path guards reject traversal slugs and versions', () => {
    expect(() => safeJoin('/tmp/dumby-root', '../escape')).toThrow('path escapes root');
    expect(() => assertSafeSlug('../../bad')).toThrow('module slug must be lowercase kebab-case');
    expect(() => assertSafeVersion('../../1.0.0')).toThrow('module version must be semver-like');
  });

  test('internal deploy requires the internal key and never auto-approves developers', () => {
    const source = readSource('src/entry/swastik.ts');
    expect(source).toContain("app.post('/internal/deploy'");
    // Slice 5 replaced the hand-rolled `requireInternalKey` helper with the shared
    // `registerInternalAuth` preHandler, which enforces the same constant-time check (and more).
    // The intent of this assertion — deploy is key-gated — is unchanged; only the mechanism is.
    expect(source).toContain('registerInternalAuth(app, {');
    expect(source).toContain('shouldProtect: shouldProtectSwastikRoute');
    expect(source).toContain('developer is not registered for deployment');
    expect(source).not.toContain('swastik-auto-dev-created');
    expect(source).not.toContain("approvalStatus: 'approved',");
  });
});

describe('M0 tier-volume loader path containment (UR-B-02, UR-C-01, UR-C-07 loader half)', () => {
  function writeModule(
    moduleDir: string,
    manifest: Record<string, unknown>,
    indexSource = 'export const onLoad = () => undefined;\n',
  ): void {
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(join(moduleDir, 'manifest.json'), JSON.stringify(manifest));
    writeFileSync(join(moduleDir, 'index.js'), indexSource);
  }

  function baseManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      name: 'escapee',
      version: '1.0.0',
      description: 'loader containment fixture',
      tier: 'core',
      hardcoded: false,
      required: false,
      depends: [],
      provides: [],
      intents: [],
      partials: [],
      commands: [],
      events: [],
      services: [],
      repositories: [],
      jobs: [],
      tasks: [],
      routes: [],
      middleware: [],
      migrations: [],
      locales: ['en-US'],
      config: {},
      eventsCatalog: [],
      crossModuleReads: [],
      ...overrides,
    };
  }

  function tempRoot(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempRoots.push(dir);
    return dir;
  }

  test('a tier-volume entry that symlinks outside the module root is refused, not imported', async () => {
    const modulesDir = tempRoot('dumby-loader-escape-');
    const outside = tempRoot('dumby-loader-outside-');
    mkdirSync(join(modulesDir, 'modules-core'), { recursive: true });
    writeModule(
      join(outside, 'planted'),
      baseManifest(),
      'export const PLANTED = true;\nexport const onLoad = () => undefined;\n',
    );
    symlinkSync(join(outside, 'planted'), join(modulesDir, 'modules-core', 'escapee'));

    const registry = new ModuleRegistry();
    await expect(
      loadModulesFromTierVolumes({ modulesDir, registry, logger: silentLogger() }),
    ).rejects.toThrow('modules-core/escapee');
    expect(registry.count()).toBe(0);
  });

  test('the escape is refused by containment, not by a downstream load error', async () => {
    const modulesDir = tempRoot('dumby-loader-escape-reason-');
    const outside = tempRoot('dumby-loader-outside-reason-');
    mkdirSync(join(modulesDir, 'modules-core'), { recursive: true });
    writeModule(join(outside, 'planted'), baseManifest());
    symlinkSync(join(outside, 'planted'), join(modulesDir, 'modules-core', 'escapee'));

    const logger = recordingLogger();
    await expect(
      loadModulesFromTierVolumes({ modulesDir, registry: new ModuleRegistry(), logger }),
    ).rejects.toThrow();
    const failure = logger.calls.find((call) => call.msg === 'module-volume-load-failed');
    expect(failure).toBeDefined();
    expect(String(failure?.ctx.error)).toContain('escapes root');
  });

  test('a symlink that stays inside the module root is still loaded', async () => {
    const modulesDir = tempRoot('dumby-loader-inside-');
    mkdirSync(join(modulesDir, 'modules-core'), { recursive: true });
    mkdirSync(join(modulesDir, 'swastik-staging'), { recursive: true });
    writeModule(join(modulesDir, 'swastik-staging', 'escapee__1.0.0'), baseManifest());
    symlinkSync(
      join(modulesDir, 'swastik-staging', 'escapee__1.0.0'),
      join(modulesDir, 'modules-core', 'escapee'),
    );

    const registry = new ModuleRegistry();
    const result = await loadModulesFromTierVolumes({
      modulesDir,
      registry,
      logger: silentLogger(),
    });

    expect(result.failed).toStrictEqual([]);
    expect(result.loaded).toStrictEqual(['escapee']);
  });

  test('a promoted directory whose version segment is not semver is refused', async () => {
    const modulesDir = tempRoot('dumby-loader-badversion-');
    mkdirSync(join(modulesDir, 'modules-core'), { recursive: true });
    writeModule(
      join(modulesDir, 'modules-core', 'health__not_a_version'),
      baseManifest({ name: 'health' }),
    );

    await expect(
      loadModulesFromTierVolumes({
        modulesDir,
        registry: new ModuleRegistry(),
        logger: silentLogger(),
      }),
    ).rejects.toThrow('modules-core/health__not_a_version');
  });

  test('a directory name that is neither a slug nor <slug>__<version> is refused', async () => {
    const modulesDir = tempRoot('dumby-loader-badname-');
    mkdirSync(join(modulesDir, 'modules-core'), { recursive: true });
    for (const badName of ['Not A Slug', 'Modules_Core', '9lives', 'health..bak']) {
      writeModule(join(modulesDir, 'modules-core', badName), baseManifest({ name: 'not-a-slug' }));
    }

    await expect(
      loadModulesFromTierVolumes({
        modulesDir,
        registry: new ModuleRegistry(),
        logger: silentLogger(),
      }),
    ).rejects.toThrow(
      'modules-core/9lives, modules-core/Modules_Core, modules-core/Not A Slug, modules-core/health..bak',
    );
  });

  test('a manifest whose name disagrees with its directory is refused', async () => {
    const modulesDir = tempRoot('dumby-loader-namemismatch-');
    mkdirSync(join(modulesDir, 'modules-core'), { recursive: true });
    writeModule(
      join(modulesDir, 'modules-core', 'health'),
      baseManifest({ name: 'permit', tier: 'core' }),
    );

    const logger = recordingLogger();
    await expect(
      loadModulesFromTierVolumes({ modulesDir, registry: new ModuleRegistry(), logger }),
    ).rejects.toThrow('modules-core/health');
    const failure = logger.calls.find((call) => call.msg === 'module-volume-load-failed');
    expect(String(failure?.ctx.error)).toContain(
      'manifest name "permit" does not match module directory "health"',
    );
  });

  test('a manifest whose version disagrees with its promoted directory is refused', async () => {
    const modulesDir = tempRoot('dumby-loader-versionmismatch-');
    mkdirSync(join(modulesDir, 'modules-core'), { recursive: true });
    writeModule(
      join(modulesDir, 'modules-core', 'health__2.0.0'),
      baseManifest({ name: 'health', tier: 'core', version: '1.0.0' }),
    );

    const logger = recordingLogger();
    await expect(
      loadModulesFromTierVolumes({ modulesDir, registry: new ModuleRegistry(), logger }),
    ).rejects.toThrow('modules-core/health__2.0.0');
    const failure = logger.calls.find((call) => call.msg === 'module-volume-load-failed');
    expect(String(failure?.ctx.error)).toContain(
      'manifest version "1.0.0" does not match promoted directory version "2.0.0"',
    );
  });

  test('promotion transient entries are still skipped, not failed', async () => {
    const modulesDir = tempRoot('dumby-loader-transient-');
    mkdirSync(join(modulesDir, 'modules-core'), { recursive: true });
    writeModule(join(modulesDir, 'modules-core', 'health'), baseManifest({ name: 'health' }));
    for (const transient of ['health__rollback', 'health__incoming', '.hidden']) {
      mkdirSync(join(modulesDir, 'modules-core', transient), { recursive: true });
    }

    const result = await loadModulesFromTierVolumes({
      modulesDir,
      registry: new ModuleRegistry(),
      logger: silentLogger(),
    });

    expect(result.loaded).toStrictEqual(['health']);
    expect(result.failed).toStrictEqual([]);
  });
});

describe('M0 Swastik error handler does not leak absolute server paths (finding #2)', () => {
  test('the Swastik instance installs a path-guard-aware error handler', () => {
    const source = readSource('src/entry/swastik.ts');
    expect(source).toContain('app.setErrorHandler');
    expect(source).toContain("name === 'PathGuardError'");
    expect(source).toContain('PATH_GUARD_REJECTION');
  });

  test('the rejection body is static and carries no server path', () => {
    const source = readSource('src/entry/swastik.ts');
    const body = /const PATH_GUARD_REJECTION =\s*'([^']*)'/.exec(source)?.[1] ?? '';
    expect(body).not.toBe('');
    expect(body).not.toContain('/mnt/');
    expect(body).not.toContain('escapes root');
  });

  test('a PathGuardError is answered with a 400, not a 500 that echoes the path', () => {
    const guard = new Error('path "/etc" escapes root "/mnt/modules"') as Error & { name: string };
    guard.name = 'PathGuardError';
    const mapped = toErrorResponse(guard);
    expect(mapped.statusCode).toBe(500);
    expect(JSON.stringify(mapped.body)).not.toContain('/mnt/modules');
  });
});

describe('M0 control plane reports no fake successes (UR-A-04, finding #7)', () => {
  const FAKE_SUCCESS_ROUTES = [
    { path: '/admin/power-engine/feature-flags/toggle', action: 'feature-flags.toggle' },
    { path: '/admin/power-engine/pauseQueue', action: 'pauseQueue' },
    { path: '/admin/power-engine/resumeQueue', action: 'resumeQueue' },
    { path: '/admin/power-engine/requeueDeadLetter', action: 'requeueDeadLetter' },
    { path: '/admin/power-engine/overrideRateLimit', action: 'overrideRateLimit' },
    { path: '/admin/power-engine/restartShardGroup', action: 'restartShardGroup' },
    { path: '/admin/power-engine/triggerCoreRestart', action: 'triggerCoreRestart' },
    { path: '/admin/power-engine/rollbackModuleVersion', action: 'rollbackModuleVersion' },
  ] as const;

  function buildAdminHarness() {
    const dispatcher = { dispatch: vi.fn() };
    const knex = vi.fn();
    const app = Fastify();
    registerAdminRoutes(app, {
      dispatcher,
      db: { knex },
      config: { redactedSnapshot: () => ({ ok: true }) },
      auditWriter: { write: vi.fn() },
    } as never);
    return { app, dispatcher, knex };
  }

  test('every route that used to fake success now answers honest 501', async () => {
    const { app, dispatcher, knex } = buildAdminHarness();

    for (const { path, action } of FAKE_SUCCESS_ROUTES) {
      const res = await app.inject({
        method: 'POST',
        url: path,
        body: { actorId: 'admin', reason: 'test', queueName: 'default' },
      });
      expect(res.statusCode, path).toBe(501);
      expect(res.json().error?.code, path).toBe('NOT_IMPLEMENTED');
      expect(res.json().error?.message as string, path).toContain(action);
    }

    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    expect(knex).not.toHaveBeenCalled();
  });

  test('a refused fake-success action writes no state and dispatches nothing', async () => {
    const { app, knex, dispatcher } = buildAdminHarness();

    const res = await app.inject({
      method: 'POST',
      url: '/admin/power-engine/pauseQueue',
      body: { actorId: 'admin', reason: 'incident', queueName: 'guild-commands' },
    });

    expect(res.statusCode).toBe(501);
    expect(JSON.stringify(res.json())).not.toContain('queue_paused');
    expect(knex).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  test('no admin route still returns 200 for an action that performs no operation', () => {
    const source = readSource('src/http/routes/admin.routes.ts');
    expect(source).not.toMatch(/dispatch\('[\w.-]+', body, async \(\) => \{\}\)/);
    for (const key of [
      'queue_paused',
      'deadletter-requeue',
      'ratelimit-override',
      'restart-shard',
      'core-restart',
      'rollback:',
    ]) {
      expect(source, key).not.toContain(key);
    }
  });

  test('PEP no longer claims completion and no longer answers 200 on a rejection', () => {
    const source = readSource('src/entry/pep.ts');
    expect(source).toContain("code: 'NOT_IMPLEMENTED'");
    expect(source).toContain('throw new PepActionNotImplementedError(functionName)');
    expect(source).toContain('reply.code(403).send');
    expect(source).toContain("code: 'DUMBY_POWER_ENGINE_REJECTED'");
    expect(source).not.toContain('async () => body');
    expect(source).not.toContain('reply.code(200).send(result)');
  });

  test('CLAI no longer reports OK for an operation it does not perform', () => {
    const source = readSource('src/entry/ssh-clai.ts');
    expect(source).toContain('NOT IMPLEMENTED');
    expect(source).not.toContain('OK: ${functionName} completed');
    expect(source).not.toContain('async () => args');
    expect(source).toContain('throw new PepActionNotImplementedError(functionName)');
  });

  test('a throwing PEP handler is what keeps the audit honest', async () => {
    const auditWriter = new InMemoryAuditWriter();
    const dispatcher = new PowerEngineDispatcher({ trustedSources: ['pep-internal'] }, auditWriter);

    await expect(
      dispatcher.dispatch(
        'economy.balance-adjust',
        { actorId: 'owner-1', source: 'pep-internal', reason: 'test' },
        async () => {
          throw new Error('not implemented');
        },
      ),
    ).rejects.toThrow('not implemented');
    expect(auditWriter.entries).toStrictEqual([]);
  });
});

describe('M0 CLAI transport', () => {
  test('CLAI uses ssh2 public-key transport and no plaintext TCP REPL entry remains', () => {
    const source = readSource('src/entry/ssh-clai.ts');
    expect(source).toContain("from 'ssh2'");
    expect(source).toContain("ctx.method !== 'publickey'");
    expect(source).toContain('startClaiSshServer');
  });
});

describe('M0 command scope fails closed on an unresolved module tier (UR-A-03)', () => {
  function makeRouterInteraction(guildId: string | null, name = 'ops') {
    return {
      commandName: name,
      user: { id: 'u1' },
      guildId,
      reply: vi.fn().mockResolvedValue(undefined),
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
    };
  }

  function noticeText(interaction: { editReply: ReturnType<typeof vi.fn> }): string {
    const calls = interaction.editReply.mock.calls;
    const last =
      calls.length > 0 ? (calls[calls.length - 1]?.[0] as { components?: unknown }) : undefined;
    const out: string[] = [];
    const walk = (components: readonly unknown[]): void => {
      for (const component of components) {
        const comp = component as { type?: number; content?: string; components?: unknown[] };
        if (comp.type === 10 && typeof comp.content === 'string') out.push(comp.content);
        if (Array.isArray(comp.components)) walk(comp.components);
      }
    };
    for (const component of Array.isArray(last?.components) ? last.components : []) {
      const comp = component as { components?: unknown[] };
      if (Array.isArray(comp.components)) walk(comp.components);
      else walk([component]);
    }
    return out.join('\n');
  }

  // The permission resolver is stubbed to allow everything on purpose. Layer 7 of the real
  // resolver denies any command that lacks `permissionDeclared`, which would otherwise mask the
  // tier defect: the command would be stopped for an unrelated reason and the test would pass
  // even against the fail-open code. An always-allow resolver isolates the tier check as the
  // only thing that can deny.
  function buildRouter(options: {
    registerTier: boolean;
    permissionDeclared: boolean;
    devGuildId?: string;
  }) {
    const registry = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue(undefined);
    if (options.registerTier) registry.registerModule('ops', 'core');
    // Deliberately no registerModule when registerTier is false: the module never registered one.
    registry.register({
      data: { name: 'ops', description: 'O' },
      execute: handler,
      moduleId: 'ops',
      permissionDeclared: options.permissionDeclared,
    });
    const permissionResolver = {
      resolve: vi.fn().mockReturnValue({ allowed: true, layerIndex: 0, reason: 'ok' }),
    } as unknown as PermissionResolver;
    const router = new CommandRouter(registry, silentLogger(), {
      devGuildId: options.devGuildId ?? 'dev',
      permissionResolver,
    });
    return { router, handler, permissionResolver };
  }

  test('a properly declared command with an unresolved tier is denied, not executed', async () => {
    const { router, handler } = buildRouter({ registerTier: false, permissionDeclared: true });
    const interaction = makeRouterInteraction('g1');

    await router.dispatch(interaction);

    expect(handler).not.toHaveBeenCalled();
    expect(noticeText(interaction)).toContain('Not permitted');
  });

  test('an unresolved tier cannot execute in a guild it was never scoped to', async () => {
    // The exploit this row exists to close: an admin-tier module whose tier never registered
    // would previously skip every scope check and run in any guild.
    const { router, handler } = buildRouter({ registerTier: false, permissionDeclared: true });
    const interaction = makeRouterInteraction('attacker-guild');

    await router.dispatch(interaction);

    expect(handler).not.toHaveBeenCalled();
    expect(noticeText(interaction)).toContain('Not permitted');
  });

  test('an unresolved tier cannot borrow the dev guild to satisfy the admin gate', async () => {
    // The sharp inverse: an admin-tier command may legitimately run in the dev guild, but with an
    // unresolved tier nothing can prove it is admin, so the best case must not be assumed.
    const { router, handler } = buildRouter({
      registerTier: false,
      permissionDeclared: true,
      devGuildId: 'dev',
    });
    const interaction = makeRouterInteraction('dev');

    await router.dispatch(interaction);

    expect(handler).not.toHaveBeenCalled();
    expect(noticeText(interaction)).toContain('Not permitted');
  });

  test('the permission engine is never consulted with a silently coerced standard tier', async () => {
    const { router, handler, permissionResolver } = buildRouter({
      registerTier: false,
      permissionDeclared: true,
    });

    await router.dispatch(makeRouterInteraction('g1'));

    expect(permissionResolver.resolve).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  test('the denial is reported as FORBIDDEN, never as a module fault', async () => {
    // Regression guard on the error->reason mapping. A new error class would fall through
    // core-renderer's default branch and be shown to the user as "Module error", blaming the
    // module for what is a wiring defect. CommandScopeDeniedError is reused precisely so the
    // renderer maps it to FORBIDDEN without that file being in the blast radius.
    const { router } = buildRouter({ registerTier: false, permissionDeclared: true });
    const interaction = makeRouterInteraction('g1');

    await router.dispatch(interaction);

    const text = noticeText(interaction);
    expect(text).toContain('Your permissions do not allow this action.');
    expect(text).not.toContain('Module error');
  });

  test('a command whose module tier IS resolved still executes (no regression)', async () => {
    const { router, handler } = buildRouter({ registerTier: true, permissionDeclared: true });

    await router.dispatch(makeRouterInteraction('g1'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('a resolved admin tier is still confined to the dev guild (no regression)', async () => {
    const registry = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue(undefined);
    registry.registerModule('ops', 'admin');
    registry.register({
      data: { name: 'ops', description: 'O' },
      execute: handler,
      moduleId: 'ops',
      permissionDeclared: true,
    });
    const permissionResolver = {
      resolve: vi.fn().mockReturnValue({ allowed: true, layerIndex: 0, reason: 'ok' }),
    } as unknown as PermissionResolver;
    const router = new CommandRouter(registry, silentLogger(), {
      devGuildId: 'dev',
      permissionResolver,
    });
    const interaction = makeRouterInteraction('g1');

    await router.dispatch(interaction);

    expect(handler).not.toHaveBeenCalled();
    expect(noticeText(interaction)).toContain('Not permitted');
  });
});

describe('M0 Swastik internal surfaces are authenticated (UR-C-02, findings #5, #6)', () => {
  function shouldProtect(method: string, url: string): boolean {
    return shouldProtectSwastikRoute({ method, url });
  }

  test('every /internal/* route requires the service key', () => {
    expect(shouldProtect('POST', '/internal/reload')).toBe(true);
    expect(shouldProtect('POST', '/internal/deploy')).toBe(true);
    expect(shouldProtect('DELETE', '/internal/anything-not-yet-written')).toBe(true);
  });

  test('the two previously ungated routes now require the service key', () => {
    // Finding #6: an unauthenticated write that inserted into developers + licenses and
    // returned the devId, which is the bearer credential for every other developer route.
    expect(shouldProtect('POST', '/swastik/developers/register')).toBe(true);
    // Finding #5: unauthenticated operational disclosure (dev/build counts + absolute volume paths).
    expect(shouldProtect('GET', '/swastik/status')).toBe(true);
  });

  test('the developer bearer routes stay reachable without the service key', () => {
    // These carry their own per-developer credential; gating them on the service key would
    // break the developer flow without adding any security.
    expect(shouldProtect('GET', '/swastik/developers/me')).toBe(false);
    expect(shouldProtect('POST', '/swastik/modules/upload')).toBe(false);
    expect(shouldProtect('GET', '/swastik/modules/catnip/builds/b_123')).toBe(false);
  });

  test('the policy is fail-closed for a route nobody has classified yet', () => {
    // The important property: an unknown future route is protected by default, so adding one
    // cannot silently create a new unauthenticated hole.
    expect(shouldProtect('GET', '/swastik/some-new-route')).toBe(true);
    expect(shouldProtect('POST', '/swastik/modules/catnip/promote')).toBe(true);
    expect(shouldProtect('GET', '/')).toBe(true);
  });

  test('a query string cannot smuggle a request past the exemption list', () => {
    expect(shouldProtect('GET', '/swastik/developers/me?force=1')).toBe(false);
    expect(shouldProtect('GET', '/swastik/status?devId=x')).toBe(true);
    expect(shouldProtect('GET', '/internal/reload?module=../etc')).toBe(true);
  });

  test('an exemption cannot be borrowed by prefix or by a different method', () => {
    expect(shouldProtect('POST', '/swastik/developers/me')).toBe(true);
    expect(shouldProtect('DELETE', '/swastik/developers/me')).toBe(true);
    expect(shouldProtect('GET', '/swastik/developers/me/extra')).toBe(true);
    expect(shouldProtect('GET', '/swastik/modules/a/b/builds/c/d')).toBe(true);
  });

  test('swastik.ts installs the shared constant-time gate and no longer hand-rolls one', () => {
    const source = readSource('src/entry/swastik.ts');
    expect(source).toContain('registerInternalAuth(app, {');
    expect(source).toContain('shouldProtect: shouldProtectSwastikRoute');
    expect(source).toContain('INTERNAL_AUTH_DENIED');
    // The duplicated per-handler check is gone; the preHandler is the only gate.
    expect(source).not.toContain('requireInternalKey');
    expect(source).not.toContain('constantTimeEqual');
  });

  test('the auth hook is registered after init() assigns the parsed env', () => {
    // init() is what assigns `env`. Registering the hook at module scope would capture an
    // undefined INTERNAL_API_KEY and reject every caller, including a correct one.
    const source = readSource('src/entry/swastik.ts');
    const initIdx = source.indexOf('await init();');
    const hookIdx = source.indexOf('registerInternalAuth(app, {');
    expect(initIdx).toBeGreaterThan(-1);
    expect(hookIdx).toBeGreaterThan(initIdx);
    expect(hookIdx).toBeLessThan(source.indexOf('await app.listen('));
  });

  test('the healthcheck and the verify script both present the key', () => {
    const compose = readSource('docker-compose.yml');
    expect(compose).toContain("'x-internal-api-key':process.env.INTERNAL_API_KEY");
    const verify = readSource('scripts/verify-all.ts');
    expect(verify).toContain("'x-internal-api-key': internalKey");
  });

  // The UR's second clause is "CLI sends header". Enumerating the clients here is deliberate:
  // swastik-deploy.ts was missed on the first pass of this slice and was already broken against
  // the pre-slice-5 gate, so nothing in the suite would have reported it. One test per client,
  // rather than one test looping, so a failure names the file and route on its own.
  const gatedSurfaceClients: ReadonlyArray<readonly [string, string]> = [
    ['/internal/deploy', 'scripts/swastik-deploy.ts'],
    ['/internal/deploy', 'scripts/seed-first-party-modules.ts'],
    ['/swastik/status', 'scripts/verify-all.ts'],
  ];

  for (const [route, file] of gatedSurfaceClients) {
    test(`client ${file} calls ${route} with the internal key`, () => {
      const source = readSource(file);
      expect(source).toContain(route);
      expect(source).toMatch(/INTERNAL_API_HEADER|'x-internal-api-key'/);
    });
  }
});
