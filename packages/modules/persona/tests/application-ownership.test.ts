import { describe, expect, test, vi } from 'vitest';
import { verifyApplicationOwnership } from '../../../../apps/main/src/personas/application-ownership.js';

const ok = (id: string): typeof fetch =>
  vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ id }),
  })) as unknown as typeof fetch;

describe('verifyApplicationOwnership', () => {
  test('accepts a token whose application matches the claim', async () => {
    const result = await verifyApplicationOwnership({
      botToken: 'tok',
      discordApplicationId: 'app-9',
      fetchImpl: ok('app-9'),
    });
    expect(result).toEqual({ owned: true });
  });

  test('rejects a token belonging to a DIFFERENT application, naming both', async () => {
    const result = await verifyApplicationOwnership({
      botToken: 'tok',
      discordApplicationId: 'app-9',
      fetchImpl: ok('app-other'),
    });
    expect(result.owned).toBe(false);
    expect(result.owned === false && result.reason).toContain('app-other');
    expect(result.owned === false && result.reason).toContain('app-9');
  });

  test('rejects a token Discord refuses', async () => {
    const result = await verifyApplicationOwnership({
      botToken: 'bad',
      discordApplicationId: 'app-9',
      fetchImpl: vi.fn(async () => ({ ok: false, status: 401 })) as unknown as typeof fetch,
    });
    expect(result.owned).toBe(false);
    expect(result.owned === false && result.reason).toContain('401');
  });

  test('rejects an empty token or an empty application id without calling Discord', async () => {
    const fetchImpl = ok('app-9');
    expect(
      (await verifyApplicationOwnership({ botToken: '', discordApplicationId: 'app-9', fetchImpl }))
        .owned,
    ).toBe(false);
    expect(
      (await verifyApplicationOwnership({ botToken: 't', discordApplicationId: '', fetchImpl }))
        .owned,
    ).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('rejects a response with no application id', async () => {
    const result = await verifyApplicationOwnership({
      botToken: 'tok',
      discordApplicationId: 'app-9',
      fetchImpl: vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({}),
      })) as unknown as typeof fetch,
    });
    expect(result.owned).toBe(false);
  });

  test('a network failure is reported, not thrown', async () => {
    const result = await verifyApplicationOwnership({
      botToken: 'tok',
      discordApplicationId: 'app-9',
      fetchImpl: vi.fn(async () => {
        throw new Error('ENOTFOUND');
      }) as unknown as typeof fetch,
    });
    expect(result.owned).toBe(false);
    expect(result.owned === false && result.reason).toContain('ENOTFOUND');
  });

  test('it asks Discord for the token own application', async () => {
    const fetchImpl = ok('app-9');
    await verifyApplicationOwnership({ botToken: 'tok', discordApplicationId: 'app-9', fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://discord.com/api/v10/applications/@me',
      expect.objectContaining({ headers: { Authorization: 'Bot tok' } }),
    );
  });
});
