import { describe, expect, it } from 'vitest';
import { CommandDeployer } from '../CommandDeployer.js';
import { CommandDeploymentPlanner } from '../CommandDeploymentPlanner.js';
import { logger, MemoryRest, moduleState, registry, slash } from './helpers.js';

describe('CommandDeployer', () => {
  it('writes only when desired state differs and preserves unchanged commands', async () => {
    const rest = new MemoryRest();
    const planner = new CommandDeploymentPlanner({
      environment: { nodeEnv: 'production', applicationId: 'app', devGuildId: 'dev' },
      registry: registry([{ moduleSlug: 'core', tier: 'core', command: slash('core') }]),
      guildModuleState: moduleState(),
    });
    const deployer = new CommandDeployer({ planner, rest, logger });

    await deployer.deployAll();
    expect(rest.writes).toEqual(['global:main']);
    await deployer.deployAll();
    expect(rest.writes).toEqual(['global:main']);
  });

  it('handles development and marketplace guild deployment', async () => {
    const rest = new MemoryRest();
    const planner = new CommandDeploymentPlanner({
      environment: { nodeEnv: 'development', applicationId: 'app', devGuildId: 'dev' },
      registry: registry([{ moduleSlug: 'market', tier: 'marketplace', command: slash('market') }]),
      guildModuleState: moduleState({ market: ['g1'] }),
    });
    await new CommandDeployer({ planner, rest, logger }).deployAll();
    expect(rest.writes).toEqual(['guild:main:dev']);
  });
});
