import { test, expect } from 'vitest';
import {
  topologicalLoadOrder,
  classifyLoadFailures,
  ModuleDependencyCycleError,
  UnknownModuleDependencyError,
  type ModuleNode,
} from '../../src/module-system/topo-sort.js';

test('dependencies are ordered before their dependents', () => {
  const modules: ModuleNode[] = [
    { name: 'economy', depends: ['guild-settings'], required: false },
    { name: 'guild-settings', depends: [], required: true },
    { name: 'leveling', depends: ['guild-settings', 'economy'], required: false },
  ];
  const order = topologicalLoadOrder(modules);
  expect(order.indexOf('guild-settings')).toBeLessThan(order.indexOf('economy'));
  expect(order.indexOf('economy')).toBeLessThan(order.indexOf('leveling'));
  expect(order.length).toBe(3);
});

test('modules with no dependencies preserve declaration order', () => {
  const modules: ModuleNode[] = [
    { name: 'utility', depends: [], required: true },
    { name: 'fun', depends: [], required: false },
  ];
  expect(topologicalLoadOrder(modules)).toStrictEqual(['utility', 'fun']);
});

test('an unknown dependency throws UnknownModuleDependencyError', () => {
  const modules: ModuleNode[] = [{ name: 'economy', depends: ['does-not-exist'], required: false }];
  expect(() => topologicalLoadOrder(modules)).toThrow(UnknownModuleDependencyError);
});

test('a direct two-module cycle is detected', () => {
  const modules: ModuleNode[] = [
    { name: 'a', depends: ['b'], required: false },
    { name: 'b', depends: ['a'], required: false },
  ];
  expect(() => topologicalLoadOrder(modules)).toThrow(ModuleDependencyCycleError);
});

test('an indirect three-module cycle reports the full chain', () => {
  const modules: ModuleNode[] = [
    { name: 'a', depends: ['b'], required: false },
    { name: 'b', depends: ['c'], required: false },
    { name: 'c', depends: ['a'], required: false },
  ];
  try {
    topologicalLoadOrder(modules);
    expect.fail('expected a cycle error');
  } catch (err) {
    expect(err).toBeInstanceOf(ModuleDependencyCycleError);
    expect(err.chain).toStrictEqual(['a', 'b', 'c', 'a']);
  }
});

test('a module depending on itself is a self-cycle', () => {
  const modules: ModuleNode[] = [{ name: 'a', depends: ['a'], required: false }];
  expect(() => topologicalLoadOrder(modules)).toThrow(ModuleDependencyCycleError);
});

test('classifyLoadFailures separates required (fatal) from optional (degraded) failures', () => {
  const modules: ModuleNode[] = [
    { name: 'guild-settings', depends: [], required: true },
    { name: 'fun', depends: [], required: false },
  ];
  const result = classifyLoadFailures(modules, ['guild-settings', 'fun']);
  expect(result.fatal).toStrictEqual(['guild-settings']);
  expect(result.degraded).toStrictEqual(['fun']);
});

test('classifyLoadFailures ignores names that are not in the module list', () => {
  const modules: ModuleNode[] = [{ name: 'fun', depends: [], required: false }];
  const result = classifyLoadFailures(modules, ['unknown-module']);
  expect(result.fatal).toStrictEqual([]);
  expect(result.degraded).toStrictEqual([]);
});
