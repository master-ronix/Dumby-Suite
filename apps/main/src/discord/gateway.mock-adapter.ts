/**
 * MockGatewayAdapter (Cluster: Kits / Kelp). The ONLY gateway adapter V1
 * ships wired up by default (DISCORD_ADAPTER=mock). It never opens a
 * websocket, never calls the real Discord API, and never requires
 * BOT_TOKEN to be set — bootstrap Stage 15 (DISCORD_LOGIN) and Stage 16
 * (CLIENT_READY) both run entirely against this in-process simulation.
 *
 * A `LiveGatewayAdapter` implementing the same interface is the natural
 * extension point for a future release; V1 intentionally does not ship
 * one (spec: "no live external dependency requirements").
 */

export interface MockGuildSeed {
  id: string;
  name: string;
  ownerId: string;
}

export interface ShardAssignment {
  shardId: number;
  shardCount: number;
  guildIds: readonly string[];
}

export type GatewayState = 'idle' | 'logging-in' | 'ready';

export interface GatewayAdapter {
  login(): Promise<void>;
  getState(): GatewayState;
  getShardAssignment(shardId: number): ShardAssignment;
}

export class MockGatewayAdapter implements GatewayAdapter {
  private state: GatewayState = 'idle';

  constructor(
    private readonly guilds: readonly MockGuildSeed[],
    private readonly shardCount: number = 1,
  ) {
    if (shardCount < 1) throw new RangeError('shardCount must be >= 1');
  }

  async login(): Promise<void> {
    this.state = 'logging-in';
    // No real handshake: the mock adapter is "ready" on the next tick,
    // matching the shape of a real async login without any network I/O.
    await Promise.resolve();
    this.state = 'ready';
  }

  getState(): GatewayState {
    return this.state;
  }

  /** Deterministic guild-to-shard assignment: guildId hashed mod shardCount (Discord's own formula for real shards). */
  getShardAssignment(shardId: number): ShardAssignment {
    if (shardId < 0 || shardId >= this.shardCount) {
      throw new RangeError(`shardId ${shardId} out of range for shardCount ${this.shardCount}`);
    }
    const guildIds = this.guilds
      .filter((g) => shardIdForGuild(g.id, this.shardCount) === shardId)
      .map((g) => g.id);
    return { shardId, shardCount: this.shardCount, guildIds };
  }

  listGuilds(): readonly MockGuildSeed[] {
    return this.guilds;
  }
}

/** Same formula Discord uses for real sharding: (snowflake >> 22) % shardCount. Guild ids here are decimal strings. */
export function shardIdForGuild(guildId: string, shardCount: number): number {
  const snowflake = BigInt(guildId);
  const shifted = snowflake >> 22n;
  return Number(shifted % BigInt(shardCount));
}
