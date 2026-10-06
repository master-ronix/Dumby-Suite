import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFlow, type FlowContext } from './harness.js';
import { FLOW_GUILD_ID } from './flow-env.js';
import { CORE_TOKENS } from '../../src/di/tokens.js';

const BASE = 'http://127.0.0.1:18900';
const KEY = 'x'.repeat(40);
const auth = { 'x-internal-api-key': KEY };

let ctx: FlowContext;
beforeAll(async () => {
  ctx = await startFlow();
}, 120_000);
afterAll(async () => {
  await ctx.teardown();
}, 120_000);

describe('flow: the MDIS + operational surfaces are wired and guarded', () => {
  it('serves the MDIS catalog to an authorised operator', async () => {
    const res = await fetch(`${BASE}/mdis/catalog`, { headers: auth });
    expect(res.status).toBe(200);
    expect(Array.isArray(((await res.json()) as { modules: unknown[] }).modules)).toBe(true);
  });

  it('refuses the MDIS catalog without the internal key', async () => {
    const res = await fetch(`${BASE}/mdis/catalog`);
    expect(res.status).toBe(401);
  });

  it("lists a guild's installed modules", async () => {
    const res = await fetch(`${BASE}/mdis/guilds/${FLOW_GUILD_ID}/installed`, { headers: auth });
    expect(res.status).toBe(200);
  });

  it('404s an install of an unknown module', async () => {
    const res = await fetch(`${BASE}/mdis/guilds/${FLOW_GUILD_ID}/install`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ slug: 'does-not-exist' }),
    });
    expect(res.status).toBe(404);
  });

  it('serves operational status and the runbook index', async () => {
    const status = await fetch(`${BASE}/operational/status`, { headers: auth });
    expect(status.status).toBe(200);
    expect(((await status.json()) as { modulesLoaded: number }).modulesLoaded).toBeTypeOf('number');
    const runbooks = await fetch(`${BASE}/operational/runbooks`, { headers: auth });
    expect(runbooks.status).toBe(200);
    expect(Array.isArray(((await runbooks.json()) as { runbooks: string[] }).runbooks)).toBe(true);
  });
});

describe('flow: core subsystems coordinate', () => {
  it('delivers an event through the bus to its subscriber', async () => {
    const received: unknown[] = [];
    ctx.handle.eventBus.on('dumby.flow.ping', (payload) => {
      received.push(payload);
    });
    await ctx.handle.eventBus.emit('dumby.flow.ping', { n: 1 });
    expect(received).toHaveLength(1);
  });

  it('caches on first read and recomputes after invalidation', async () => {
    const cache = ctx.handle.container.resolve(CORE_TOKENS.Cache);
    expect(await cache.get('flow:key', async () => ({ v: 1 }))).toEqual({ v: 1 });
    // Second read is served from cache — the recompute is not called.
    expect(await cache.get('flow:key', async () => ({ v: 2 }))).toEqual({ v: 1 });
    await cache.invalidate('flow:key');
    expect(await cache.get('flow:key', async () => ({ v: 3 }))).toEqual({ v: 3 });
  });
});
