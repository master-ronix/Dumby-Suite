import { describe, expect, it, vi } from 'vitest';
import { CommandCollisionResolver } from '../CommandCollisionResolver.js';
import { clock, events, ids, MemoryCollisionRepo, MemoryOverrideRepo, moduleState } from './helpers.js';

describe('CommandCollisionResolver', () => {
  it('detects collision, pauses module, writes override, activates after resolution, and auto-reassigns', async () => {
    const states = moduleState();
    const overrides = new MemoryOverrideRepo();
    const collisions = new MemoryCollisionRepo();
    const resolver = new CommandCollisionResolver(collisions, overrides, states, ids, clock, events);

    const detected = await resolver.pauseForCollisions({
      guildId: 'g',
      newModuleSlug: 'new',
      tier: 'marketplace',
      newCommands: [{ commandKey: '/ban', moduleSlug: 'new' }],
      activeCommands: [{ commandKey: '/ban', moduleSlug: 'old' }],
      actorId: 'admin',
    });

    expect(detected.hasCollision).toBe(true);
    expect(states.setStatus).toHaveBeenCalledWith(
      'g',
      'new',
      'marketplace',
      'install_pending_resolution',
      'admin',
    );

    await resolver.resolve({
      guildId: 'g',
      commandKey: '/ban',
      winningModuleSlug: 'old',
      losingModuleSlug: 'new',
      tier: 'marketplace',
      actorId: 'admin',
    });
    expect(await overrides.findByCommandKey('g', null, '/ban')).toEqual(
      expect.objectContaining({ winningModuleSlug: 'old', losingModuleSlug: 'new' }),
    );

    await resolver.autoReassignOnWinnerDisabled({
      guildId: 'g',
      commandKey: '/ban',
      disabledModuleSlug: 'old',
      actorId: 'admin',
    });
    expect(await overrides.findByCommandKey('g', null, '/ban')).toEqual(
      expect.objectContaining({ winningModuleSlug: 'new', losingModuleSlug: 'old' }),
    );
    expect(vi.mocked(events.emit)).toHaveBeenCalledWith(
      'guild.command.collision.auto_reassigned',
      expect.anything(),
    );
  });
});
