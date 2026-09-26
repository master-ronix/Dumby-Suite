import { Events, type Client } from 'discord.js';
import type { GatewayAdapter, GatewayState, ShardAssignment } from './gateway.mock-adapter.js';

export class LiveGatewayAdapter implements GatewayAdapter {
  private state: GatewayState = 'idle';

  constructor(
    private readonly client: Client,
    private readonly token: string,
    private readonly shardCount: number = 1,
  ) {
    if (shardCount < 1) throw new RangeError('shardCount must be >= 1');
  }

  async login(): Promise<void> {
    this.state = 'logging-in';
    const ready = new Promise<void>((resolve) => {
      this.client.once(Events.ClientReady, () => resolve());
    });
    await this.client.login(this.token);
    await ready;
    this.state = 'ready';
  }

  getState(): GatewayState {
    return this.state;
  }

  getShardAssignment(shardId: number): ShardAssignment {
    if (shardId < 0 || shardId >= this.shardCount) {
      throw new RangeError(`shardId ${shardId} out of range for shardCount ${this.shardCount}`);
    }
    const guildIds = [...this.client.guilds.cache.keys()];
    return { shardId, shardCount: this.shardCount, guildIds };
  }
}
