import { describe, expect, it } from 'vitest';
import { existsRepo, listDir } from '../spec-utils.js';
// ACC-OPS-0031-1 — MTP usage metering records per-guild token/usage rows without leaking PII.

describe('ACC-OPS-0031-1 — MTP metering', () => {
  it('the MTP calculator and a metering migration exist', () => {
    expect(existsRepo('apps/main/src/analytics/mtp-token-calculator.ts')).toBe(true);
    expect(listDir('apps/main/src/db/migrations').some((f) => f.includes('metering'))).toBe(true);
  });
});
