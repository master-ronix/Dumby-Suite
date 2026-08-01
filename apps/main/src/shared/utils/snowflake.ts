const DISCORD_EPOCH = 1_420_070_400_000n;

export function snowflakeToTimestamp(snowflake: string): Date {
  const id = BigInt(snowflake);
  const timestamp = (id >> 22n) + DISCORD_EPOCH;
  return new Date(Number(timestamp));
}

export function snowflakeFromTimestamp(timestamp: number): string {
  const bigTimestamp = BigInt(timestamp) - DISCORD_EPOCH;
  return String(bigTimestamp << 22n);
}

export function isSnowflake(value: string): boolean {
  return /^\d{17,20}$/.test(value);
}

export function shardIdFromSnowflake(guildId: string, totalShards: number): number {
  return Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
}
