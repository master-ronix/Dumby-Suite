import { test, expect } from 'vitest';
import pino from 'pino';
import { Logger, REDACT_PATHS } from '../../src/logging/logger.js';

function sinkLogger(): { logger: Logger; lines: string[] } {
  const lines: string[] = [];
  const instance = pino(
    { level: 'info', redact: { paths: REDACT_PATHS, censor: '[REDACTED]' }, timestamp: false },
    {
      write: (msg: string) => {
        lines.push(msg);
      },
    },
  );
  return { logger: new Logger(instance), lines };
}

const last = (lines: string[]): Record<string, unknown> =>
  JSON.parse(lines[lines.length - 1] ?? '{}');

test('non-secret fields pass through untouched', () => {
  const { logger, lines } = sinkLogger();
  logger.info('hello', { userId: 'u-1', module: 'health' });
  const out = last(lines);
  expect(out.userId).toBe('u-1');
  expect(out.module).toBe('health');
});

test('a nested token is redacted at one level of depth', () => {
  const { logger, lines } = sinkLogger();
  logger.info('x', { bot: { token: 'abc123' } });
  expect(last(lines).bot).toStrictEqual({ token: '[REDACTED]' });
});

test('a token nested two levels deep is redacted', () => {
  const { logger, lines } = sinkLogger();
  logger.info('x', { service: { credentials: { token: 'deep-secret' } } });
  const out = last(lines) as { service: { credentials: { token: unknown } } };
  expect(out.service.credentials.token).toBe('[REDACTED]');
});

test('webhookUrl, signingKey, apiKey, clientSecret, accessToken and refreshToken are redacted', () => {
  const { logger, lines } = sinkLogger();
  logger.info('x', {
    webhook: { webhookUrl: 'https://hooks.example/secret' },
    deployment: { signingKey: 'sig-1' },
    client: { apiKey: 'key-1', clientSecret: 'cs-1' },
    oauth: { accessToken: 'at-1', refreshToken: 'rt-1' },
  });
  const out = last(lines) as Record<string, Record<string, unknown>>;
  expect(out.webhook.webhookUrl).toBe('[REDACTED]');
  expect(out.deployment.signingKey).toBe('[REDACTED]');
  expect(out.client.apiKey).toBe('[REDACTED]');
  expect(out.client.clientSecret).toBe('[REDACTED]');
  expect(out.oauth.accessToken).toBe('[REDACTED]');
  expect(out.oauth.refreshToken).toBe('[REDACTED]');
});

test('authorization headers are still redacted at the request level', () => {
  const { logger, lines } = sinkLogger();
  logger.info('req', { req: { headers: { authorization: 'Bearer xy' } } });
  const out = last(lines) as { req: { headers: { authorization: unknown } } };
  expect(out.req.headers.authorization).toBe('[REDACTED]');
});
