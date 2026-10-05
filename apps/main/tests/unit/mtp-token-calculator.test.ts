import { test, expect } from 'vitest';
import { MtpTokenCalculator } from '../../src/analytics/mtp-token-calculator.js';

const calc = new MtpTokenCalculator({
  memoryThresholdBytes: 4096,
  bandwidthThresholdBytes: 262_144,
});

test('computeTokens: 0 for no invocations, else 1 + invocations', () => {
  expect(calc.computeTokens(0)).toBe(0);
  expect(calc.computeTokens(3)).toBe(4);
});

test('memoryTokens charges 1 token per 4 KB over the threshold', () => {
  expect(calc.memoryTokens(4096)).toBe(0);
  expect(calc.memoryTokens(4096 + 4096)).toBe(1);
  expect(calc.memoryTokens(4096 + 8192 + 1)).toBe(3);
});

test('diskTokens charges 5 per write', () => {
  expect(calc.diskTokens(2)).toBe(10);
});

test('bandwidthTokens charges 2 per 256 KB over the threshold', () => {
  expect(calc.bandwidthTokens(262_144)).toBe(0);
  expect(calc.bandwidthTokens(262_144 + 262_144)).toBe(2);
});

test('databaseTokens and externalApiTokens', () => {
  expect(calc.databaseTokens(5)).toBe(5);
  expect(calc.externalApiTokens(3)).toBe(30);
});
