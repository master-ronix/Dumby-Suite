import { describe, expect, it } from 'vitest';
import { TimerService } from '../../src/shared/utils/timer-service.js';
// ACC-ARCH-0008-6 — ITimerService auto-clears every registered timer on module unload.
describe('ACC-ARCH-0008-6 — timer cleanup', () => {
  it('clearAll clears every registered timer', () => {
    const timers = new TimerService();
    timers.setInterval(() => undefined, 1000);
    timers.setTimeout(() => undefined, 1000);
    expect(timers.activeCount()).toBe(2);
    timers.clearAll();
    expect(timers.activeCount()).toBe(0);
  });
});
