/**
 * LiveGatewayAdapter (Cluster: Kits / Kelp). Implements the same
 * GatewayAdapter interface as MockGatewayAdapter, but wraps a real
 * discord.js Client — used when DISCORD_ADAPTER=live.
 *
 * login() satisfies both halves of the spec's Stage 15/16 pairing in one
 * call: "Call client.login(BOT_TOKEN)" (Stage 15, DISCORD_LOGIN) and
 * "Wait for discord.js's ready event" (Stage 16, CLIENT_READY) — see
 * master-prompt.md rows 15-16 / directive.md §... bootstrap stage table.
 * Bootstrap awaits login() once, then advances both stage markers.
 */
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

  /** Calls client.login(BOT_TOKEN) and resolves only once the `ready` event fires. */
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

  /** Real shard assignment: guilds this process's client actually holds post-login. */
  getShardAssignment(shardId: number): ShardAssignment {
    if (shardId < 0 || shardId >= this.shardCount) {
      throw new RangeError(`shardId ${shardId} out of range for shardCount ${this.shardCount}`);
    }
    const guildIds = [...this.client.guilds.cache.keys()];
    return { shardId, shardCount: this.shardCount, guildIds };
  }
}
