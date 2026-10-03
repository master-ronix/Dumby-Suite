import { describe, expect, test, vi } from 'vitest';
import { EventRouter, isProtectedEventDomain } from '../../src/events/event-router.js';
import { EventLoopLagMonitor } from '../../src/events/event-loop-lag.js';
import { MetricsRegistry } from '../../src/metrics/registry.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * §16 / UR-C-19 — "EventRouter and lag monitor never started": the lag monitor was fully written
 * (`shouldShed`) but never instantiated, so `EVENT_LOOP_LAG_SHED_THRESHOLD_MS` was unread and
 * `dumby_gateway_events_shed_total` had no increment sites. This proves the shed policy:
 * sheddable events are dropped under lag, protected domains never are, and every shed is counted.
 */
const logger = createLogger('error');

function laggedMonitor(): EventLoopLagMonitor {
  // intervalMs 0 makes the sample equal to the elapsed time, so 100ms of elapsed is 100ms of lag.
  const monitor = new EventLoopLagMonitor({ thresholdMs: 50, intervalMs: 0, now: () => 0 });
  monitor.sample(100);
  return monitor;
}

function routerWith(monitor: EventLoopLagMonitor | undefined) {
  const metrics = new MetricsRegistry();
  const cache = {} as never;
  const router = new EventRouter({ logger, cache, metrics, ...(monitor ? { lagMonitor: monitor } : {}) });
  return { router, metrics };
}

describe('M9 UR-C-19 — event-loop lag shedding', () => {
  test('a sheddable event is shed under lag and counted, its handler never runs', async () => {
    const handle = vi.fn().mockResolvedValue(undefined);
    const { router, metrics } = routerWith(laggedMonitor());
    router.register({ event: 'typingStart' as never, sheddable: true, handle }, 'mod-a');

    await router.dispatch('typingStart');

    expect(handle).not.toHaveBeenCalled();
    expect(await metrics.metricsText()).toContain('dumby_gateway_events_shed_total{event_name="typingStart"} 1');
  });

  test('a non-sheddable event is never shed, even under lag', async () => {
    const handle = vi.fn().mockResolvedValue(undefined);
    const { router } = routerWith(laggedMonitor());
    router.register({ event: 'presenceUpdate' as never, handle }, 'mod-a');

    await router.dispatch('presenceUpdate');
    expect(handle).toHaveBeenCalledTimes(1);
  });

  test('a protected-domain event is not shed even when tagged sheddable', async () => {
    expect(isProtectedEventDomain('messageCreate')).toBe(true);
    expect(isProtectedEventDomain('guildMemberAdd')).toBe(true);
    expect(isProtectedEventDomain('typingStart')).toBe(false);
    expect(isProtectedEventDomain('presenceUpdate')).toBe(false);
    const handle = vi.fn().mockResolvedValue(undefined);
    const { router, metrics } = routerWith(laggedMonitor());
    router.register({ event: 'guildMemberAdd' as never, sheddable: true, handle }, 'mod-a');

    await router.dispatch('guildMemberAdd');

    expect(handle).toHaveBeenCalledTimes(1);
    expect(await metrics.metricsText()).not.toContain('event_name="guildMemberAdd"');
  });

  test('with no lag a sheddable event still runs', async () => {
    const handle = vi.fn().mockResolvedValue(undefined);
    const calm = new EventLoopLagMonitor({ thresholdMs: 50, intervalMs: 0, now: () => 0 });
    const { router } = routerWith(calm);
    router.register({ event: 'typingStart' as never, sheddable: true, handle }, 'mod-a');

    await router.dispatch('typingStart');
    expect(handle).toHaveBeenCalledTimes(1);
  });

  test('with no lag monitor wired, nothing is ever shed', async () => {
    const handle = vi.fn().mockResolvedValue(undefined);
    const { router } = routerWith(undefined);
    router.register({ event: 'typingStart' as never, sheddable: true, handle }, 'mod-a');

    await router.dispatch('typingStart');
    expect(handle).toHaveBeenCalledTimes(1);
  });
});
