import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFlow, type FlowContext } from './harness.js';

let ctx: FlowContext;
beforeAll(async () => {
  ctx = await startFlow();
}, 120_000);
afterAll(async () => {
  await ctx.teardown();
}, 120_000);

describe('flow: bootstrap → live wiring', () => {
  it('boots the full runtime wiring', () => {
    expect(ctx.handle.moduleRegistry).toBeDefined();
    expect(ctx.handle.commandRegistry).toBeDefined();
    expect(ctx.handle.commandRouter).toBeDefined();
    expect(ctx.handle.renderer).toBeDefined();
    expect(ctx.handle.eventBus).toBeDefined();
    expect(ctx.handle.apiServer).toBeDefined();
  });

  it('serves the API info endpoint', async () => {
    const res = await fetch('http://127.0.0.1:18900/api/info');
    expect(res.status).toBe(200);
    expect(((await res.json()) as { name: string }).name).toBe('dumby-headless-backend');
  });

  it('serves health readiness 200 once booted', async () => {
    const res = await fetch('http://127.0.0.1:18901/health/readiness');
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe('ready');
  });
});
