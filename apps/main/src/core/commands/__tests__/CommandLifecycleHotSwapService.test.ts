import { describe, expect, it, vi } from 'vitest';
import { CommandLifecycleHotSwapService } from '../CommandLifecycleHotSwapService.js';
import { CommandRegistry } from '../CommandRegistry.js';
import type { ModuleLifecyclePort, RegistryReferencePort } from '../ports.js';
import { logger, registry, slash } from './helpers.js';

describe('CommandLifecycleHotSwapService', () => {
  it('atomically replaces registry on success and preserves previous registry on collision failure', async () => {
    let active = registry([{ moduleSlug: 'a', tier: 'standard', command: slash('a') }]);
    const ref: RegistryReferencePort = {
      get: () => active,
      replace: (next: CommandRegistry) => {
        active = next;
      },
    };
    const modules: ModuleLifecyclePort = {
      unload: vi.fn(async () => undefined),
      load: vi.fn(async () => undefined),
      ready: vi.fn(async () => undefined),
      collectLoadedModules: vi.fn(async () => [
        { moduleSlug: 'a', tier: 'standard', enabled: true, commands: [slash('a2')] },
      ]),
    };
    const deployer = { deployAll: vi.fn(async () => ({ targets: [], rejected: 0 })) };
    const service = new CommandLifecycleHotSwapService(modules, ref, deployer as never, logger);

    const ok = await service.hotSwap({ moduleSlug: 'a', actorId: 'owner' });
    expect(ok.ok).toBe(true);
    expect(active.has('/a2')).toBe(true);

    vi.mocked(modules.collectLoadedModules).mockResolvedValueOnce([
      { moduleSlug: 'a', tier: 'standard', enabled: true, commands: [slash('same')] },
      { moduleSlug: 'b', tier: 'standard', enabled: true, commands: [slash('same')] },
    ]);
    const before = active;
    const failed = await service.hotSwap({ moduleSlug: 'a', actorId: 'owner' });
    expect(failed.ok).toBe(false);
    expect(active).toBe(before);
  });
});
