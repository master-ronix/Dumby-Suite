import { describe, expect, test, vi } from 'vitest';
import { Container } from '../../src/di/container.js';
import { CORE_TOKENS } from '../../src/di/tokens.js';
import { ModuleRegistry } from '../../src/module-system/registry.js';
import { ModuleLoader } from '../../src/module-system/loader.js';
import { parseManifest } from '../../src/module-system/manifest.schema.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * §5.9 — a module declares its BullMQ job processors; the loader registers their named queues with
 * the queue manager. Before this, nothing registered a queue at all, which is why the runtime had
 * no queues and finding #15's pause/resume routes had nothing to act on.
 */
describe('M9 runtime — module job queues are registered', () => {
  test('a module declaring jobs has its queues registered at load', async () => {
    const registry = new ModuleRegistry();
    const process = vi.fn().mockResolvedValue(undefined);
    registry.register({
      manifest: parseManifest({
        name: 'jobs-mod',
        version: '1.0.0',
        description: 'A module with a job.',
        tier: 'core',
        required: false,
      }),
      jobs: [{ queueName: 'jobs-mod:deliveries', process }],
    });

    const container = new Container();
    const registerQueue = vi.fn();
    container.registerValue(CORE_TOKENS.Queue, { registerQueue } as never);

    const loader = new ModuleLoader(registry, container, createLogger('error'));
    await loader.loadAll();

    expect(registerQueue).toHaveBeenCalledTimes(1);
    expect(registerQueue).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'jobs-mod:deliveries' }),
    );
  });

  test('a module with no jobs registers nothing', async () => {
    const registry = new ModuleRegistry();
    registry.register({
      manifest: parseManifest({
        name: 'quiet-mod',
        version: '1.0.0',
        description: 'A module with no job.',
        tier: 'core',
        required: false,
      }),
    });

    const container = new Container();
    const registerQueue = vi.fn();
    container.registerValue(CORE_TOKENS.Queue, { registerQueue } as never);

    const loader = new ModuleLoader(registry, container, createLogger('error'));
    await loader.loadAll();

    expect(registerQueue).not.toHaveBeenCalled();
  });
});
