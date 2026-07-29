import { test, expect } from 'vitest';
import {
  DumbyError,
  ValidationError,
  PermissionDeniedError,
  NotFoundError,
  RateLimitedError,
  MaintenanceModeError,
  DependencyUnavailableError,
  EventCycleError,
  moduleDisabledResult,
  isModuleDisabledResult,
  isDumbyError,
} from '../../src/errors/taxonomy.js';

test('DumbyError.toJSON returns the standard API error envelope', () => {
  const err = new DumbyError('boom', { code: 'X', httpStatus: 500, metadata: { a: 1 } });
  expect(err.toJSON()).toStrictEqual({
        error: { code: 'X', message: 'boom', retryable: false, metadata: { a: 1 } },
      });
});

test('ValidationError defaults to 400 and carries field errors', () => {
  const err = new ValidationError('invalid payload', { name: 'required' });
  expect(err.httpStatus).toBe(400);
  expect(err.code).toBe('DUMBY_VALIDATION_ERROR');
  expect(err.metadata.fieldErrors).toStrictEqual({ name: 'required' });
});

test('PermissionDeniedError records layer index and reason', () => {
  const err = new PermissionDeniedError(6, 'missing MOD role');
  expect(err.layerIndex).toBe(6);
  expect(err.reason).toBe('missing MOD role');
  expect(err.httpStatus).toBe(403);
  expect(err.message).toMatch(/layer 6/);
});

test('PermissionDeniedError rejects an out-of-range layer index', () => {
  expect(() => new PermissionDeniedError(8, 'nope')).toThrow(RangeError);
  expect(() => new PermissionDeniedError(0, 'nope')).toThrow(RangeError);
});

test('NotFoundError formats message with and without an id', () => {
  expect(new NotFoundError('guild').message).toMatch(/^guild not found$/);
  expect(new NotFoundError('guild', '123').message).toMatch(/^guild not found: 123$/);
});

test('RateLimitedError is retryable and carries retryAfterMs', () => {
  const err = new RateLimitedError(2500, 'guild');
  expect(err.retryable).toBe(true);
  expect(err.retryAfterMs).toBe(2500);
  expect(err.httpStatus).toBe(429);
});

test('MaintenanceModeError defaults to 503 and retryable', () => {
  const err = new MaintenanceModeError('scheduled migration');
  expect(err.httpStatus).toBe(503);
  expect(err.retryable).toBe(true);
  expect(err.metadata.reason).toBe('scheduled migration');
});

test('DependencyUnavailableError carries the failing system and original cause', () => {
  const cause = new Error('ECONNREFUSED');
  const err = new DependencyUnavailableError('redis', cause);
  expect(err.system).toBe('redis');
  expect(err.cause).toBe(cause);
  expect(err.retryable).toBe(true);
});

test('EventCycleError renders the full chain in its message', () => {
  const err = new EventCycleError(['a.b.c', 'd.e.f', 'a.b.c']);
  expect(err.message).toMatch(/a\.b\.c -> d\.e\.f -> a\.b\.c/);
  expect(err.chain).toStrictEqual(['a.b.c', 'd.e.f', 'a.b.c']);
});

test('isDumbyError narrows correctly and rejects plain errors', () => {
  expect(isDumbyError(new ValidationError('x'))).toBe(true);
  expect(isDumbyError(new Error('plain'))).toBe(false);
  expect(isDumbyError('not an error')).toBe(false);
});

test('moduleDisabledResult sentinel round-trips through isModuleDisabledResult', () => {
  const sentinel = moduleDisabledResult('economy');
  expect(isModuleDisabledResult(sentinel)).toBe(true);
  expect(sentinel.moduleId).toBe('economy');
  expect(isModuleDisabledResult({ kind: 'not-it' })).toBe(false);
  expect(isModuleDisabledResult(null)).toBe(false);
  expect(isModuleDisabledResult(42)).toBe(false);
});
