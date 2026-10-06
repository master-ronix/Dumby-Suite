import { test, expect } from 'vitest';
import {
  parseSemver,
  compareVersions,
  versionWithinWindow,
  satisfiesRange,
} from '../../src/licensing/semver.js';

test('parseSemver parses core and pre-release, rejects junk', () => {
  expect(parseSemver('1.2.3')).toStrictEqual({ major: 1, minor: 2, patch: 3 });
  expect(parseSemver('1.2.3-beta.1')).toStrictEqual({ major: 1, minor: 2, patch: 3 });
  expect(parseSemver('nope')).toBeNull();
});

test('compareVersions orders and handles unparsable input', () => {
  expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  expect(compareVersions('1.2.3', '1.2.4')).toBe(-1);
  expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
  expect(compareVersions('bad', '1.0.0')).toBe(-1);
  expect(compareVersions('1.0.0', 'bad')).toBe(1);
  expect(compareVersions('bad', 'bad')).toBe(0);
});

test('versionWithinWindow respects bounds and exclusions', () => {
  const window = { minInclusive: '1.0.0', maxExclusive: '2.0.0', excluded: ['1.5.0'] };
  expect(versionWithinWindow('1.0.0', window)).toBe(true);
  expect(versionWithinWindow('1.5.0', window)).toBe(false);
  expect(versionWithinWindow('2.0.0', window)).toBe(false);
  expect(versionWithinWindow('0.9.0', window)).toBe(false);
});

test('satisfiesRange covers exact, caret, tilde, comparators, wildcards and alternation', () => {
  expect(satisfiesRange('1.2.3', '1.2.3')).toBe(true);
  expect(satisfiesRange('1.2.3', '1.2.4')).toBe(false);
  expect(satisfiesRange('^1.2.3', '1.9.0')).toBe(true);
  expect(satisfiesRange('^1.2.3', '2.0.0')).toBe(false);
  expect(satisfiesRange('^0.2.3', '0.2.9')).toBe(true);
  expect(satisfiesRange('^0.2.3', '0.3.0')).toBe(false);
  expect(satisfiesRange('^0.0.3', '0.0.3')).toBe(true);
  expect(satisfiesRange('^0.0.3', '0.0.4')).toBe(false);
  expect(satisfiesRange('~1.2.3', '1.2.9')).toBe(true);
  expect(satisfiesRange('~1.2.3', '1.3.0')).toBe(false);
  expect(satisfiesRange('>=1.2.3', '1.2.3')).toBe(true);
  expect(satisfiesRange('>1.2.3', '1.2.3')).toBe(false);
  expect(satisfiesRange('<=1.2.3', '1.2.2')).toBe(true);
  expect(satisfiesRange('<1.2.3', '1.2.3')).toBe(false);
  expect(satisfiesRange('=1.2.3', '1.2.3')).toBe(true);
  expect(satisfiesRange('*', '9.9.9')).toBe(true);
  expect(satisfiesRange('1.x', '1.9.9')).toBe(true);
  expect(satisfiesRange('1.x', '2.0.0')).toBe(false);
  expect(satisfiesRange('1.2.x', '1.2.7')).toBe(true);
  expect(satisfiesRange('^1.0.0 || ^2.0.0', '2.5.0')).toBe(true);
  expect(satisfiesRange('^1.0.0 || ^2.0.0', '3.0.0')).toBe(false);
  expect(satisfiesRange('', '1.0.0')).toBe(true);
  expect(satisfiesRange('^1.0.0', 'bad')).toBe(false);
});
