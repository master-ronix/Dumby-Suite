import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/**
 * Finding #15 — `QueueManager.pause()`/`resume()` were implemented but unrouted (the two
 * power-engine admin routes were honest 501s). This asserts the wiring; the routes' behaviour
 * needs the admin deps (a full dispatcher/db/config), so the proof is structural plus a check
 * that the manager now exposes the queue list the routes iterate.
 */
function source(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
}

const routes = source('../../src/http/routes/admin.routes.ts');
const bootstrap = source('../../src/bootstrap/bootstrap.ts');
const manager = source('../../src/queue/queue-manager.ts');

describe('M9 finding #15 — the queue pause/resume routes are wired', () => {
  test('the admin deps carry a queue manager and the routes call it', () => {
    expect(routes).toMatch(/queueManager\?:/);
    expect(routes).toMatch(/deps\.queueManager\.pause\(/);
    expect(routes).toMatch(/deps\.queueManager\.resume\(/);
    // the 501 fallback stays for a deployment without a queue manager
    expect(routes).toMatch(/sendNotImplemented\(reply, 'pauseQueue'\)/);
  });

  test('bootstrap passes the queue manager into the admin deps', () => {
    expect(bootstrap).toMatch(/queueManager:\s*queue,/);
  });

  test('the queue manager exposes the registered queue names', () => {
    expect(manager).toMatch(/list\(\): readonly string\[\]/);
  });
});
