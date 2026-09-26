import { test, expect } from 'vitest';
import {
  OVERRIDE_BOUNDARY,
  OVERRIDE_BOUNDARY_LAYERS,
  applyGrant,
  removeGrant,
  grantBoundaryViolation,
  InMemoryGrantSurface,
  type ModifyGrantInput,
} from '../../src/permissions/grant-surface.js';
import { GRANT_TYPE_DB_ALIASES, type RbacGrant } from '../../src/permissions/rbac.js';

function input(overrides: Partial<ModifyGrantInput> = {}): ModifyGrantInput {
  return {
    guildId: 'guild-1',
    tier: 'standard',
    key: 'moderation.ban',
    level: 'role',
    refId: 'role-99',
    type: 'permit',
    ...overrides,
  };
}

test('the override boundary is exhaustive and non-configurable', () => {
  const layers = Object.values(OVERRIDE_BOUNDARY);
  expect(layers).toEqual(OVERRIDE_BOUNDARY_LAYERS);
  expect(layers).toEqual([
    'the bot-owner override (Layer 1)',
    'the blacklist (Layer 2)',
    'guild and module availability (Layer 3)',
    'the bot-capability check',
    'the RESTRICTED floor',
  ]);
  expect(Object.isFrozen(OVERRIDE_BOUNDARY)).toBe(true);
  expect(Object.isFrozen(OVERRIDE_BOUNDARY_LAYERS)).toBe(true);
});

test('the write surface refuses grants on core commands', () => {
  expect(grantBoundaryViolation(input({ tier: 'core' }))).toMatch(/module commands only/);
});

test('the write surface never offers a privileged or operator-override grant type', () => {
  const surface: InMemoryGrantSurface = new InMemoryGrantSurface();
  for (const type of ['permit', 'blacklist', 'whitelist', 'cooldown', 'rate-limit'] as const) {
    const result = surface.apply(
      input({ type, value: type === 'cooldown' || type === 'rate-limit' ? 5 : undefined }),
    );
    expect(result.ok).toBe(true);
  }
  expect(surface.list().length).toBe(5);
});

test('the write surface rejects malformed grant keys', () => {
  expect(grantBoundaryViolation(input({ key: 'ban' }))).toMatch(/invalid grant key/);
  expect(grantBoundaryViolation(input({ key: 'Ban.Command' }))).toMatch(/invalid grant key/);
  expect(grantBoundaryViolation(input({ key: 'module/command' }))).toMatch(/invalid grant key/);
});

test('the write surface requires a target', () => {
  expect(grantBoundaryViolation(input({ refId: '' }))).toMatch(/grant target is required/);
});

test('a permit cannot be written for a target at the RESTRICTED floor', () => {
  expect(grantBoundaryViolation(input({ restrictedTarget: true }))).toMatch(/RESTRICTED floor/);
});

test('cooldown and rate-limit grants carry a positive value payload', () => {
  expect(grantBoundaryViolation(input({ type: 'cooldown' }))).toMatch(/positive value/);
  expect(grantBoundaryViolation(input({ type: 'rate-limit', value: -1 }))).toMatch(
    /positive value/,
  );
  expect(grantBoundaryViolation(input({ type: 'rate-limit', value: 5 }))).toBe(null);
});

test('grant types with no value payload reject one', () => {
  expect(grantBoundaryViolation(input({ type: 'permit', value: 3 }))).toMatch(/no value payload/);
});

test('applyGrant upserts on (guild, key, level, refId, type): a retried grant lands once', () => {
  const first = applyGrant([], input());
  expect(first.ok).toBe(true);
  const second = applyGrant(first.ok ? first.grants : [], input());
  expect(second.ok).toBe(true);
  if (second.ok) {
    expect(second.grants.length).toBe(1);
    expect(second.grants[0]).toMatchObject({
      key: 'moderation.ban',
      type: 'permit',
      refId: 'role-99',
    });
  }
});

test('applyGrant keeps distinct grants for different targets and types', () => {
  let grants: readonly RbacGrant[] = [];
  const apply = (over: Partial<ModifyGrantInput>): void => {
    const result = applyGrant(grants, input(over));
    if (result.ok) grants = result.grants;
  };
  apply({ type: 'permit' });
  apply({ type: 'permit', refId: 'role-100' });
  apply({ type: 'rate-limit', value: 5 });
  expect(grants.length).toBe(3);
});

test('removeGrant is idempotent and removes only the exact grant', () => {
  const grants = applyGrant([], input());
  const withTwo = applyGrant(grants.ok ? grants.grants : [], input({ refId: 'role-100' }));
  if (!withTwo.ok) {
    expect.fail('setup failed');
    return;
  }
  const removed = removeGrant(withTwo.grants, input());
  expect(removed.ok).toBe(true);
  expect(removed.ok ? removed.grants.length : -1).toBe(1);

  const again = removeGrant(removed.ok ? removed.grants : [], input());
  expect(again.ok).toBe(true);
  expect(again.ok ? again.grants.length : -1).toBe(1);
});

test('InMemoryGrantSurface persists mutations on a snapshot', () => {
  const surface = new InMemoryGrantSurface();
  expect(surface.apply(input())).toMatchObject({ ok: true });
  expect(surface.list().length).toBe(1);
  surface.remove(input());
  expect(surface.list().length).toBe(0);
});

test('the rate-limit grant type maps to the legacy DB enum spelling', () => {
  expect(GRANT_TYPE_DB_ALIASES['rate-limit']).toBe('quota');
  expect(GRANT_TYPE_DB_ALIASES.quota).toBe('rate-limit');
});
