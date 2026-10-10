import { describe, expect, test } from 'vitest';
import type { Knex } from 'knex';
import {
  effectiveCommandName,
  resolveEffectiveCommandNames,
} from '../../src/commands/command-renames.js';

function knexReturning(rows: unknown[]): Knex {
  const builder = { where: () => ({ whereNull: () => ({ select: async () => rows }) }) };
  return (() => builder) as unknown as Knex;
}

describe('command-renames resolution', () => {
  test('a caller with no guild resolves to no renames', async () => {
    const names = await resolveEffectiveCommandNames(knexReturning([]), null);
    expect(names.size).toBe(0);
  });

  test('applied renames are keyed by the command key', async () => {
    const names = await resolveEffectiveCommandNames(
      knexReturning([{ commandKey: 'ban', newName: 'timeout' }]),
      'g1',
    );
    expect(names.get('ban')).toBe('timeout');
  });

  test('malformed rows are ignored rather than mis-keyed', async () => {
    const names = await resolveEffectiveCommandNames(
      knexReturning([{ commandKey: 'ban' }, { commandKey: 1, newName: 2 }]),
      'g1',
    );
    expect(names.size).toBe(0);
  });

  test('effectiveCommandName returns the rename, or the key when none applies', () => {
    const names = new Map([['ban', 'timeout']]);
    expect(effectiveCommandName(names, 'ban')).toBe('timeout');
    expect(effectiveCommandName(names, 'kick')).toBe('kick');
  });
});
