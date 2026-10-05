import { test, expect } from 'vitest';
import {
  topologicalLoadOrder,
  classifyLoadFailures,
  ModuleDependencyCycleError,
  UnsatisfiedModuleDependencyError,
  type ModuleNode,
} from '../../src/module-system/topo-sort.js';

/**
 * Stage 11 ordering. `depends` entries are `{ token, version }` pins resolved against the tokens
 * other modules `provides` — a bare token is not accepted, and a providing module whose version
 * does not satisfy the pinned range is fatal, naming the token, the range and the version found.
 */
function node(
  name: string,
  opts: {
    version?: string;
    depends?: readonly { token: string; version: string }[];
    provides?: readonly string[];
    required?: boolean;
  } = {},
): ModuleNode {
  return {
    name,
    version: opts.version ?? '1.0.0',
    depends: opts.depends ?? [],
    provides: (opts.provides ?? []).map((token) => ({ token, contract: `${token}Contract` })),
    required: opts.required ?? false,
  };
}

test('dependencies are ordered before their dependents', () => {
  const modules: ModuleNode[] = [
    node('economy', { depends: [{ token: 'guild-settings:store', version: '^1.0.0' }] }),
    node('guild-settings', { provides: ['guild-settings:store'], required: true }),
    node('leveling', {
      depends: [
        { token: 'guild-settings:store', version: '^1.0.0' },
        { token: 'economy:ledger', version: '^1.0.0' },
      ],
    }),
    node('economy-ledger-provider', { provides: ['economy:ledger'] }),
  ];
  // economy provides economy:ledger as well
  modules[0]!.provides = [{ token: 'economy:ledger', contract: 'LedgerPort' }];
  const order = topologicalLoadOrder(modules);
  expect(order.indexOf('guild-settings')).toBeLessThan(order.indexOf('economy'));
  expect(order.indexOf('economy')).toBeLessThan(order.indexOf('leveling'));
  expect(order.length).toBe(4);
});

test('modules with no dependencies preserve declaration order', () => {
  const modules: ModuleNode[] = [node('utility', { required: true }), node('fun')];
  expect(topologicalLoadOrder(modules)).toStrictEqual(['utility', 'fun']);
});

test('a token no loaded module provides is fatal, naming the token', () => {
  const modules: ModuleNode[] = [
    node('economy', { depends: [{ token: 'does-not-exist:port', version: '^1.0.0' }] }),
  ];
  expect(() => topologicalLoadOrder(modules)).toThrow(UnsatisfiedModuleDependencyError);
  expect(() => topologicalLoadOrder(modules)).toThrow(/does-not-exist:port/);
});

test('a providing module whose version does not satisfy the range is fatal, naming range and found version', () => {
  const modules: ModuleNode[] = [
    node('economy', { depends: [{ token: 'core:db', version: '^2.0.0' }] }),
    node('core-db', { version: '1.4.0', provides: ['core:db'] }),
  ];
  let message = '';
  try {
    topologicalLoadOrder(modules);
  } catch (err) {
    message = (err as Error).message;
  }
  expect(message).toContain('core:db');
  expect(message).toContain('^2.0.0');
  expect(message).toContain('1.4.0');
});

test('a satisfying version range is accepted', () => {
  const modules: ModuleNode[] = [
    node('economy', { depends: [{ token: 'core:db', version: '^1.0.0' }] }),
    node('core-db', { version: '1.4.0', provides: ['core:db'] }),
  ];
  expect(() => topologicalLoadOrder(modules)).not.toThrow();
});

test('a direct two-module cycle is detected', () => {
  const modules: ModuleNode[] = [
    node('a', { depends: [{ token: 'b:t', version: '^1.0.0' }], provides: ['a:t'] }),
    node('b', { depends: [{ token: 'a:t', version: '^1.0.0' }], provides: ['b:t'] }),
  ];
  expect(() => topologicalLoadOrder(modules)).toThrow(ModuleDependencyCycleError);
});

test('an indirect three-module cycle reports the full chain', () => {
  const modules: ModuleNode[] = [
    node('a', { depends: [{ token: 'b:t', version: '^1.0.0' }], provides: ['a:t'] }),
    node('b', { depends: [{ token: 'c:t', version: '^1.0.0' }], provides: ['b:t'] }),
    node('c', { depends: [{ token: 'a:t', version: '^1.0.0' }], provides: ['c:t'] }),
  ];
  let chain: readonly string[] = [];
  try {
    topologicalLoadOrder(modules);
  } catch (err) {
    chain = (err as ModuleDependencyCycleError).chain;
  }
  expect(chain.length).toBeGreaterThanOrEqual(3);
});

test('a module depending on itself is a self-cycle', () => {
  const modules: ModuleNode[] = [
    node('selfish', {
      depends: [{ token: 'selfish:t', version: '^1.0.0' }],
      provides: ['selfish:t'],
    }),
  ];
  expect(() => topologicalLoadOrder(modules)).toThrow(ModuleDependencyCycleError);
});

test('classifyLoadFailures splits required modules into fatal and the rest into degraded', () => {
  const modules: ModuleNode[] = [node('must', { required: true }), node('may')];
  expect(classifyLoadFailures(modules, ['must', 'may'])).toStrictEqual({
    fatal: ['must'],
    degraded: ['may'],
  });
});
