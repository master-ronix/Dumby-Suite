import { describe, expect, test } from 'vitest';
import {
  MTP_BANDWIDTH_TOKEN_UNIT_BYTES,
  MTP_MEMORY_TOKEN_UNIT_BYTES,
  MtpTokenCalculator,
} from '../../src/analytics/mtp-token-calculator.js';

/**
 * §28.5 — MTP's artificial-token costs. `MTP_MEMORY_TOKEN_THRESHOLD_BYTES` and
 * `MTP_BANDWIDTH_TOKEN_THRESHOLD_BYTES` were declared and read by no code; they are the thresholds
 * above which the memory and bandwidth categories start charging, at §28.5's rates.
 */
const KB = 1024;
const calculator = (memoryThresholdBytes: number, bandwidthThresholdBytes: number) =>
  new MtpTokenCalculator({ memoryThresholdBytes, bandwidthThresholdBytes });

describe('M9 env keys — MTP artificial-token costs (§28.5)', () => {
  test('compute charges 1 base token plus 1 per invocation, and nothing at zero', () => {
    const mtp = calculator(4096, 262_144);
    expect(mtp.computeTokens(0)).toBe(0);
    expect(mtp.computeTokens(1)).toBe(2);
    expect(mtp.computeTokens(5)).toBe(6);
  });

  test('memory charges 1 token per 4 KB over the threshold', () => {
    const threshold = 4 * KB;
    const mtp = calculator(threshold, 262_144);
    expect(mtp.memoryTokens(threshold)).toBe(0);
    expect(mtp.memoryTokens(threshold + 1)).toBe(1);
    expect(mtp.memoryTokens(threshold + MTP_MEMORY_TOKEN_UNIT_BYTES)).toBe(1);
    expect(mtp.memoryTokens(threshold + MTP_MEMORY_TOKEN_UNIT_BYTES + 1)).toBe(2);
  });

  test('bandwidth charges 2 tokens per 256 KB over the threshold', () => {
    const threshold = 256 * KB;
    const mtp = calculator(4096, threshold);
    expect(mtp.bandwidthTokens(threshold)).toBe(0);
    expect(mtp.bandwidthTokens(threshold + 1)).toBe(2);
    expect(mtp.bandwidthTokens(threshold + MTP_BANDWIDTH_TOKEN_UNIT_BYTES)).toBe(2);
    expect(mtp.bandwidthTokens(threshold + MTP_BANDWIDTH_TOKEN_UNIT_BYTES + 1)).toBe(4);
  });

  test('disk, database and external API use flat per-event rates', () => {
    const mtp = calculator(4096, 262_144);
    expect(mtp.diskTokens(3)).toBe(15);
    expect(mtp.databaseTokens(4)).toBe(4);
    expect(mtp.externalApiTokens(2)).toBe(20);
  });

  test('the configured thresholds govern, not a hardcoded number', () => {
    const raised = calculator(50 * 1024 * 1024, 1024 * 1024);
    // 1 MB is under the 50 MB memory threshold, so nothing is charged even though it exceeds 4 KB.
    expect(raised.memoryTokens(1024 * 1024)).toBe(0);
    expect(raised.bandwidthTokens(1024 * 1024)).toBe(0);
    // Crossing the configured threshold resumes charging at the §28.5 rate.
    expect(raised.bandwidthTokens(1024 * 1024 + 1)).toBe(2);
  });
});
