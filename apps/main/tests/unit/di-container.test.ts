import { test, expect } from 'vitest';
import {
  Container,
  createToken,
  CircularDependencyError,
  TokenNotRegisteredError,
  FrozenNamespaceError,
} from '../../src/di/container.js';

test('singleton lifetime returns the exact same instance on every resolve', () => {
  const container = new Container();
  const token = createToken<{ n: number }>('thing');
  let calls = 0;
  container.register(token, () => {
    calls += 1;
    return { n: calls };
  });
  const a = container.resolve(token);
  const b = container.resolve(token);
  expect(a).toBe(b);
  expect(calls).toBe(1);
});

test('transient lifetime constructs a new instance every resolve', () => {
  const container = new Container();
  const token = createToken<{ n: number }>('thing');
  let calls = 0;
  container.register(token, () => ({ n: (calls += 1) }), { lifetime: 'transient' });
  const a = container.resolve(token);
  const b = container.resolve(token);
  expect(a).not.toBe(b);
  expect(calls).toBe(2);
});

test('scoped lifetime is shared within a child container but not across children', () => {
  const root = new Container();
  const token = createToken<{ n: number }>('scopedThing');
  let calls = 0;
  root.register(token, () => ({ n: (calls += 1) }), { lifetime: 'scoped' });

  const requestA = root.createScope();
  const requestB = root.createScope();

  const a1 = requestA.resolve(token);
  const a2 = requestA.resolve(token);
  const b1 = requestB.resolve(token);

  expect(a1).toBe(a2);
  expect(a1).not.toBe(b1);
  expect(calls).toBe(2);
});

test('child container resolves tokens registered on the parent', () => {
  const parent = new Container();
  const token = createToken<string>('greeting');
  parent.registerValue(token, 'hello');
  const child = parent.createChild();
  expect(child.resolve(token)).toBe('hello');
});

test('child container can shadow a parent registration', () => {
  const parent = new Container();
  const token = createToken<string>('greeting');
  parent.registerValue(token, 'from-parent');
  const child = parent.createChild();
  child.registerValue(token, 'from-child');
  expect(child.resolve(token)).toBe('from-child');
  expect(parent.resolve(token)).toBe('from-parent');
});

test('resolving an unregistered token throws TokenNotRegisteredError', () => {
  const container = new Container();
  const token = createToken<unknown>('missing');
  expect(() => container.resolve(token)).toThrow(TokenNotRegisteredError);
});

test('tryResolve returns undefined instead of throwing for a missing token', () => {
  const container = new Container();
  const token = createToken<unknown>('missing');
  expect(container.tryResolve(token)).toBe(undefined);
});

test('direct self-referencing circular dependency is detected', () => {
  const container = new Container();
  const token = createToken<unknown>('selfRef');
  container.register(token, (c) => c.resolve(token));
  expect(() => container.resolve(token)).toThrow(CircularDependencyError);
});

test('indirect A -> B -> A circular dependency is detected with the full chain', () => {
  const container = new Container();
  const tokenA = createToken<unknown>('A');
  const tokenB = createToken<unknown>('B');
  container.register(tokenA, (c) => c.resolve(tokenB));
  container.register(tokenB, (c) => c.resolve(tokenA));

  try {
    container.resolve(tokenA);
    expect.fail('expected CircularDependencyError to be thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(CircularDependencyError);
    expect(err.chain).toStrictEqual(['A', 'B', 'A']);
  }
});

test('freeze() blocks further registration but not resolution', () => {
  const container = new Container();
  const token = createToken<string>('x');
  container.registerValue(token, 'ok');
  container.freeze();
  expect(container.isFrozen()).toBe(true);
  expect(container.resolve(token)).toBe('ok');
  expect(() => container.registerValue(token, 'ignored')).toThrow(FrozenNamespaceError);
});

test('freezing a parent does not freeze children (module namespaces stay writable)', () => {
  const parent = new Container();
  parent.freeze();
  const child = parent.createChild();
  const token = createToken<string>('module.thing');
  expect(() => child.registerValue(token, 'fine')).not.toThrow();
});

test('re-registering a token clears any cached singleton instance', () => {
  const container = new Container();
  const token = createToken<string>('x');
  container.registerValue(token, 'v1');
  expect(container.resolve(token)).toBe('v1');
  container.registerValue(token, 'v2');
  expect(container.resolve(token)).toBe('v2');
});

test('has() reflects registrations across the parent chain', () => {
  const parent = new Container();
  const token = createToken<string>('x');
  const child = parent.createChild();
  expect(child.has(token)).toBe(false);
  parent.registerValue(token, 'v');
  expect(child.has(token)).toBe(true);
});
