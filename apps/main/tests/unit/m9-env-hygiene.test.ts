import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/**
 * Finding #10 — env keys declared in the schema but read by no code are dead config (they widen
 * the surface an operator must reason about for nothing). This gates the CLAI family, where the
 * finding lives. (A repo-wide gate would also flag the inert-runtime keys — telemetry, tracing,
 * sharding, replica lag, event-loop shedding — which the M9 runtime work will consume; removing
 * those now would pre-empt it, so they are recorded rather than gated.)
 */
const srcDir = fileURLToPath(new URL('../../src', import.meta.url));

describe('M9 env hygiene (finding #10)', () => {
  test('every CLAI_* env key declared in the schema is read by code', () => {
    const schema = readFileSync(join(srcDir, 'config/env.schema.ts'), 'utf8');
    const keys = [...schema.matchAll(/^\s{4}(CLAI_[A-Z0-9_]+):/gmu)].map((m) => m[1] as string);
    expect(keys.length).toBeGreaterThan(0);

    const otherSources = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
      .filter((p) => p.endsWith('.ts') && p !== join('config', 'env.schema.ts'))
      .map((p) => readFileSync(join(srcDir, p), 'utf8'))
      .join('\n');

    const unread = keys.filter((key) => !otherSources.includes(key));
    expect(unread).toEqual([]);
  });
});
