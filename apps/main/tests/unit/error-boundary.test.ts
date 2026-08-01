import { test, expect } from 'vitest';
import { toErrorResponse } from '../../src/http/error-boundary.js';
import {
  PermissionDeniedError,
  RateLimitedError,
  ValidationError,
} from '../../src/errors/taxonomy.js';

test('a DumbyError renders its own status code and JSON envelope', () => {
  const { statusCode, body } = toErrorResponse(new PermissionDeniedError(2, 'blacklisted'));
  expect(statusCode).toBe(403);
  expect(body.error.code).toBe('DUMBY_PERMISSION_DENIED');
  expect(body.error.retryable).toBe(false);
});

test('a RateLimitedError carries retryable: true and its retryAfterMs in metadata', () => {
  const { statusCode, body } = toErrorResponse(new RateLimitedError(1500));
  expect(statusCode).toBe(429);
  expect(body.error.retryable).toBe(true);
  expect(body.error.metadata.retryAfterMs).toBe(1500);
});

test('a ValidationError surfaces its field errors', () => {
  const { body } = toErrorResponse(new ValidationError('bad input', { email: 'invalid' }));
  expect(body.error.metadata.fieldErrors).toStrictEqual({ email: 'invalid' });
});

test('a plain Error (not a DumbyError) is flattened to a generic 500 with no internal detail leaked', () => {
  const { statusCode, body } = toErrorResponse(
    new Error('leaked stack trace detail, secret path names'),
  );
  expect(statusCode).toBe(500);
  expect(body.error.code).toBe('DUMBY_INTERNAL_ERROR');
  expect(body.error.message.includes('leaked')).toBe(false);
  expect(body.error.message.includes('secret')).toBe(false);
});

test('a thrown non-Error value (string, undefined, object) is also flattened safely', () => {
  expect(toErrorResponse('just a string').statusCode).toBe(500);
  expect(toErrorResponse(undefined).statusCode).toBe(500);
  expect(toErrorResponse({ weird: 'shape' }).statusCode).toBe(500);
});
