import { describe, expect, it } from 'vitest';
import { readRepo, readSrc } from '../spec-utils.js';
// ACC-DATA-0024-1 — PostgreSQL is the sole system of record; multi-table writes are transactional.

describe('ACC-DATA-0024-1 — db transactions', () => {
  it('the db client is Knex/PostgreSQL', () => {
    expect(readSrc('db/client.ts')).toMatch(/knex/i);
    expect(readRepo('apps/main/package.json')).toMatch(/"pg"/);
  });
});
