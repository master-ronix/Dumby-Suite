/**
 * UR-20261011-008 — the /health page's Mode D content blocks. A clean, at-a-glance health board:
 * a status headline (with the Refresh control in-line, as the Section's accessory) over one compact
 * line per subsystem. Every data point the page gathers stays visible; the overall state leads, and
 * a degraded subsystem is marked in place.
 */
import type { RenderBlock } from './core-renderer.js';
import {
  customEmojiParts,
  customEmojiRef,
  DEFAULT_EMOJI_SCOPE,
  METRIC_CACHE_ICON_NAME,
  METRIC_DATABASE_ICON_NAME,
  METRIC_GUILD_ICON_NAME,
  METRIC_HEAP_TOTAL_ICON_NAME,
  METRIC_HEAP_USED_ICON_NAME,
  METRIC_LOADED_ICON_NAME,
  METRIC_MEMORY_ICON_NAME,
  METRIC_NODE_ICON_NAME,
  METRIC_PING_ICON_NAME,
  METRIC_SOURCE_ICON_NAME,
  METRIC_USERS_ICON_NAME,
  METRIC_PROFILE_ICON_NAME,
  METRIC_SHARD_ICON_NAME,
  METRIC_STATUS_ICON_NAME,
  METRIC_UPTIME_ICON_NAME,
  STATUS_DEGRADED_ICON_NAME,
  STATUS_OFFLINE_ICON_NAME,
  STATUS_ONLINE_ICON_NAME,
  TIER_ADMIN_ICON_NAME,
  TIER_CORE_ICON_NAME,
  TIER_MARKETPLACE_ICON_NAME,
  TIER_STANDARD_ICON_NAME,
} from './module-icons.js';

/**
 * The registered status MARK for a subsystem's state.
 *
 * These were raw circles (🟢🟡🔴) — placeholders, and the only place in the framework still using
 * them. The set has emojified marks for exactly these three states, so /health now matches every other
 * surface. The unicode glyph is the fallback for an application whose upload has not landed yet, never
 * the primary.
 */
const STATUS_MARK: Readonly<Record<string, string>> = {
  ok: STATUS_ONLINE_ICON_NAME,
  operational: STATUS_ONLINE_ICON_NAME,
  warn: STATUS_DEGRADED_ICON_NAME,
  degraded: STATUS_DEGRADED_ICON_NAME,
  down: STATUS_OFFLINE_ICON_NAME,
};

const STATUS_GLYPH: Readonly<Record<string, string>> = {
  ok: '🟢',
  operational: '🟢',
  warn: '🟡',
  degraded: '🟡',
  down: '🔴',
};

/**
 * The METRIC mark for a health row, keyed by its label.
 *
 * A health line is a `Label: value` pair, and a board of them reads as a wall. One mark per column
 * makes the page scannable: find the clock, find the uptime.
 */
const METRIC_MARK: Readonly<Record<string, string>> = {
  // One mark per FIELD, not one per shape: two rows that carry the same mark read as the same row.
  'Gateway Ping': METRIC_PING_ICON_NAME,
  'Gateway Status': METRIC_STATUS_ICON_NAME,
  'Shard Count': METRIC_SHARD_ICON_NAME,
  Uptime: METRIC_UPTIME_ICON_NAME,
  'Host Uptime': METRIC_UPTIME_ICON_NAME,
  'Node.js Version': METRIC_NODE_ICON_NAME,
  'Memory Usage': METRIC_MEMORY_ICON_NAME,
  'Heap Used': METRIC_HEAP_USED_ICON_NAME,
  'Heap Total': METRIC_HEAP_TOTAL_ICON_NAME,
  'Total Guilds': METRIC_GUILD_ICON_NAME,
  'Total Users': METRIC_USERS_ICON_NAME,
  'Total Loaded': METRIC_LOADED_ICON_NAME,
  Source: METRIC_SOURCE_ICON_NAME,
  'PostgreSQL Status': METRIC_DATABASE_ICON_NAME,
  'Redis Status': METRIC_CACHE_ICON_NAME,
  'Core-tier': TIER_CORE_ICON_NAME,
  'Admin-tier': TIER_ADMIN_ICON_NAME,
  'Standard-tier': TIER_STANDARD_ICON_NAME,
  'Marketplace-tier': TIER_MARKETPLACE_ICON_NAME,
};

