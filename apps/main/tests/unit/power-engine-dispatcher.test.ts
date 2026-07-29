import { test, expect } from 'vitest';
import {
  PowerEngineDispatcher,
  InMemoryAuditWriter,
  validatePowerEngineRequest,
} from '../../src/http/power-engine-dispatcher.js';

const trusted = { trustedSources: ['dashboard', 'swastik-internal'] };

test('validatePowerEngineRequest rejects a missing actorId', () => {
  const result = validatePowerEngineRequest({ actorId: '', source: 'dashboard', reason: 'ok' }, trusted);
  expect(result).toStrictEqual({ valid: false, rejectionReason: 'MISSING_ACTOR_ID' });
});

test('validatePowerEngineRequest rejects an empty (or whitespace-only) reason', () => {
  expect(validatePowerEngineRequest({ actorId: 'u1', source: 'dashboard', reason: '' }, trusted).valid).toBe(false);
  const whitespaceResult = validatePowerEngineRequest(
    { actorId: 'u1', source: 'dashboard', reason: '   ' },
    trusted,
  );
  expect(whitespaceResult.valid).toBe(false);
  expect((whitespaceResult as { rejectionReason: string }).rejectionReason).toBe('EMPTY_REASON');
});

test('validatePowerEngineRequest rejects an untrusted source', () => {
  const result = validatePowerEngineRequest(
    { actorId: 'u1', source: 'random-website', reason: 'testing' },
    trusted,
  );
  expect(result).toStrictEqual({ valid: false, rejectionReason: 'UNTRUSTED_SOURCE' });
});

test('validatePowerEngineRequest accepts a fully valid request', () => {
  expect(validatePowerEngineRequest({ actorId: 'u1', source: 'dashboard', reason: 'incident response' }, trusted)).toStrictEqual({ valid: true });
});

test('dispatch() runs the handler and writes exactly one "allowed" audit row on success', async () => {
  const auditWriter = new InMemoryAuditWriter();
  const dispatcher = new PowerEngineDispatcher(trusted, auditWriter);
  let handlerCalls = 0;

  const outcome = await dispatcher.dispatch(
    'guild.suspend',
    { actorId: 'owner-1', source: 'dashboard', reason: 'ToS violation' },
    async () => {
      handlerCalls += 1;
      return { suspended: true };
    },
  );

  expect(outcome).toStrictEqual({ ok: true, result: { suspended: true } });
  expect(handlerCalls).toBe(1);
  expect(auditWriter.entries.length).toBe(1);
  expect(auditWriter.entries[0]?.outcome).toBe('allowed');
  expect(auditWriter.entries[0]?.action).toBe('guild.suspend');
});

test('dispatch() never calls the handler and still writes a "rejected" audit row for an invalid request', async () => {
  const auditWriter = new InMemoryAuditWriter();
  const dispatcher = new PowerEngineDispatcher(trusted, auditWriter);
  let handlerCalls = 0;

  const outcome = await dispatcher.dispatch(
    'guild.suspend',
    { actorId: 'owner-1', source: 'dashboard', reason: '' },
    async () => {
      handlerCalls += 1;
      return { suspended: true };
    },
  );

  expect(outcome).toStrictEqual({ ok: false, rejectionReason: 'EMPTY_REASON' });
  expect(handlerCalls).toBe(0);
  expect(auditWriter.entries.length).toBe(1);
  expect(auditWriter.entries[0]?.outcome).toBe('rejected');
  expect(auditWriter.entries[0]?.rejectionReason).toBe('EMPTY_REASON');
});

test('every attempt is audited unconditionally, including a run of mixed allowed/rejected calls', async () => {
  const auditWriter = new InMemoryAuditWriter();
  const dispatcher = new PowerEngineDispatcher(trusted, auditWriter);

  await dispatcher.dispatch('a', { actorId: 'u1', source: 'dashboard', reason: 'x' }, async () => 1);
  await dispatcher.dispatch('b', { actorId: 'u1', source: 'evil', reason: 'x' }, async () => 2);
  await dispatcher.dispatch('c', { actorId: '', source: 'dashboard', reason: 'x' }, async () => 3);

  expect(auditWriter.entries.length).toBe(3);
  expect(auditWriter.entries.map((e) => e.outcome)).toStrictEqual(['allowed', 'rejected', 'rejected']);
});
