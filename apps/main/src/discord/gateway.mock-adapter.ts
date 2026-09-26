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
    await Promise.resolve();
    this.state = 'ready';
  }

  getState(): GatewayState {
    return this.state;
  }

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

export function shardIdForGuild(guildId: string, shardCount: number): number {
  const snowflake = BigInt(guildId);
  const shifted = snowflake >> 22n;
  return Number(shifted % BigInt(shardCount));
}
