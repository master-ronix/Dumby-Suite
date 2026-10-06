import { test, expect } from 'vitest';
import {
  guildConfigKey,
  guildModuleCatalogKey,
  guildModuleStateKey,
  guildRolesKey,
  userBlacklistKey,
  cooldownKey,
  paginateSessionKey,
  formStateKey,
  ttlSecondsForFamily,
  isNegativeCacheSentinel,
  NEGATIVE_CACHE_SENTINEL,
  NEGATIVE_CACHE_TTL_SECONDS,
  shouldEarlyRecompute,
} from '../../src/cache/key-namespace.js';

test('every key-family builder produces the exact spec-mandated shape', () => {
  expect(guildConfigKey('123')).toBe('guild:123:config');
  expect(guildModuleCatalogKey('123')).toBe('guild:123:module-catalog');
  expect(guildModuleStateKey('123', 'economy')).toBe('guild:123:module-state:economy');
  expect(guildRolesKey('123')).toBe('guild:123:roles');
  expect(userBlacklistKey('456')).toBe('user:456:blacklist');
  expect(cooldownKey('user', 'economy.daily', '456')).toBe('cooldown:user:economy.daily:456');
  expect(paginateSessionKey('sess-1')).toBe('paginate:session:sess-1');
  expect(formStateKey('wf-1', '456', '123')).toBe('form:wf-1:456:123');
});

test('known families resolve to their documented TTL', () => {
  expect(ttlSecondsForFamily('guild:config')).toBe(300);
  expect(ttlSecondsForFamily('guild:module-state')).toBe(120);
  expect(ttlSecondsForFamily('paginate:session')).toBe(900);
});

test('an unknown family falls back to the default TTL', () => {
  expect(ttlSecondsForFamily('totally-unknown-family')).toBe(60);
});

test('negative cache sentinel round-trips and has a 30s TTL', () => {
  expect(isNegativeCacheSentinel(NEGATIVE_CACHE_SENTINEL)).toBe(true);
  expect(isNegativeCacheSentinel('some other value')).toBe(false);
  expect(NEGATIVE_CACHE_TTL_SECONDS).toBe(30);
});

test('shouldEarlyRecompute always recomputes once remaining TTL hits zero', () => {
  expect(shouldEarlyRecompute(0, 50)).toBe(true);
  expect(shouldEarlyRecompute(-100, 50)).toBe(true);
});

test('shouldEarlyRecompute never triggers when computeDurationMs is zero (nothing to amortize)', () => {
  expect(shouldEarlyRecompute(1000, 0)).toBe(false);
});

test('shouldEarlyRecompute is more likely to trigger as remaining TTL shrinks, for fixed randomness', () => {
  const random = () => 0.01;
  expect(shouldEarlyRecompute(5, 10, 1, random)).toBe(true);
});

test('shouldEarlyRecompute rarely triggers with abundant remaining TTL and a "normal" random draw', () => {
  const random = () => 0.99;
  expect(shouldEarlyRecompute(100_000, 10, 1, random)).toBe(false);
});
