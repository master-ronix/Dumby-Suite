import { describe, expect, test, vi } from 'vitest';
import { Container } from '../../src/di/container.js';
import { CORE_TOKENS } from '../../src/di/tokens.js';
import { ModuleRegistry } from '../../src/module-system/registry.js';
import { ModuleLoader } from '../../src/module-system/loader.js';
import { parseManifest } from '../../src/module-system/manifest.schema.js';
import { Scheduler } from '../../src/queue/scheduler.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * §29.6 — a module declares cron tasks; the loader registers them with the `Scheduler`, which
 * bootstrap constructs and starts. Before this the `Scheduler` class existed but was never
 * instantiated, so no recurring work ran.
 */
const logger = createLogger('error');

describe('M9 runtime step 3/4 — the scheduler', () => {
  test('a module-declared cron task is registered with the scheduler', async () => {
    const registry = new ModuleRegistry();
    const execute = vi.fn().mockResolvedValue(undefined);
    registry.register({
      manifest: parseManifest({
        name: 'tasks-mod',
        version: '1.0.0',
        description: 'A module with a cron task.',
        tier: 'core',
        required: false,
      }),
      tasks: [{ name: 'cleanup', cron: '*/5 * * * *', execute }],
    });

    const container = new Container();
    const register = vi.fn();
    container.registerValue(CORE_TOKENS.Scheduler, { register } as never);

    await new ModuleLoader(registry, container, logger).loadAll();

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'cleanup', cron: '*/5 * * * *' }),
    );
  });

  test('a module with no tasks registers nothing', async () => {
    const registry = new ModuleRegistry();
    registry.register({
      manifest: parseManifest({
        name: 'quiet-mod',
        version: '1.0.0',
        description: 'No tasks.',
        tier: 'core',
        required: false,
      }),
    });
    const container = new Container();
    const register = vi.fn();
    container.registerValue(CORE_TOKENS.Scheduler, { register } as never);

    await new ModuleLoader(registry, container, logger).loadAll();
    expect(register).not.toHaveBeenCalled();
  });

  test('the scheduler starts and stops without a task', () => {
    const scheduler = new Scheduler({
      logger,
      lockStore: { setNX: vi.fn(), release: vi.fn() } as never,
    });
    expect(() => {
      scheduler.start();
      scheduler.stop();
    }).not.toThrow();
  });
});
