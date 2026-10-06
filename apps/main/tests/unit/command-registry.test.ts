import { test, expect, describe } from 'vitest';
import {
  CommandRegistry,
  CommandCollisionError,
  CommandModuleNotRegisteredError,
  type CommandDefinition,
} from '../../src/commands/command-registry.js';
import type { ModuleTier } from '../../src/module-system/tier-rules.js';

function makeDef(name: string, moduleId = 'health'): CommandDefinition {
  return {
    data: {
      name,
      description: `${name} command`,
      type: 1,
    } as never,
    execute: async () => undefined,
    moduleId,
  };
}

describe('CommandRegistry', () => {
  test('registers and resolves a command', () => {
    const registry = new CommandRegistry();
    registry.registerModule('health', 'standard');
    registry.register(makeDef('health'));
    expect(registry.get('health')).toBeDefined();
    expect(registry.has('health')).toBe(true);
    expect(registry.count()).toBe(1);
  });

  test('throws CommandCollisionError when a name is taken by another module', () => {
    const registry = new CommandRegistry();
    registry.registerModule('health', 'standard');
    registry.registerModule('hello-world', 'standard');
    registry.register(makeDef('ping', 'health'));
    expect(() => registry.register(makeDef('ping', 'hello-world'))).toThrow(CommandCollisionError);
  });

  test('collision error names both the existing and the colliding module', () => {
    const registry = new CommandRegistry();
    registry.registerModule('health', 'standard');
    registry.registerModule('hello-world', 'standard');
    registry.register(makeDef('ping', 'health'));
    try {
      registry.register(makeDef('ping', 'hello-world'));
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as CommandCollisionError;
      expect(e.message).toContain('health');
      expect(e.message).toContain('hello-world');
    }
  });

  test('all() and toApiPayloads() reflect registration order', () => {
    const registry = new CommandRegistry();
    registry.registerModule('health', 'standard');
    registry.register(makeDef('a'));
    registry.register(makeDef('b'));
    expect(registry.all().map((c) => c.data.name)).toEqual(['a', 'b']);
    expect(registry.toApiPayloads().map((p) => p.name)).toEqual(['a', 'b']);
  });

  test('refuses a command whose module was never registered (finding #19)', () => {
    const registry = new CommandRegistry();
    expect(() => registry.register(makeDef('orphan', 'ghost-module'))).toThrow(
      CommandModuleNotRegisteredError,
    );
  });

  test('tracks module tiers separately from commands', () => {
    const registry = new CommandRegistry();
    registry.registerModule('core-mod', 'core' satisfies ModuleTier);
    expect(registry.getModuleTier('core-mod')).toBe('core');
    expect(registry.getModuleTier('missing')).toBeUndefined();
  });

  test('tierForCommand looks up the declaring module tier', () => {
    const registry = new CommandRegistry();
    registry.registerModule('health', 'standard' satisfies ModuleTier);
    const def = makeDef('health', 'health');
    registry.register(def);
    expect(registry.tierForCommand(def)).toBe('standard');
  });

  test('a command cannot be registered without its module (finding #19)', () => {
    const registry = new CommandRegistry();
    const def = makeDef('health', 'health');
    expect(() => registry.register(def)).toThrow(CommandModuleNotRegisteredError);
  });
});
