import { describe, expect, test, vi } from 'vitest';
import { Container } from '../../src/di/container.js';
import { CORE_TOKENS } from '../../src/di/tokens.js';
import { ModuleRegistry } from '../../src/module-system/registry.js';
import { ModuleLoader } from '../../src/module-system/loader.js';
import { parseManifest } from '../../src/module-system/manifest.schema.js';
import { EventRouter } from '../../src/events/event-router.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * §15.1 — a module declares gateway event handlers; the loader registers them with the
 * `EventRouter`, and bootstrap subscribes the client to the events the router knows. Before this
 * the router was never constructed, so no gateway event beyond an interaction reached a module.
 */
const logger = createLogger('error');

describe('M9 runtime step 2/4 — gateway event handlers', () => {
  test('a module-declared gateway handler is registered and dispatched', async () => {
    const registry = new ModuleRegistry();
    const handle = vi.fn().mockResolvedValue(undefined);
    registry.register({
      manifest: parseManifest({
        name: 'events-mod',
        version: '1.0.0',
        description: 'A module with a gateway handler.',
        hardcoded: false,
        devId: 'dev_first_party',
        buildId: 'build_test_1_0_0',
        visibility: 'public',
        releaseStatus: 'public',
        tier: 'core',
        required: false,
      }),
      events: [{ event: 'guildCreate', handle }],
    });

    const container = new Container();
    const router = new EventRouter({ logger, cache: {} as never });
    container.registerValue(CORE_TOKENS.EventRouter, router);

    const loader = new ModuleLoader(registry, container, logger);
    await loader.loadAll();

    expect(router.getRegisteredEvents()).toContain('guildCreate');
    await router.dispatch('guildCreate', { id: 'g1' });
    expect(handle).toHaveBeenCalledWith({ id: 'g1' });
  });

  test('a module with no events registers nothing', async () => {
    const registry = new ModuleRegistry();
    registry.register({
      manifest: parseManifest({
        name: 'quiet-mod',
        version: '1.0.0',
        description: 'No handlers.',
        hardcoded: false,
        devId: 'dev_first_party',
        buildId: 'build_test_1_0_0',
        visibility: 'public',
        releaseStatus: 'public',
        tier: 'core',
        required: false,
      }),
    });
    const container = new Container();
    const router = new EventRouter({ logger, cache: {} as never });
    container.registerValue(CORE_TOKENS.EventRouter, router);

    await new ModuleLoader(registry, container, logger).loadAll();
    expect(router.getRegisteredEvents()).toEqual([]);
  });
});
