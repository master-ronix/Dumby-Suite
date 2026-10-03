import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/**
 * UR-C-07's residual — `SWASTIK_QUARANTINE_PATH` was declared in the schema but read by no code,
 * so the loader always quarantined to `<modulesDir>/quarantine`. It is now wired.
 */
const bootstrap = readFileSync(
  fileURLToPath(new URL('../../src/bootstrap/bootstrap.ts', import.meta.url)),
  'utf8',
);

describe('M9 UR-C-07 — the quarantine path is wired', () => {
  test('bootstrap passes the configured quarantine directory to the loader', () => {
    expect(bootstrap).toMatch(/SWASTIK_QUARANTINE_PATH/);
    expect(bootstrap).toMatch(/quarantineDir: config\.get\('SWASTIK_QUARANTINE_PATH'\)/);
  });
});
