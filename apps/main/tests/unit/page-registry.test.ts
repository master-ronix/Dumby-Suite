import { describe, test, expect, vi } from 'vitest';
import { PageRegistry } from '../../src/module-system/page-registry.js';
import { definePage, type ModulePage } from '@workspace/swastik';

/**
 * UR-20261027-106 slice 1 — the registry that lets a module own its page.
 *
 * The mechanism is deliberately small: a module declares `pages`, the loader registers them here, and
 * the host consults this registry before its own built-in switch. These cases pin the two properties
 * the migration depends on — a page is attributed to exactly one module, and a duplicate is refused
 * loudly rather than resolved by load order.
 */
function page(id: string): ModulePage {
  return definePage({ id, render: async () => ({ id }) });
}

describe('PageRegistry — a module owns its page', () => {
  test('a registered page is found by id and attributed to its module', () => {
    const registry = new PageRegistry();
    registry.register('dashboard', page('dashboard'));
    expect(registry.has('dashboard')).toBe(true);
    expect(registry.get('dashboard')?.moduleId).toBe('dashboard');
  });

  test('an unregistered id is absent, so the host falls back to its own switch', () => {
    const registry = new PageRegistry();
    expect(registry.has('health')).toBe(false);
    expect(registry.get('health')).toBeUndefined();
  });

  test('a duplicate page id is refused and the first owner keeps it', () => {
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const registry = new PageRegistry(logger as never);
    registry.register('dashboard', page('dashboard'));
    registry.register('impostor', page('dashboard'));
    expect(registry.get('dashboard')?.moduleId).toBe('dashboard');
    expect(logger.warn).toHaveBeenCalledWith('page-registry-duplicate', {
      pageId: 'dashboard',
      kept: 'dashboard',
      ignored: 'impostor',
    });
  });

  test('the ids a module owns are what the host deletes from its switch', () => {
    const registry = new PageRegistry();
    registry.register('dashboard', page('dashboard'));
    registry.register('health', page('health'));
    registry.register('health', page('health-detail'));
    expect(registry.ownedBy('health')).toEqual(['health', 'health-detail']);
    expect(registry.ids()).toEqual(['dashboard', 'health', 'health-detail']);
    expect(registry.ownedBy('queue')).toEqual([]);
  });
});
