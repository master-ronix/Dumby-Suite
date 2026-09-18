import { test, expect, describe, vi } from 'vitest';
import {
  computeIntentsBitfield,
  computePartials,
  buildDiscordClient,
} from '../../src/discord/client-builder.js';

describe('computeIntentsBitfield', () => {
  test('unions intents across modules and always includes Guilds', () => {
    const bits = computeIntentsBitfield([['GuildMessages'], ['MessageContent']]);
    expect(bits).toBeGreaterThan(0);
    // Guilds = 1 << 0, must always be present.
    expect(bits & 1).toBe(1);
  });

  test('ignores unknown intent names', () => {
    const bits = computeIntentsBitfield([['NotARealIntent']]);
    expect(bits).toBe(1);
  });

  test('deduplicates overlapping intents via bitwise or', () => {
    const single = computeIntentsBitfield([['Guilds'], ['Guilds']]);
    expect(single).toBe(1);
  });
});

describe('computePartials', () => {
  test('maps known partial names to Partials values and drops unknown ones', () => {
    const result = computePartials([['User', 'Channel', 'NotAPartial']]);
    expect(result).toContain(0);
    expect(result).toContain(1);
    expect(result).not.toContain('NotAPartial');
  });

  test('deduplicates across modules', () => {
    expect(computePartials([['User'], ['User']])).toEqual([0]);
  });

  test('returns [] for empty input', () => {
    expect(computePartials([])).toEqual([]);
  });
});

describe('buildDiscordClient', () => {
  test('constructs a client with intents, partials, and error/warn loggers', () => {
    const logger = { error: vi.fn(), warn: vi.fn() };
    const client = buildDiscordClient({
      intents: 1,
      partials: [],
      logger: logger as never,
    });
    expect(client).toBeDefined();
    expect((client.options.intents as number) & 1).toBe(1);
  });
});
