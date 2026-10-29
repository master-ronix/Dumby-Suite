/**
 * UR-20261011-008 — the /health page's Mode D content blocks. A clean, at-a-glance health board:
 * a status headline (with the Refresh control in-line, as the Section's accessory) over one compact
 * line per subsystem. Every data point the page gathers stays visible; the overall state leads, and
 * a degraded subsystem is marked in place.
 */

/**
 * The registered status MARK for a subsystem's state.
 *
 * These were raw circles (🟢🟡🔴) — placeholders, and the only place in the framework still using
 * them. The set has emojified marks for exactly these three states, so /health now matches every other
 * surface. The unicode glyph is the fallback for an application whose upload has not landed yet, never
 * the primary.
 */
const STATUS_MARK: Readonly<Record<string, string>> = {
  ok: 'dumby_status_online',
  operational: 'dumby_status_online',
  warn: 'dumby_status_degraded',
  degraded: 'dumby_status_degraded',
  down: 'dumby_status_offline',
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
  'Gateway Ping': 'dumby_metric_ping',
  'Gateway Status': 'dumby_metric_status',
  'Shard Count': 'dumby_metric_shard',
  Uptime: 'dumby_metric_uptime',
  'Host Uptime': 'dumby_metric_uptime',
  'Node.js Version': 'dumby_metric_node',
  'Memory Usage': 'dumby_metric_memory',
  'Heap Used': 'dumby_metric_heap_used',
  'Heap Total': 'dumby_metric_heap_total',
  'Total Guilds': 'dumby_metric_guild',
  'Total Users': 'dumby_metric_users',
  'Total Loaded': 'dumby_metric_loaded',
  Source: 'dumby_metric_source',
  'PostgreSQL Status': 'dumby_metric_database',
  'Redis Status': 'dumby_metric_cache',
  'Core-tier': 'dumby_tier_core',
  'Admin-tier': 'dumby_tier_admin',
  'Standard-tier': 'dumby_tier_standard',
  'Marketplace-tier': 'dumby_tier_marketplace',
};

/** The mark for one row. Empty when the label has none — a row without a mark is not an error. */
function metricMark(
  label: string,
  group: string,
  emoji: (name: string) => string | undefined,
): string {
  // The Profile Runtime group's uptime is the PROFILE's; the Host Process group's is the host's. The
  // label is the same word, so the GROUP is what tells them apart.
  const name =
    group === 'Profile Runtime' && label === 'Uptime' ? 'dumby_metric_profile' : METRIC_MARK[label];
  if (name === undefined) return '';
  const ref = emoji(name);
  return ref !== undefined ? `${ref} ` : '';
}

function dot(status: unknown, emoji: (name: string) => string | undefined): string {
  if (typeof status !== 'string') return '⚪';
  const name = STATUS_MARK[status];
  if (name === undefined) return '⚪';
  return emoji(name) ?? STATUS_GLYPH[status] ?? '⚪';
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
  emoji: (name: string) => string | undefined,
  emojiParts: (name: string) => { readonly id: string; readonly name: string } | undefined,
): readonly Record<string, unknown>[] {
  const status = typeof data?.['status'] === 'string' ? (data['status'] as string) : 'operational';
  const statusLabel =
    typeof data?.['statusLabel'] === 'string' ? (data['statusLabel'] as string) : 'Operational';
  const summary = typeof data?.['summary'] === 'string' ? (data['summary'] as string) : '';
  const groups = asGroups(data?.['groups']);

  const blocks: Record<string, unknown>[] = [];
  // The status headline, with the Refresh control in-line — a Section renders its single accessory
  // on the right of the text line.
  const headline = `${dot(status, emoji)} **${statusLabel}**`;
  // The headline IS the outcome. The summary is the same fact in the same words — the page-data
  // sets it from the status label so M and C have an outcome line — so rendering it here as well
  // printed "Operational" twice. A page that says everything twice reads as a mess.
  blocks.push({
    kind: 'section',
    content: summary === '' || summary === statusLabel ? headline : `${headline}\n-# ${summary}`,
    accessory: {
      customId: `dumby:act:${invokerId}:refresh:health`,
      label: 'Refresh',
      // The Refresh mark is the framework's own control, so its emoji is resolved the same way.
      emoji: emojiParts('dumby_refresh') ?? { name: '🔄' },
      style: 2,
    },
  });
  // One compact line per subsystem: a status dot, the bold name, and its metrics as subtext.
  for (const group of groups) {
    // One field per LINE. A ` · ` run of five metrics wraps mid-value and reads as a paragraph; a
    // column of them reads as a board.
    const metrics = group.rows
      .map(([label, value]) => `${metricMark(label, group.name, emoji)}${label}: ${value}`)
      .join('\n');
    blocks.push({
      kind: 'text',
      content: `${dot(group.status, emoji)} **${group.name}**${metrics === '' ? '' : `\n-# ${metrics}`}`,
    });
  }
  return blocks;
}
