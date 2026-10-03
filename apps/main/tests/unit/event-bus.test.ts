import { test, expect } from 'vitest';
import {
  InternalEventBus,
  isValidEventName,
  isProtectedEventDomain,
} from '../../src/events/event-bus.js';
import { EventCycleError } from '../../src/errors/taxonomy.js';

test('event name validation enforces {domain}.{entity}.{action}', () => {
  expect(isValidEventName('guild.member.joined')).toBe(true);
  expect(isValidEventName('dumby.system.ready')).toBe(true);
  expect(isValidEventName('auto-moderation.case.created')).toBe(true);
  expect(isValidEventName('guild.member')).toBe(false);
  expect(isValidEventName('guild.member.joined.extra')).toBe(false);
  expect(isValidEventName('Guild.Member.Joined')).toBe(false);
  expect(isValidEventName('')).toBe(false);
});

test('emit() throws TypeError for an invalid event name instead of silently no-oping', async () => {
  const bus = new InternalEventBus();
  await expect(() => bus.emit('not-a-valid-name', {})).rejects.toThrow(TypeError);
});

test('subscribers fire in descending priority order', async () => {
  const bus = new InternalEventBus();
  const order: string[] = [];
  bus.on(
    'guild.member.joined',
    () => {
      order.push('low');
    },
    0,
  );
  bus.on(
    'guild.member.joined',
    () => {
      order.push('high');
    },
    100,
  );
  bus.on(
    'guild.member.joined',
    () => {
      order.push('mid');
    },
    50,
  );
  await bus.emit('guild.member.joined', {});
  expect(order).toStrictEqual(['high', 'mid', 'low']);
});

test('once() handlers fire exactly one time then auto-unsubscribe', async () => {
  const bus = new InternalEventBus();
  let calls = 0;
  bus.once('guild.member.joined', () => {
    calls += 1;
  });
  await bus.emit('guild.member.joined', {});
  await bus.emit('guild.member.joined', {});
  expect(calls).toBe(1);
});

test('onAny() receives every event with its name and payload', async () => {
  const bus = new InternalEventBus();
  const seen: Array<{ eventName: string; payload: unknown }> = [];
  bus.onAny((envelope) => {
    seen.push(envelope);
  });
  await bus.emit('guild.member.joined', { id: 1 });
  await bus.emit('guild.role.updated', { id: 2 });
  expect(seen).toStrictEqual([
    { eventName: 'guild.member.joined', payload: { id: 1 } },
    { eventName: 'guild.role.updated', payload: { id: 2 } },
  ]);
});

test('unsubscribe function returned by on() stops future delivery', async () => {
  const bus = new InternalEventBus();
  let calls = 0;
  const unsubscribe = bus.on('guild.member.joined', () => {
    calls += 1;
  });
  await bus.emit('guild.member.joined', {});
  unsubscribe();
  await bus.emit('guild.member.joined', {});
  expect(calls).toBe(1);
});

test('a throwing subscriber is caught per-subscriber and does not stop later subscribers', async () => {
  const order: string[] = [];
  const errors: unknown[] = [];
  const bus = new InternalEventBus({ onSubscriberError: (err) => errors.push(err) });
  bus.on(
    'guild.member.joined',
    () => {
      order.push('first');
      throw new Error('boom');
    },
    10,
  );
  bus.on(
    'guild.member.joined',
    () => {
      order.push('second');
    },
    5,
  );
  await bus.emit('guild.member.joined', {});
  expect(order).toStrictEqual(['first', 'second']);
  expect(errors.length).toBe(1);
});

test('emit depth beyond EVENT_BUS_MAX_EMIT_DEPTH throws EventCycleError with the full chain', async () => {
  const bus = new InternalEventBus({ maxEmitDepth: 3 });
  bus.on('a.b.c', async () => {
    await bus.emit('d.e.f', {});
  });
  bus.on('d.e.f', async () => {
    await bus.emit('g.h.i', {});
  });
  bus.on('g.h.i', async () => {
    await bus.emit('j.k.l', {});
  });
  await expect(() => bus.emit('a.b.c', {})).rejects.toThrow();
});

test('default maxEmitDepth is 20, matching EVENT_BUS_MAX_EMIT_DEPTH', async () => {
  const bus = new InternalEventBus();
  let depth = 0;
  bus.on('loop.step.tick', async () => {
    depth += 1;
    if (depth < 25) {
      await bus.emit('loop.step.tick', {});
    }
  });
  await expect(() => bus.emit('loop.step.tick', {})).rejects.toThrow(EventCycleError);
  expect(depth).toBeLessThanOrEqual(22);
});

test('isProtectedEventDomain guards moderation/automod/verification/cache regardless of caller intent', () => {
  expect(isProtectedEventDomain('moderation.case.created')).toBe(true);
  expect(isProtectedEventDomain('automod.filter.triggered')).toBe(true);
  expect(isProtectedEventDomain('verification.member.passed')).toBe(true);
  expect(isProtectedEventDomain('cache.guild-config.invalidated')).toBe(true);
  expect(isProtectedEventDomain('welcome.member.greeted')).toBe(false);
});

test('default (no hook) subscriber errors are isolated and recorded, never aborting the rest (UR-C-16)', async () => {
  const bus = new InternalEventBus();
  const order: string[] = [];
  bus.on(
    'guild.member.joined',
    () => {
      order.push('first');
      throw new Error('boom');
    },
    10,
  );
  bus.on(
    'guild.member.joined',
    () => {
      order.push('second');
    },
    5,
  );
  await bus.emit('guild.member.joined', {});
  expect(order).toStrictEqual(['first', 'second']);
  const errors = bus.getSubscriberErrors();
  expect(errors).toHaveLength(1);
  expect(errors[0]?.eventName).toBe('guild.member.joined');
  expect((errors[0]?.error as Error).message).toBe('boom');
});

test('emitSync runs sync listeners in priority order before returning (UR-C-16)', () => {
  const bus = new InternalEventBus();
  const order: string[] = [];
  bus.on('guild.member.joined', () => void order.push('low'), 0);
  bus.on('guild.member.joined', () => void order.push('high'), 100);
  bus.emitSync('guild.member.joined', {});
  expect(order).toStrictEqual(['high', 'low']);
});

test('emitSync isolates sync throws and completes remaining listeners (UR-C-16)', () => {
  const bus = new InternalEventBus();
  const order: string[] = [];
  bus.on(
    'guild.member.joined',
    () => {
      order.push('first');
      throw new Error('sync-boom');
    },
    10,
  );
  bus.on(
    'guild.member.joined',
    () => {
      order.push('second');
    },
    5,
  );
  expect(() => bus.emitSync('guild.member.joined', {})).not.toThrow();
  expect(order).toStrictEqual(['first', 'second']);
  expect(bus.getSubscriberErrors()).toHaveLength(1);
});

test('emitSync rejects an invalid event name like emit (UR-C-16)', () => {
  const bus = new InternalEventBus();
  expect(() => bus.emitSync('not-a-valid-name', {})).toThrow(TypeError);
});

test('emitSync applies the same cycle-depth guard as emit (UR-C-16)', () => {
  const bus = new InternalEventBus({ maxEmitDepth: 2 });
  bus.on('a.b.c', () => {
    bus.emitSync('d.e.f', {});
  });
  bus.on('d.e.f', () => {
    bus.emitSync('g.h.i', {});
  });
  expect(() => bus.emitSync('a.b.c', {})).toThrow(EventCycleError);
});
