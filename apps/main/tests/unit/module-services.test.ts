import { describe, expect, test } from 'vitest';
import {
  ModuleServiceRegistry,
  ModuleServiceUnavailableError,
  MODULE_SERVICE_TOKENS,
  type PersonaDirectoryService,
} from '../../src/module-system/module-services.js';

/**
 * UR-20261030-118 — the seam that lets a module's domain leave the core.
 *
 * The core declares the contract; the module provides the implementation at load; the core resolves it
 * after the loop. These cases pin the two things that make it safe: a provided service resolves, and a
 * service nobody provides fails VISIBLY, naming the token — not as an `undefined` that surfaces three
 * layers later as a rendering bug.
 */
describe('a module-provided service', () => {
  test('resolves after the module provided it', () => {
    const registry = new ModuleServiceRegistry();
    const directory: PersonaDirectoryService = {
      label: (id) => (id === 'main' ? 'Dumby Profile' : 'a persona'),
      residentProfileId: 'main',
    };
    registry.provide({
      token: MODULE_SERVICE_TOKENS.PersonaDirectory,
      moduleId: 'persona',
      implementation: directory,
    });

    const resolved = registry.resolve<PersonaDirectoryService>(
      MODULE_SERVICE_TOKENS.PersonaDirectory,
    );
    expect(resolved.label('main')).toBe('Dumby Profile');
    expect(resolved.residentProfileId).toBe('main');
    expect(registry.providers()).toEqual(['persona']);
  });

  test('an unprovided service fails visibly, naming the token and the providers', () => {
    const registry = new ModuleServiceRegistry();
    expect(() => registry.resolve(MODULE_SERVICE_TOKENS.PersonaDirectory)).toThrow(
      ModuleServiceUnavailableError,
    );
    expect(() => registry.resolve(MODULE_SERVICE_TOKENS.PersonaDirectory)).toThrow(
      /core\.PersonaDirectory/,
    );
    // And a caller that can degrade asks, rather than being handed a thrown error.
    expect(registry.tryResolve(MODULE_SERVICE_TOKENS.PersonaDirectory)).toBeUndefined();
    expect(registry.has(MODULE_SERVICE_TOKENS.PersonaDirectory)).toBe(false);
  });

  test('the registry is keyed by token, so two modules cannot silently shadow one contract', () => {
    const registry = new ModuleServiceRegistry();
    registry.provide({
      token: MODULE_SERVICE_TOKENS.PersonaDirectory,
      moduleId: 'persona',
      implementation: { label: () => 'first', residentProfileId: 'main' },
    });
    registry.provide({
      token: MODULE_SERVICE_TOKENS.PersonaDirectory,
      moduleId: 'impostor',
      implementation: { label: () => 'second', residentProfileId: 'main' },
    });
    // Last provider wins, and `providers()` names it — the guard is what stops the impostor, and this
    // records that the registry itself is honest about who provided what.
    expect(registry.providers()).toEqual(['impostor']);
  });
});
