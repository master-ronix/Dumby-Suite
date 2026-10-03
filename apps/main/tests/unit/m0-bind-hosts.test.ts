import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { ENV_KEYS } from '../../src/config/env.schema.js';

/**
 * UR-B-03's residue: bind-host configurability covered only the Credentials Service; the Power Engine,
 * CLAI, Swastik and Twill entry points hardcoded the loopback literal. Those entry points run
 * side effects at module scope and are not behind `isMainEntry` (findings #11/#16 → M9), so they
 * cannot be imported in a unit test — coverage is structural, as slices 2 and 5 established.
 */

const repoRoot = join(import.meta.dirname, '..', '..');

const BINDINGS: ReadonlyArray<{ file: string; key: string }> = [
  { file: 'entry/power-engine.ts', key: 'POWER_ENGINE_BIND_HOST' },
  { file: 'entry/ssh-clai.ts', key: 'CLAI_BIND_HOST' },
  { file: 'entry/swastik.ts', key: 'SWASTIK_BIND_HOST' },
  { file: 'entry/twill.ts', key: 'TWILL_BIND_HOST' },
];

function readSource(rel: string): string {
  return readFileSync(join(repoRoot, 'src', rel), 'utf8');
}

describe('bind-host configurability (UR-B-03)', () => {
  test.each(BINDINGS)('$file sources its listen host from env.$key', ({ file, key }) => {
    const source = readSource(file);
    expect(source).toContain(`env.${key}`);
    // The hardcoded loopback literal is gone from the entry point entirely.
    expect(source).not.toContain("'127.0.0.1'");
  });

  test.each(BINDINGS)('env.schema declares $key defaulting to loopback', ({ key }) => {
    expect(ENV_KEYS).toContain(key);
    const schema = readFileSync(join(repoRoot, 'src', 'config', 'env.schema.ts'), 'utf8');
    expect(schema).toContain(`${key}: z.string().default('127.0.0.1')`);
  });

  test('every bind-host key is documented in .env.example', () => {
    const example = readFileSync(join(repoRoot, '.env.example'), 'utf8');
    for (const { key } of BINDINGS) {
      expect(example).toContain(`${key}=127.0.0.1`);
    }
  });
});
