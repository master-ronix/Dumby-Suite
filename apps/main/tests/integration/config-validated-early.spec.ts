import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-DATA-0023-2 — the root config schema is Zod-validated at Stage 02.

describe('ACC-DATA-0023-2 — config validated early', () => {
  it('the env schema uses Zod and parseEnv is exported', () => {
    const env = readSrc('config/env.schema.ts');
    expect(env).toMatch(/z\./);
    expect(env).toMatch(/parseEnv/);
  });
});
