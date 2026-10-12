import { describe, expect, test, vi } from 'vitest';
import { randomRootKey, seal } from '../../src/crypto/envelope.js';
import { openSealedText } from '../../src/personas/persona-credentials.js';
import { createPersonaOAuthService } from '../../src/personas/persona-oauth.js';

type Any = Record<string, unknown>;

/** ONE root key for the whole file: sealing with a fresh key each time made opening impossible. */
const rootKey = randomRootKey('local');

function sealed(value: string): unknown {
  return seal(new TextEncoder().encode(value), rootKey);
}

function makeService(persona: Any | undefined, overrides: Any = {}) {
  const createClient = vi.fn((config: unknown) => ({ config }) as never);
  const service = createPersonaOAuthService({
    identities: { findByApplicationId: vi.fn(async () => persona) } as never,
    openSecret: (envelope) => openSealedText(envelope as never, rootKey),
    redirectUri: 'https://dumby.example/auth/callback',
    createClient,
    warn: vi.fn(),
    ...overrides,
  } as never);
  return { service, createClient };
}

describe('createPersonaOAuthService', () => {
  test('builds a client from the persona application id and its sealed secret', async () => {
    const { service, createClient } = makeService({
      discordApplicationId: 'app-9',
      oauthClientSecretSealed: sealed('persona-secret'),
    });
    const client = await service.clientForApplication('app-9');
    expect(client).toBeDefined();
    expect(createClient).toHaveBeenCalledWith({
      clientId: 'app-9',
      clientSecret: 'persona-secret',
      redirectUri: 'https://dumby.example/auth/callback',
    });
  });

  test('resolves nothing for an unknown application', async () => {
    const { service } = makeService(undefined);
    expect(await service.clientForApplication('app-x')).toBeUndefined();
  });

  test('resolves nothing when the persona has no sealed secret', async () => {
    const { service } = makeService({ discordApplicationId: 'app-9' });
    expect(await service.clientForApplication('app-9')).toBeUndefined();
  });

  test('resolves nothing for an empty application id', async () => {
    const { service, createClient } = makeService({
      discordApplicationId: 'app-9',
      oauthClientSecretSealed: sealed('persona-secret'),
    });
    expect(await service.clientForApplication('')).toBeUndefined();
    expect(createClient).not.toHaveBeenCalled();
  });

  test('resolves nothing and warns when the secret cannot be opened', async () => {
    const warn = vi.fn();
    const { service } = makeService(
      { discordApplicationId: 'app-9', oauthClientSecretSealed: sealed('s') },
      {
        openSecret: () => {
          throw new Error('unwrappable');
        },
        warn,
      },
    );
    expect(await service.clientForApplication('app-9')).toBeUndefined();
    expect(warn).toHaveBeenCalledWith('persona-oauth-secret-unreadable', expect.any(Object));
  });
});
