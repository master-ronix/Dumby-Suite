import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/**
 * Finding #25 — the runtime grant writer existed and was tested, but nothing constructed it in
 * `bootstrap.ts` or wired it into the resolver, so Layer 7 grants could not be written at runtime.
 * This asserts the wiring; the writer's own behaviour is covered by `m4-grant-writer.test.ts`.
 */
function source(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
}

const bootstrapSource = source('../../src/bootstrap/bootstrap.ts');
const routerSource = source('../../src/commands/command-router.ts');

describe('M4 finding #25 — the runtime grant writer is wired', () => {
  test('bootstrap constructs a PostgresGrantWriter and passes it to the router', () => {
    expect(bootstrapSource).toMatch(/new PostgresGrantWriter\(db\.knex\)/);
    expect(bootstrapSource).toMatch(/grantStore:\s*new PostgresGrantWriter/);
  });

  test('the router accepts a grant store and loads grants from it at dispatch time', () => {
    expect(routerSource).toMatch(/grantStore\?:/);
    expect(routerSource).toMatch(/this\.options\.grantStore\.list\(/);
    expect(routerSource).toMatch(/guildGrants,/);
  });
});
