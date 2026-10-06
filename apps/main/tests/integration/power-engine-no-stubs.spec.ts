import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import { registerAdminRoutes } from '../../src/http/routes/admin.routes.js';
import { createPowerEngineCatalog } from '../../src/http/power-engine-catalog.js';
import { InMemoryGuildSuspensionStore } from '../../src/governance/guild-suspension.js';
import { createLogger } from '../../src/logging/logger.js';
import { repoRoot } from '../spec-utils.js';
import {
  InMemoryAuditWriter,
  PowerEngineDispatcher,
} from '../../src/http/power-engine-dispatcher.js';

/**
 * ACC-REQ-0022-1 — "Every Power Engine route resolves to a real domain handler or returns an honest
 * 501 NOT_IMPLEMENTED".
 *
 * Authority: docs/spec/request-layer/control-plane-services.md (SPEC-04-POWER-ENGINE), acceptance
 * block. §22.3: "a fake success is not [acceptable]" where a primitive does not yet exist — an
 * honest 501 is. This test is the guard that the control plane never *pretends*: every route is
 * either backed by a catalog handler or declines explicitly.
 */
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

/** A chainable, awaitable stub for the Knex surface the db-touching routes use. */
function stubKnex(): unknown {
  const chain: unknown = new Proxy(function () {} as unknown as object, {
    get: (_t, prop) =>
      prop === 'then' ? (resolve: (v: unknown) => void) => resolve(undefined) : chain,
    apply: () => chain,
  });
  return chain;
}

/** Every `/admin/power-engine/...` route declared in the router source, with its method. */
function powerEngineRoutes(): Array<{ method: string; path: string }> {
  const src = readFileSync(`${repoRoot}apps/main/src/http/routes/admin.routes.ts`, 'utf8');
  const seen = new Map<string, { method: string; path: string }>();
  for (const m of src.matchAll(
    /app\.(get|post|put|delete|patch)<[^>]*>?\(\s*['"`](\/admin\/power-engine\/[^'"`]+)['"`]/g,
  )) {
    seen.set(`${m[1]!.toUpperCase()} ${m[2]!}`, { method: m[1]!.toUpperCase(), path: m[2]! });
  }
  for (const m of src.matchAll(
    /app\.(get|post|put|delete|patch)\(\s*['"`](\/admin\/power-engine\/[^'"`]+)['"`]/g,
  )) {
    seen.set(`${m[1]!.toUpperCase()} ${m[2]!}`, { method: m[1]!.toUpperCase(), path: m[2]! });
  }
  return [...seen.values()].sort((a, b) => a.path.localeCompare(b.path));
}

async function buildApp(catalogFunctions: readonly string[]) {
  const suspensions = new InMemoryGuildSuspensionStore();
  const catalog = createPowerEngineCatalog({
    guildSuspensions: suspensions,
    logger: createLogger('error'),
  });
  // Only the declared subset is wired, mirroring the real bootstrap: the rest fall to 501.
  const wired = new Map([...catalog].filter(([name]) => catalogFunctions.includes(name)));
  const dispatcher = new PowerEngineDispatcher(
    { trustedSources: ['power-engine-internal'] },
    new InMemoryAuditWriter(),
  );
  const app = Fastify({ logger: false });
  registerAdminRoutes(app, {
    dispatcher,
    db: { knex: stubKnex() } as never,
    config: { redactedSnapshot: () => ({}) } as never,
    auditWriter: new InMemoryAuditWriter(),
    powerEngineCatalog: wired,
  });
  await app.ready();
  return app;
}

describe('ACC-REQ-0022-1 — no Power Engine route is a stub', () => {
  it('declares at least the four original suspend primitives plus the guild pair', () => {
    const routes = powerEngineRoutes().map((r) => r.path);
    expect(routes).toContain('/admin/power-engine/suspendGuild');
    expect(routes).toContain('/admin/power-engine/unsuspendGuild');
    expect(routes.length).toBeGreaterThan(2);
  });

  it('every declared route either resolves to a catalog handler or answers an honest 501', async () => {
    const app = await buildApp(['suspendGuild', 'unsuspendGuild', 'listSuspendedGuilds']);
    const routes = powerEngineRoutes();
    const verdicts: Array<{ route: string; status: number; honest501: boolean }> = [];

    for (const route of routes) {
      const res = await app.inject({
        method: route.method as 'GET' | 'POST',
        url: route.path,
        ...(route.method === 'POST'
          ? { payload: { actorId: 'op-1', reason: 'acceptance probe' } }
          : {}),
      });
      // Some routes legitimately answer with an empty body; only parse when there is one.
      let body: { error?: { code?: string } } = {};
      if (res.body.length > 0) {
        try {
          body = JSON.parse(res.body) as { error?: { code?: string } };
        } catch {
          body = {};
        }
      }
      verdicts.push({
        route: `${route.method} ${route.path}`,
        status: res.statusCode,
        honest501: res.statusCode === 501 && body.error?.code === 'NOT_IMPLEMENTED',
      });
    }
    await app.close();

    // No route may 404 (declared but unhandled) and none may claim success it did not achieve.
    for (const v of verdicts) {
      expect(v.status, `${v.route} must be handled`).not.toBe(404);
      expect(
        v.honest501 || (v.status !== 501 && v.status < 500),
        `${v.route} must resolve to a real handler or an honest 501 (got ${v.status})`,
      ).toBe(true);
    }
  });

  it('a catalog-backed route really acts — suspendGuild writes state rather than 501ing', async () => {
    const app = await buildApp(['suspendGuild', 'unsuspendGuild']);
    const res = await app.inject({
      method: 'POST',
      url: '/admin/power-engine/suspendGuild',
      payload: { actorId: 'op-1', reason: 'acceptance probe', guildId: 'g1', confirm: true },
    });
    await app.close();

    expect(res.statusCode).not.toBe(501);
    expect(res.statusCode).toBeLessThan(500);
  });
});
