/**
 * UR-20261011-008 — the /health page's Mode D content blocks. A clean, at-a-glance health board:
 * a status headline (with the Refresh control in-line, as the Section's accessory) over one compact
 * line per subsystem. Every data point the page gathers stays visible; the overall state leads, and
 * a degraded subsystem is marked in place.
 */
import type { RenderBlock } from './core-renderer.js';
import { customEmojiParts, DEFAULT_EMOJI_SCOPE } from './module-icons.js';

const STATUS_DOT: Readonly<Record<string, string>> = {
  ok: '🟢',
  operational: '🟢',
  warn: '🟡',
  degraded: '🟡',
  down: '🔴',
};

function dot(status: unknown): string {
  return typeof status === 'string' ? (STATUS_DOT[status] ?? '⚪') : '⚪';
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
  const headline = `${dot(status)} **${statusLabel}**`;
  blocks.push({
    kind: 'section',
    content: summary === '' ? headline : `${headline}\n-# ${summary}`,
    accessory: {
      customId: `dumby:act:${invokerId}:refresh:health`,
      label: 'Refresh',
      emoji: customEmojiParts('dumby_refresh', emojiScope) ?? { name: '🔄' },
      style: 2,
    },
  });
  // One compact line per subsystem: a status dot, the bold name, and its metrics as subtext.
  for (const group of groups) {
    const metrics = group.rows.map(([label, value]) => `${label}: ${value}`).join(' · ');
    blocks.push({
      kind: 'text',
      content: `${dot(group.status)} **${group.name}**${metrics === '' ? '' : `\n-# ${metrics}`}`,
    });
  }
  return blocks;
}
