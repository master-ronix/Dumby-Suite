import { describe, test, expect, vi } from 'vitest';
import {
  deliverOutbound,
  signPayload,
  verifyInboundSignature,
  type OutboundDeliveryStore,
  type OutboundWebhook,
} from '../../src/webhooks/index.js';

/**
 * ACC-OPS-0032-3 — inbound payloads are HMAC-verified before processing, compared in constant time,
 * and outbound delivery is signed and idempotent. None of it had a test: the whole webhooks directory
 * sat at 0% coverage while being the one place a forged or duplicated payload would land.
 */
const secret = 'whsec_test';

function store(over: Partial<OutboundDeliveryStore> = {}): OutboundDeliveryStore {
  return {
    hasDelivered: async () => false,
    markDelivered: async () => undefined,
    ...over,
  };
}

const webhook: OutboundWebhook = { id: 'wh-1', url: 'https://example.test/hook', secretRef: 'k' };

describe('inbound signatures', () => {
  test('the signature is a sha256= prefixed HMAC of the raw body', () => {
    const signature = signPayload(secret, '{"a":1}');
    expect(signature.startsWith('sha256=')).toBe(true);
    // Deterministic for the same secret and body, different for a different body.
    expect(signPayload(secret, '{"a":1}')).toBe(signature);
    expect(signPayload(secret, '{"a":2}')).not.toBe(signature);
    expect(signPayload('other', '{"a":1}')).not.toBe(signature);
  });

  test('a matching signature verifies, a wrong one does not, and an empty one is refused', () => {
    const body = '{"event":"push"}';
    expect(verifyInboundSignature(secret, body, signPayload(secret, body))).toBe(true);
    expect(verifyInboundSignature(secret, body, signPayload('wrong-secret', body))).toBe(false);
    // A tampered body must fail even though the signature is well-formed.
    expect(verifyInboundSignature(secret, '{"event":"pull"}', signPayload(secret, body))).toBe(
      false,
    );
    // An absent signature is a refusal, not a comparison against nothing.
    expect(verifyInboundSignature(secret, body, '')).toBe(false);
  });
});

describe('outbound delivery', () => {
  test('a delivery already made for this key is a no-op, not a second write', async () => {
    const markDelivered = vi.fn(async () => undefined);
    const fetchImpl = vi.fn();
    const result = await deliverOutbound(
      webhook,
      { a: 1 },
      secret,
      'key-1',
      store({ hasDelivered: async () => true, markDelivered }),
      fetchImpl as never,
    );
    expect(result).toEqual({ ok: true, status: 0, skipped: true });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(markDelivered).not.toHaveBeenCalled();
  });

  test('a successful delivery is signed, keyed, and recorded', async () => {
    const markDelivered = vi.fn(async () => undefined);
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 204 }));
    const result = await deliverOutbound(
      webhook,
      { a: 1 },
      secret,
      'key-2',
      store({ markDelivered }),
      fetchImpl as never,
    );
    expect(result).toEqual({ ok: true, status: 204 });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    expect(init.headers['x-dumby-idempotency-key']).toBe('key-2');
    expect(init.headers['x-dumby-signature']).toBe(signPayload(secret, init.body));
    expect(markDelivered).toHaveBeenCalledWith('wh-1', 'key-2');
  });

  test('a failed delivery is NOT recorded, so the retry is a real retry', async () => {
    const markDelivered = vi.fn(async () => undefined);
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 }));
    const result = await deliverOutbound(
      webhook,
      { a: 1 },
      secret,
      'key-3',
      store({ markDelivered }),
      fetchImpl as never,
    );
    expect(result).toEqual({ ok: false, status: 500 });
    expect(markDelivered).not.toHaveBeenCalled();
  });
});
