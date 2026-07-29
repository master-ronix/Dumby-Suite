import { test, expect } from 'vitest';
import { MockGatewayAdapter, shardIdForGuild } from '../../src/discord/gateway.mock-adapter.js';

test('starts idle and becomes ready after login(), with no network calls', async () => {
  const adapter = new MockGatewayAdapter([], 1);
  expect(adapter.getState()).toBe('idle');
  await adapter.login();
  expect(adapter.getState()).toBe('ready');
});

test('shardIdForGuild is deterministic and matches Discord\'s (snowflake >> 22) % shardCount formula', () => {
  const guildId = '900000000000000001';
  const shardCount = 4;
  const expected = Number((BigInt(guildId) >> 22n) % BigInt(shardCount));
  expect(shardIdForGuild(guildId, shardCount)).toBe(expected);
});

test('getShardAssignment partitions every guild into exactly one shard', () => {
  const guilds = Array.from({ length: 20 }, (_, i) => ({
    id: String(900000000000000000n + BigInt(i * 4194304)), // spread across the snowflake shard-bits
    name: `guild-${i}`,
    ownerId: 'owner-1',
  }));
  const shardCount = 3;
  const adapter = new MockGatewayAdapter(guilds, shardCount);

  const allAssigned = new Set<string>();
  for (let shardId = 0; shardId < shardCount; shardId += 1) {
    const assignment = adapter.getShardAssignment(shardId);
    for (const id of assignment.guildIds) {
      expect(allAssigned.has(id)).toBe(false);
      allAssigned.add(id);
    }
  }
  expect(allAssigned.size).toBe(guilds.length);
});

test('getShardAssignment rejects an out-of-range shardId', () => {
  const adapter = new MockGatewayAdapter([], 2);
  expect(() => adapter.getShardAssignment(2)).toThrow(RangeError);
  expect(() => adapter.getShardAssignment(-1)).toThrow(RangeError);
});

test('constructor rejects shardCount < 1', () => {
  expect(() => new MockGatewayAdapter([], 0)).toThrow(RangeError);
});

test('listGuilds returns the exact seed list provided', () => {
  const guilds = [{ id: '1', name: 'a', ownerId: 'o' }];
  const adapter = new MockGatewayAdapter(guilds, 1);
  expect(adapter.listGuilds()).toStrictEqual(guilds);
});
