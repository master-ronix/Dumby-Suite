import { test, expect } from 'vitest';
import {
  RANK_ORDER,
  evaluateRank,
  rankLevel,
  rankMeetsRequirement,
  parseRankRequirement,
} from '../../src/permissions/rank.js';

test('the ladder is ordered strongest to weakest per Table 21-B', () => {
  expect([...RANK_ORDER]).toEqual([
    'OWNER',
    'ADMINISTRATOR',
    'MODERATOR',
    'HELPER',
    'MEMBER',
    'RESTRICTED',
  ]);
});

test('rank levels are ordered weakest to strongest', () => {
  expect(rankLevel('RESTRICTED')).toBe(1);
  expect(rankLevel('MEMBER')).toBe(2);
  expect(rankLevel('HELPER')).toBe(3);
  expect(rankLevel('MODERATOR')).toBe(4);
  expect(rankLevel('ADMINISTRATOR')).toBe(5);
  expect(rankLevel('OWNER')).toBe(6);
});

test('the ladder is inclusive upward: higher ranks meet lower requirements', () => {
  expect(rankMeetsRequirement('OWNER', 'ADMINISTRATOR')).toBe(true);
  expect(rankMeetsRequirement('ADMINISTRATOR', 'MODERATOR')).toBe(true);
  expect(rankMeetsRequirement('MODERATOR', 'HELPER')).toBe(true);
  expect(rankMeetsRequirement('HELPER', 'MEMBER')).toBe(true);
  expect(rankMeetsRequirement('MEMBER', 'MEMBER')).toBe(true);
  expect(rankMeetsRequirement('MEMBER', 'HELPER')).toBe(false);
});

test('RESTRICTED never satisfies any requirement, not even itself', () => {
  expect(rankMeetsRequirement('RESTRICTED', 'RESTRICTED')).toBe(false);
  expect(rankMeetsRequirement('RESTRICTED', 'MEMBER')).toBe(false);
});

test('parseRankRequirement accepts canonical names', () => {
  expect(parseRankRequirement('ADMINISTRATOR')).toBe('ADMINISTRATOR');
  expect(parseRankRequirement('MODERATOR')).toBe('MODERATOR');
});

test('parseRankRequirement accepts the short ladder forms and is case-insensitive', () => {
  expect(parseRankRequirement('ADMIN')).toBe('ADMINISTRATOR');
  expect(parseRankRequirement('MOD')).toBe('MODERATOR');
  expect(parseRankRequirement('mod')).toBe('MODERATOR');
  expect(parseRankRequirement('Owner')).toBe('OWNER');
});

test('parseRankRequirement rejects unknown values and empty requirements', () => {
  expect(parseRankRequirement('SUPERMOD')).toBe(null);
  expect(parseRankRequirement(null)).toBe(null);
  expect(parseRankRequirement(undefined)).toBe(null);
});

test('evaluateRank: restricted is the automatic floor, below everything', () => {
  expect(
    evaluateRank({ isGuildOwner: true, permissions: ['Administrator'], restricted: true }),
  ).toBe('RESTRICTED');
});

test('evaluateRank: the guild ownership account resolves to OWNER', () => {
  expect(evaluateRank({ isGuildOwner: true, permissions: [], restricted: false })).toBe('OWNER');
});

test('evaluateRank: ADMINISTRATOR requires the full administrator bundle', () => {
  expect(
    evaluateRank({ isGuildOwner: false, permissions: ['Administrator'], restricted: false }),
  ).toBe('ADMINISTRATOR');
});

test('evaluateRank: without the HELPER bundle bit a near-moderator resolves to MEMBER', () => {
  const partial = evaluateRank({
    isGuildOwner: false,
    permissions: ['KickMembers', 'BanMembers', 'ModerateMembers'],
    restricted: false,
  });
  expect(partial).toBe('MEMBER');
  const full = evaluateRank({
    isGuildOwner: false,
    permissions: ['KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages'],
    restricted: false,
  });
  expect(full).toBe('MODERATOR');
});

test('evaluateRank: HELPER is the reduced support bundle', () => {
  expect(
    evaluateRank({ isGuildOwner: false, permissions: ['ManageMessages'], restricted: false }),
  ).toBe('HELPER');
});

test('evaluateRank: a member holding none of the bundles resolves to MEMBER', () => {
  expect(evaluateRank({ isGuildOwner: false, permissions: [], restricted: false })).toBe('MEMBER');
});
