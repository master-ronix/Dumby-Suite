import { describe, expect, it } from 'vitest';
import { CommandCountProjectionService } from '../CommandCountProjectionService.js';
import { PersonaCommandBindingService } from '../PersonaCommandBindingService.js';
import { MemoryPersonaRepo, MemoryQueueRepo, MemoryRest } from './helpers.js';

describe('PersonaCommandBindingService', () => {
  it('defaults to main identity, binds modules to personas, and keeps budgets independent', async () => {
    const repo = new MemoryPersonaRepo();
    const service = new PersonaCommandBindingService(
      repo,
      new CommandCountProjectionService(new MemoryRest(), new MemoryQueueRepo()),
    );
    expect(await service.identityFor('g', 'mod')).toBe('main');
    await service.bind({ guildId: 'g', moduleSlug: 'mod', identityId: 'persona-a', actorId: 'admin' });
    expect(await service.identityFor('g', 'mod')).toBe('persona-a');
    repo.suspended.add('persona-a');
    expect(await service.assertDispatchAllowed('persona-a')).toBe(false);
  });
});
