import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-REQ-0018-1 — two distinct event systems exist: EventRouter (gateway) and InternalEventBus (cross-module pub/sub).
describe('ACC-REQ-0018-1 — two event systems', () => {
  it('both the router and the internal bus exist', () => {
    expect(existsRepo('apps/main/src/events/event-router.ts')).toBe(true);
    expect(existsRepo('apps/main/src/events/event-bus.ts')).toBe(true);
  });
});
