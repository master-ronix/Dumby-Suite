import { signPayload } from './inbound.js';

/**
 * ACC-OPS-0032-3 / the webhook idempotency defect (change-log row 13) — outbound delivery is
 * signed (HMAC-SHA256), carries an idempotency key, and is recorded as delivered so a retry of
 * the same key is a no-op rather than a duplicate write.
 */
export interface OutboundWebhook {
  readonly id: string;
  readonly url: string;
  readonly secretRef: string;
}

export interface OutboundDeliveryStore {
  hasDelivered(webhookId: string, idempotencyKey: string): Promise<boolean>;
  markDelivered(webhookId: string, idempotencyKey: string): Promise<void>;
}

export interface DeliveryResult {
  readonly ok: boolean;
  readonly status: number;
  readonly skipped?: boolean;
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number }>;

export async function deliverOutbound(
  webhook: OutboundWebhook,
  payload: unknown,
  secret: string,
  idempotencyKey: string,
  store: OutboundDeliveryStore,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<DeliveryResult> {
  if (await store.hasDelivered(webhook.id, idempotencyKey)) {
    return { ok: true, status: 0, skipped: true };
  }

  const body = JSON.stringify(payload);
  const response = await fetchImpl(webhook.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-dumby-signature': signPayload(secret, body),
      'x-dumby-idempotency-key': idempotencyKey,
    },
    body,
  });

  if (response.ok) {
    await store.markDelivered(webhook.id, idempotencyKey);
  }
  return { ok: response.ok, status: response.status };
}
