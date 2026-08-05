import { describe, expect, it } from 'vitest';
import { CommandRegistry, CommandKeyCollisionError } from '../CommandRegistry.js';
import { slash, slashWithGroup, slashWithSub, userMenu, messageMenu } from './helpers.js';

describe('CommandRegistry', () => {
  it('registers slash, subcommand, subcommand group, and context menu keys', () => {
    const registry = CommandRegistry.buildFrozen([
      { moduleSlug: 'core', tier: 'core', command: slash('ping') },
      { moduleSlug: 'cases', tier: 'standard', command: slashWithSub('case', 'view') },
      { moduleSlug: 'economy', tier: 'standard', command: slashWithGroup('economy', 'shop', 'buy') },
      { moduleSlug: 'mod', tier: 'standard', command: userMenu('View Mod History') },
      { moduleSlug: 'mod', tier: 'standard', command: messageMenu('Flag Content') },
    ]);

    expect(registry.has('/ping')).toBe(true);
    expect(registry.has('/case.view')).toBe(true);
    expect(registry.has('/economy.shop.buy')).toBe(true);
    expect(registry.has('USER::View Mod History')).toBe(true);
    expect(registry.has('MESSAGE::Flag Content')).toBe(true);
    expect(registry.getByModule('mod')).toHaveLength(2);
    expect(registry.resolve('/ping')?.metadata.moduleSlug).toBe('core');
  });

  it('throws on duplicate keys and registration after freeze', () => {
    expect(() =>
      CommandRegistry.buildFrozen([
        { moduleSlug: 'a', tier: 'standard', command: slash('ping') },
        { moduleSlug: 'b', tier: 'standard', command: slash('ping') },
      ]),
    ).toThrow(CommandKeyCollisionError);

    const registry = new CommandRegistry();
    registry.register({ moduleSlug: 'a', tier: 'standard', command: slash('ping') });
    registry.freeze();
    expect(() => registry.register({ moduleSlug: 'b', tier: 'standard', command: slash('pong') })).toThrow();
  });
});
