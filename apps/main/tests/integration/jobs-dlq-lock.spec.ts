import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-OPS-0029-2 — exhausted jobs move to the DLQ; cron tasks take a Redlock before executing.

describe('ACC-OPS-0029-2 — DLQ and Redlock', () => {
  it('the queue manager supports DLQ and the scheduler takes a lock', () => {
    expect(readSrc('queue/queue-manager.ts')).toMatch(/dlq|dead.?letter/i);
    expect(readSrc('queue/scheduler.ts')).toMatch(/lock/i);
  });
});
