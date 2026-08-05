import { describe, expect, it } from 'vitest';
import { CommandCountProjectionService } from '../CommandCountProjectionService.js';
import { MemoryQueueRepo, MemoryRest } from './helpers.js';

describe('CommandCountProjectionService', () => {
  it('includes queued additions and deletions and rejects over 100', async () => {
    const rest = new MemoryRest();
    rest.guild.set(
      'main:g',
      Array.from({ length: 100 }, (_, i) => ({
        key: `/c${i}`,
        moduleSlug: 'm',
        tier: 'standard',
        identityId: 'main',
        body: { name: `c${i}`, description: 'x', type: 1 },
      })),
    );
    const service = new CommandCountProjectionService(rest, new MemoryQueueRepo());
    const projection = await service.project('g', null, {
      changeType: 'alias_add',
      commandKey: '/c1',
      moduleSlug: 'm',
      aliasName: 'newalias',
    });
    expect(projection.currentCount).toBe(100);
    expect(projection.projectedCount).toBe(101);
    expect(projection.wouldExceedCeiling).toBe(true);
  });
});