/** The mark for one row. Empty when the label has none — a row without a mark is not an error. */
function metricMark(label: string, group: string, scope: string): string {
  // The Profile Runtime group's uptime is the PROFILE's; the Host Process group's is the host's. The
  // label is the same word, so the GROUP is what tells them apart.
  const name =
    group === 'Profile Runtime' && label === 'Uptime'
      ? METRIC_PROFILE_ICON_NAME
      : METRIC_MARK[label];
  if (name === undefined) return '';
  const ref = customEmojiRef(name, scope);
  return ref !== undefined ? `${ref} ` : '';
}

function dot(status: unknown, scope: string): string {
  if (typeof status !== 'string') return '⚪';
  const name = STATUS_MARK[status];
  if (name === undefined) return '⚪';
  return customEmojiRef(name, scope) ?? STATUS_GLYPH[status] ?? '⚪';
}

interface GroupShape {
  readonly name: string;
  readonly status?: string;
  readonly rows: ReadonlyArray<readonly [string, string]>;
}

function asGroups(value: unknown): readonly GroupShape[] {
  if (!Array.isArray(value)) return [];
  const out: GroupShape[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const candidate = entry as { name?: unknown; status?: unknown; rows?: unknown };
    if (typeof candidate.name !== 'string' || !Array.isArray(candidate.rows)) continue;
    const rows: Array<readonly [string, string]> = [];
    for (const row of candidate.rows) {
      if (Array.isArray(row) && row.length >= 2) rows.push([String(row[0]), String(row[1])]);
    }
    out.push({
      name: candidate.name,
      rows,
      ...(typeof candidate.status === 'string' ? { status: candidate.status } : {}),
    });
  }
  return out;
}

/**
 * Builds the /health content blocks from the page data: the status headline (with the Refresh
 * accessory) and one compact line per subsystem.
 */
export function healthBlocks(
  data: Readonly<Record<string, unknown>> | undefined,
  invokerId: string,
  options: { readonly applicationId?: string } = {},
): readonly RenderBlock[] {
  // UR-20261012-057 — the emoji scope for the rendering application.
  const emojiScope = options.applicationId ?? DEFAULT_EMOJI_SCOPE;
  const status = typeof data?.['status'] === 'string' ? (data['status'] as string) : 'operational';
  const statusLabel =
    typeof data?.['statusLabel'] === 'string' ? (data['statusLabel'] as string) : 'Operational';
  const summary = typeof data?.['summary'] === 'string' ? (data['summary'] as string) : '';
  const groups = asGroups(data?.['groups']);

  const blocks: RenderBlock[] = [];
  // The status headline, with the Refresh control in-line — a Section renders its single accessory
  // on the right of the text line.
  const headline = `${dot(status, emojiScope)} **${statusLabel}**`;
  // The headline IS the outcome. The summary is the same fact in the same words — the page-data
  // sets it from the status label so M and C have an outcome line — so rendering it here as well
  // printed "Operational" twice. A page that says everything twice reads as a mess.
  blocks.push({
    kind: 'section',
    content: summary === '' || summary === statusLabel ? headline : `${headline}\n-# ${summary}`,
    accessory: {
      customId: `dumby:act:${invokerId}:refresh:health`,
      label: 'Refresh',
      emoji: customEmojiParts('dumby_refresh', emojiScope) ?? { name: '🔄' },
      style: 2,
    },
  });
  // One compact line per subsystem: a status dot, the bold name, and its metrics as subtext.
  for (const group of groups) {
    // One field per LINE. A ` · ` run of five metrics wraps mid-value and reads as a paragraph; a
    // column of them reads as a board.
    const metrics = group.rows
      .map(([label, value]) => `${metricMark(label, group.name, emojiScope)}${label}: ${value}`)
      .join('\n');
    blocks.push({
      kind: 'text',
      content: `${dot(group.status, emojiScope)} **${group.name}**${metrics === '' ? '' : `\n-# ${metrics}`}`,
    });
  }
  return blocks;
}
