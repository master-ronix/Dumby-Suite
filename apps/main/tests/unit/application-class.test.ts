import { test, expect, vi } from 'vitest';

vi.mock('../../src/bootstrap/bootstrap.js', () => ({
  bootstrap: vi.fn().mockResolvedValue(undefined),
}));

const { Application } = await import('../../src/application/Application.js');

test('isRunning returns false before start', () => {
  const app = new Application();
  expect(app.isRunning()).toBe(false);
});

test('start calls bootstrap and sets running state', async () => {
  const app = new Application();
  await app.start();
  expect(app.isRunning()).toBe(true);
});

test('second call to start is a no-op', async () => {
  const app = new Application();
  await app.start();
  await app.start();
  expect(app.isRunning()).toBe(true);
});
