import { describe, expect, test, vi } from 'vitest';
import {
  AUTOCOMPLETE_BUDGET_MS,
  InteractionRegistry,
  type ComponentInteraction,
} from '../../src/interactions/interaction-registry.js';

function makeInteraction(
  customId = 'modules:list:user-1:list',
  userId = 'user-1',
): ComponentInteraction {
  return {
    id: undefined,
    customId,
    user: { id: userId },
    guildId: 'guild-1',
    reply: vi.fn(),
    deferReply: vi.fn(),
    editReply: vi.fn(),
  };
}

describe('InteractionRegistry minting', () => {
  test('mints a stateless 4-segment customId', () => {
    const registry = new InteractionRegistry();
    const minted = registry.mintCustomId({
      moduleNamespace: 'modules',
      handlerKey: 'list',
      invokerId: 'user-1',
      contextPayload: 'c_1',
    });

    expect(minted).toBe('modules:list:user-1:c_1');
  });

  test('rejects a minted customId over Discord length cap', () => {
    const registry = new InteractionRegistry();
    expect(() =>
      registry.mintCustomId({
        moduleNamespace: 'm'.repeat(50),
        handlerKey: 'h'.repeat(50),
        invokerId: 'i',
        contextPayload: 'p',
      }),
    ).toThrow(RangeError);
  });
});

describe('InteractionRegistry dispatch', () => {
  test('dispatches to the handler matching the customId prefix', async () => {
    const registry = new InteractionRegistry();
    const execute = vi.fn(async () => undefined);
    registry.register({
      customIdPrefix: 'modules:',
      parse: (customId) => customId,
      execute,
    });

    const handled = await registry.dispatch(makeInteraction('modules:list:user-1:list'));

    expect(handled).toBe(true);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ customId: 'modules:list:user-1:list' }),
      'modules:list:user-1:list',
    );
  });

  test('returns false when no handler matches the customId', async () => {
    const registry = new InteractionRegistry();

    await expect(registry.dispatch(makeInteraction('unknown:item'))).resolves.toBe(false);
  });

  test('silently drops a non-invoker click without buffer, notice, or execution', async () => {
    const acknowledge = vi.fn(async () => undefined);
    const registry = new InteractionRegistry({ acknowledge });
    const execute = vi.fn(async () => undefined);
    registry.register({
      customIdPrefix: 'queue:',
      parse: (customId) => customId,
      execute,
    });

    const interaction = makeInteraction('queue:cancel:user-1:5', 'intruder');
    const handled = await registry.dispatch(interaction);

    expect(handled).toBe(true);
    expect(execute).not.toHaveBeenCalled();
    expect(acknowledge).not.toHaveBeenCalled();
    expect(interaction.editReply).not.toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  test('acknowledges a routed interaction before execution (buffer lifecycle)', async () => {
    const execute = vi.fn(async () => undefined);
    const acknowledge = vi.fn(async () => undefined);
    const registry = new InteractionRegistry({ acknowledge });
    registry.register({
      customIdPrefix: 'queue:',
      parse: (customId) => customId,
      execute,
    });

    await registry.dispatch(makeInteraction('queue:cancel:user-1:5'));

    expect(acknowledge).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  test('does not acknowledge unhandled customIds', async () => {
    const acknowledge = vi.fn(async () => undefined);
    const registry = new InteractionRegistry({ acknowledge });

    await registry.dispatch(makeInteraction('nohandler:x'));

    expect(acknowledge).not.toHaveBeenCalled();
  });

  test('deduplicates completed dispatches by default idempotency key', async () => {
    const registry = new InteractionRegistry();
    const execute = vi.fn(async () => undefined);
    registry.register({
      customIdPrefix: 'modules:',
      parse: (customId) => customId,
      execute,
    });
    const interaction = makeInteraction('modules:list:user-1:x');

    await registry.dispatch(interaction);
    await registry.dispatch(interaction);

    expect(execute).toHaveBeenCalledTimes(1);
  });

  test('deduplicates concurrent dispatches by custom idempotency key', async () => {
    const registry = new InteractionRegistry();
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const execute = vi.fn(async () => blocked);
    registry.register({
      customIdPrefix: 'queue:',
      parse: (customId) => customId,
      idempotencyKey: () => 'stable-key',
      execute,
    });

    const first = registry.dispatch(makeInteraction('queue:cancel:user-1:1'));
    const second = registry.dispatch(makeInteraction('queue:cancel:user-1:2'));
    await Promise.resolve();
    expect(execute).toHaveBeenCalledTimes(1);

    release();
    await Promise.all([first, second]);

    expect(execute).toHaveBeenCalledTimes(1);
  });

  test('a retried interaction returns the original outcome', async () => {
    const registry = new InteractionRegistry();
    const execute = vi.fn(async () => undefined);
    registry.register({
      customIdPrefix: 'install:',
      parse: (customId) => customId,
      idempotencyKey: () => 'install:browse',
      execute,
    });

    await expect(registry.dispatch(makeInteraction('install:browse:user-1:x'))).resolves.toBe(true);
    await expect(registry.dispatch(makeInteraction('install:browse:user-1:y'))).resolves.toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe('InteractionRegistry autocomplete budget', () => {
  test('returns fast results when the handler beats the budget', async () => {
    const registry = new InteractionRegistry();
    await expect(registry.runAutocomplete(async () => ['a', 'b'], [])).resolves.toEqual(['a', 'b']);
  });

  test('returns the fallback list once the budget lapses', async () => {
    const registry = new InteractionRegistry();
    const slow = async (): Promise<readonly string[]> => {
      await new Promise((resolve) => {
        setTimeout(resolve, 20_000);
      });
      return ['late'];
    };

    await expect(registry.runAutocomplete(slow, ['cached'], 5)).resolves.toEqual(['cached']);
  });

  test('defaults to the 800 ms autocomplete budget', () => {
    expect(AUTOCOMPLETE_BUDGET_MS).toBe(800);
  });
});

// UR-20261026-098 — the opt-in reaches the guard, so a control that needs a private follow-up gets it
// and every other control keeps the guard intact.
describe('UR-20261026-098 — allowFollowUp reaches the renderer guard', () => {
  test("passes the handler's opt-in to createReadOnlyInteraction", async () => {
    const seen: Array<{ allowFollowUp?: boolean } | undefined> = [];
    const renderer = {
      createReadOnlyInteraction<T extends object>(
        interaction: T,
        options?: { allowFollowUp?: boolean },
      ): T {
        seen.push(options);
        return interaction;
      },
    };
    const registry = new InteractionRegistry({ renderer });
    const execute = vi.fn(async () => undefined);
    registry.register({ customIdPrefix: 'a:', allowFollowUp: true, parse: () => ({}), execute });
    registry.register({ customIdPrefix: 'b:', parse: () => ({}), execute });

    await registry.dispatch(makeInteraction('a:one'));
    await registry.dispatch(makeInteraction('b:one'));

    expect(seen[0]).toEqual({ allowFollowUp: true });
    expect(seen[1]).toEqual({ allowFollowUp: false });
  });
});
