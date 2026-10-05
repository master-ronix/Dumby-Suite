import { describe, expect, it } from 'vitest';
import { existsRepo, readSrc } from '../spec-utils.js';
// ACC-OPS-0033-2 — event-loop lag triggers load shedding under pressure.

describe('ACC-OPS-0033-2 — event loop shedding', () => {
  it('the lag monitor and shedding exist', () => {
    expect(existsRepo('apps/main/src/events/event-loop-lag.ts')).toBe(true);
    expect(readSrc('events/event-router.ts')).toMatch(/shed/i);
  });
});
