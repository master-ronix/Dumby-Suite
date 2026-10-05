/**
 * §28.5 — the Metric Track Protocol. MTP produces **artificial tokens**: a synthetic, guild-facing
 * resource unit computed from real observability signals, re-expressed as simulated compute,
 * memory, disk, bandwidth, database and external-API consumption. It gates nothing — no command is
 * refused or throttled because a guild's count is high — it exists to give a guild a legible,
 * resource-shaped picture of its own footprint.
 *
 * The two `MTP_*_TOKEN_THRESHOLD_BYTES` keys are the per-resource thresholds above which the memory
 * and bandwidth categories begin charging; the rates below are §28.5's table.
 */
export const MTP_MEMORY_TOKEN_UNIT_BYTES = 4096;
export const MTP_BANDWIDTH_TOKEN_UNIT_BYTES = 262_144;
export const MTP_BANDWIDTH_TOKENS_PER_UNIT = 2;
export const MTP_DISK_TOKENS_PER_WRITE = 5;
export const MTP_EXTERNAL_API_TOKENS_PER_CALL = 10;

export type MtpResource = 'compute' | 'memory' | 'disk' | 'bandwidth' | 'database' | 'external_api';

export interface MtpThresholds {
  memoryThresholdBytes: number;
  bandwidthThresholdBytes: number;
}

export class MtpTokenCalculator {
  constructor(private readonly thresholds: MtpThresholds) {}

  /** Compute — every slash command execution reaching a handler: 1 base token + 1 per invocation. */
  computeTokens(invocations: number): number {
    return invocations > 0 ? 1 + invocations : 0;
  }

  /** Memory — 1 token per 4 KB of a serialized response payload over the memory threshold. */
  memoryTokens(serializedBytes: number): number {
    return this.unitsOverThreshold(
      serializedBytes,
      this.thresholds.memoryThresholdBytes,
      MTP_MEMORY_TOKEN_UNIT_BYTES,
    );
  }

  /** Disk — 5 tokens per file or attachment write. */
  diskTokens(writes: number): number {
    return writes * MTP_DISK_TOKENS_PER_WRITE;
  }

  /** Bandwidth — 2 tokens per 256 KB of an outbound embed/attachment over the bandwidth threshold. */
  bandwidthTokens(bytes: number): number {
    return (
      MTP_BANDWIDTH_TOKENS_PER_UNIT *
      this.unitsOverThreshold(
        bytes,
        this.thresholds.bandwidthThresholdBytes,
        MTP_BANDWIDTH_TOKEN_UNIT_BYTES,
      )
    );
  }

  /** Database — 1 token per query exceeding `SLOW_QUERY_THRESHOLD_MS`. */
  databaseTokens(slowQueries: number): number {
    return slowQueries;
  }

  /** External API — 10 tokens per outbound `HttpClient` call to an external integration. */
  externalApiTokens(calls: number): number {
    return calls * MTP_EXTERNAL_API_TOKENS_PER_CALL;
  }

  private unitsOverThreshold(value: number, threshold: number, unitBytes: number): number {
    if (value <= threshold) return 0;
    return Math.ceil((value - threshold) / unitBytes);
  }
}
