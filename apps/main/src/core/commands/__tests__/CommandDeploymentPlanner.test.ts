import { describe, expect, it } from 'vitest';
import { CommandDeploymentPlanner } from '../CommandDeploymentPlanner.js';
import { moduleState, registry, slash, MemoryPersonaRepo } from './helpers.js';

describe('CommandDeploymentPlanner', () => {
  it('computes scope by environment, tier, marketplace install, and persona binding', async () => {
    const reg = registry([
      { moduleSlug: 'core', tier: 'core', command: slash('core') },
      { moduleSlug: 'std', tier: 'standard', command: slash('std') },
      { moduleSlug: 'admin', tier: 'admin', command: slash('admin') },
      { moduleSlug: 'market', tier: 'marketplace', command: slash('market') },
    ]);
    const personas = new MemoryPersonaRepo();
    await personas.setBinding('g1', 'market', 'persona-a', 'admin');
    const planner = new CommandDeploymentPlanner({
      environment: { nodeEnv: 'production', applicationId: 'app', devGuildId: 'dev' },
      registry: reg,
      guildModuleState: moduleState({ market: ['g1'] }),
      personaBindings: personas,
    });

    const plan = await planner.plan();
    expect(plan.targets.find((target) => target.scope === 'global')?.commands.map((c) => c.key)).toEqual([
      '/core',
      '/std',
    ]);
    expect(plan.targets).toContainEqual(
      expect.objectContaining({ scope: 'development-guild', guildId: 'dev' }),
    );
    expect(plan.targets).toContainEqual(
      expect.objectContaining({ scope: 'guild', guildId: 'g1', identityId: 'persona-a' }),
    );
  });

  it('deploys all commands to the development guild in development', async () => {
    const planner = new CommandDeploymentPlanner({
      environment: { nodeEnv: 'development', applicationId: 'app', devGuildId: 'dev' },
      registry: registry([{ moduleSlug: 'core', tier: 'core', command: slash('core') }]),
      guildModuleState: moduleState(),
    });
    expect((await planner.plan()).targets).toEqual([
      expect.objectContaining({ scope: 'development-guild', guildId: 'dev' }),
    ]);
  });
});
