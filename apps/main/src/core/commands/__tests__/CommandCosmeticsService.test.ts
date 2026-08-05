import { describe, expect, it } from 'vitest';
import { CommandCountProjectionService } from '../CommandCountProjectionService.js';
import { CommandCosmeticsService } from '../CommandCosmeticsService.js';
import { GuildCommandChangeQueue } from '../GuildCommandChangeQueue.js';
import { clock, ids, MemoryQueueRepo, MemoryRest, registry, slash } from './helpers.js';

describe('CommandCosmeticsService', () => {
  it('queues rename and alias operations and rejects reserved or prefix-like aliases', async () => {
    const repo = new MemoryQueueRepo();
    const projection = new CommandCountProjectionService(new MemoryRest(), repo);
    const queue = new GuildCommandChangeQueue(repo, projection, clock, ids);
    const service = new CommandCosmeticsService(
      registry([{ moduleSlug: 'mod', tier: 'standard', command: slash('ban') }]),
      queue,
      projection,
    );

    await service.rename({ guildId: 'g', commandKey: '/ban', targetName: 'timeout', actorId: 'a' });
    await service.addAlias({ guildId: 'g', commandKey: '/ban', aliasName: 'remove', actorId: 'a' });
    await service.removeAlias({ guildId: 'g', commandKey: '/ban', aliasName: 'remove', actorId: 'a' });
    expect(repo.entries.map((entry) => entry.changeType)).toEqual(['rename', 'alias_add', 'alias_remove']);
    await expect(
      service.addAlias({ guildId: 'g', commandKey: '/ban', aliasName: 'help', actorId: 'a' }),
    ).rejects.toThrow();
    await expect(
      service.addAlias({ guildId: 'g', commandKey: '/ban', aliasName: '!ban', actorId: 'a' }),
    ).rejects.toThrow();
  });
});
