import { describe, expect, it } from 'vitest';
import { startFlow } from './harness.js';

describe('flow: bootstrap → shutdown', () => {
  it('boots, serves, then shuts down cleanly and stops serving', async () => {
    const ctx = await startFlow();
    const up = await fetch('http://127.0.0.1:18900/api/info');
    expect(up.status).toBe(200);

    await ctx.handle.shutdown('SIGTERM');

    await expect(
      fetch('http://127.0.0.1:18900/api/info', { signal: AbortSignal.timeout(2000) }),
    ).rejects.toBeTruthy();
    await ctx.teardown();
  }, 120_000);
});
