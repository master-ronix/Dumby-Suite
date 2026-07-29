import { EventEmitter } from 'node:events';
import { test, expect, vi } from 'vitest';
import { Events, type Client } from 'discord.js';
import { LiveGatewayAdapter } from '../../src/discord/gateway.live-adapter.js';

function makeFakeClient(guildIds: string[] = []) {
  const emitter = new EventEmitter();
  const cache = new Map(guildIds.map((id) => [id, { id }]));
  const login = vi.fn(async (token: string) => token);
  const fake = Object.assign(emitter, { login, guilds: { cache } });
  return {
    client: fake as unknown as Client,
    emitReady: () => emitter.emit(Events.ClientReady),
    login,
  };
}

test('starts idle, becomes logging-in synchronously, and ready only after the ready event fires', async () => {
  const { client, emitReady } = makeFakeClient();
  const adapter = new LiveGatewayAdapter(client, 'fake-token', 1);
  expect(adapter.getState()).toBe('idle');

  const loginPromise = adapter.login();
  expect(adapter.getState()).toBe('logging-in');

  emitReady();
  await loginPromise;
  expect(adapter.getState()).toBe('ready');
});

test('login() calls client.login(BOT_TOKEN) with the configured token', async () => {
  const { client, emitReady, login } = makeFakeClient();
  const adapter = new LiveGatewayAdapter(client, 'my-secret-token', 1);
  const p = adapter.login();
  emitReady();
  await p;
  expect(login).toHaveBeenCalledWith('my-secret-token');
});

test('login() does not resolve before the ready event fires', async () => {
  const { client, emitReady } = makeFakeClient();
  const adapter = new LiveGatewayAdapter(client, 'token', 1);
  let resolved = false;
  const p = adapter.login().then(() => {
    resolved = true;
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(resolved).toBe(false);
  emitReady();
  await p;
  expect(resolved).toBe(true);
});

test('getShardAssignment reflects the real client guild cache post-login', async () => {
  const { client, emitReady } = makeFakeClient(['1', '2', '3']);
  const adapter = new LiveGatewayAdapter(client, 'token', 1);
  const p = adapter.login();
  emitReady();
  await p;
  expect(adapter.getShardAssignment(0)).toEqual({ shardId: 0, shardCount: 1, guildIds: ['1', '2', '3'] });
});

test('getShardAssignment rejects an out-of-range shardId', () => {
  const { client } = makeFakeClient();
  const adapter = new LiveGatewayAdapter(client, 'token', 2);
  expect(() => adapter.getShardAssignment(2)).toThrow(RangeError);
  expect(() => adapter.getShardAssignment(-1)).toThrow(RangeError);
});

test('constructor rejects shardCount < 1', () => {
  const { client } = makeFakeClient();
  expect(() => new LiveGatewayAdapter(client, 'token', 0)).toThrow(RangeError);
});
