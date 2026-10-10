import { describe, expect, test, vi } from 'vitest';
import { createBccmEffectHandlers, type BccmEffectDeps } from '../../src/commands/bccm-effects.js';
import { CommandNotFoundError } from '../../src/commands/command-router.js';

function harness() {
  const insert = vi.fn(async () => undefined);
  const knex = vi.fn(() => ({ insert })) as unknown as BccmEffectDeps['knex'];
  const registry = {
    has: (key: string) => ['ban', 'kick'].includes(key),
  } as unknown as BccmEffectDeps['registry'];
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as BccmEffectDeps['logger'];
  const handlers = createBccmEffectHandlers({ knex, registry, logger });
  return { handlers, insert, logger };
}

const interaction = (guildId: string | null) => ({ guildId, user: { id: 'u1' } });

describe('bccm effect handlers', () => {
  test('submits a valid rename to the queue', async () => {
    const { handlers, insert, logger } = harness();
    await handlers['bccm.submit']?.(
      { commandKey: 'ban', action: 'rename', newName: 'timeout' },
      interaction('g1'),
    );
    expect(insert).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('bccm-queue-submitted', expect.any(Object));
  });

  test('ignores a submission outside a guild', async () => {
    const { handlers, insert } = harness();
    await handlers['bccm.submit']?.({ commandKey: 'ban' }, interaction(null));
    expect(insert).not.toHaveBeenCalled();
  });

  test('rejects a command that is not registered', async () => {
    const { handlers } = harness();
    await expect(
      handlers['bccm.submit']?.({ commandKey: 'ghost' }, interaction('g1')),
    ).rejects.toBeInstanceOf(CommandNotFoundError);
  });

  test('rejects a missing command key', async () => {
    const { handlers } = harness();
    await expect(handlers['bccm.submit']?.({}, interaction('g1'))).rejects.toBeInstanceOf(
      CommandNotFoundError,
    );
  });

  test('rejects an action outside the supported set', async () => {
    const { handlers } = harness();
    await expect(
      handlers['bccm.submit']?.({ commandKey: 'ban', action: 'explode' }, interaction('g1')),
    ).rejects.toBeInstanceOf(CommandNotFoundError);
  });

  test('defaults the action to rename', async () => {
    const { handlers, insert } = harness();
    await handlers['bccm.submit']?.({ commandKey: 'ban' }, interaction('g1'));
    const row = insert.mock.calls[0]?.[0] as { payload: { action: string } };
    expect(row.payload.action).toBe('rename');
  });

  test('records alias and disable payload fields when present', async () => {
    const { handlers, insert } = harness();
    await handlers['bccm.submit']?.(
      { commandKey: 'kick', action: 'alias', alias: 'yeet', disable: false },
      interaction('g1'),
    );
    const row = insert.mock.calls[0]?.[0] as { payload: { alias?: string; disable?: boolean } };
    expect(row.payload.alias).toBe('yeet');
    expect(row.payload.disable).toBe(false);
  });
});
