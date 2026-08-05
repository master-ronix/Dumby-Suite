import { describe, expect, it } from 'vitest';
import { CommandCountProjectionService } from '../CommandCountProjectionService.js';
import { GuildCommandChangeQueue } from '../GuildCommandChangeQueue.js';
import { clock, events, ids, MemoryQueueRepo, MemoryRest } from './helpers.js';

describe('GuildCommandChangeQueue', () => {
  it('queues changes with T0, joins open batches, revokes, and invalidates pending deletion', async () => {
    const repo = new MemoryQueueRepo();
    const queue = new GuildCommandChangeQueue(
      repo,
      new CommandCountProjectionService(new MemoryRest(), repo),
      clock,
      ids,
      events,
    );
    const first = await queue.queue({
      guildId: 'g',
      changeType: 'rename',
      commandKey: '/ban',
      moduleSlug: 'mod',
      targetName: 'timeout',
      actorId: 'a',
    });
    const second = await queue.queue({
      guildId: 'g',
      changeType: 'alias_add',
      commandKey: '/ban',
      moduleSlug: 'mod',
      aliasName: 'remove',
      actorId: 'a',
    });
    expect(second.batchAnchorT0?.toISOString()).toBe(first.batchAnchorT0?.toISOString());
    await queue.revoke(first.id, 'a');
    expect(repo.entries.find((entry) => entry.id === first.id)?.status).toBe('invalidated');
    await queue.queue({
      guildId: 'g',
      changeType: 'module_disable_deletion',
      commandKey: '/ban',
      moduleSlug: 'mod',
      actorId: 'a',
    });
    expect(await queue.invalidateModuleDeletion('mod', 'new version')).toHaveLength(1);
  });
});
