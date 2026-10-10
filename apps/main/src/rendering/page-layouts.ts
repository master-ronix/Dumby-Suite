/**
 * §1.7 — the page-descriptor layer. A command handler returns data against one of its declared
 * pages; this module turns that data into the sections the Renderer lays out, so the per-page
 * layouts Divisions 3-10 specify live in one place rather than in each module.
 *
 * A page supplies any of:
 *   title   a heading line, rendered bold
 *   lines   a plain list, one entry per line
 *   groups  `{ name, rows }` blocks rendered as `━━ name ━━` over `label: value` lines
 *
 * They compose into a single content band, which is how the divisions draw them: the health
 * report's eight groups sit in one band, not eight divider-separated ones. A page that supplies
 * none of these falls back to the generic first-value/rest mapping, so nothing regresses.
 */
export interface PageGroup {
  readonly name: string;
  readonly rows: readonly (readonly [string, string])[];
}

export interface PageData {
  readonly title?: string;
  readonly lines?: readonly string[];
  readonly groups?: readonly PageGroup[];
}

function asStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((entry) => String(entry));
}

function asGroups(value: unknown): readonly PageGroup[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const groups: PageGroup[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) return undefined;
    const candidate = entry as { name?: unknown; rows?: unknown };
    if (typeof candidate.name !== 'string' || !Array.isArray(candidate.rows)) return undefined;
    const rows: Array<readonly [string, string]> = [];
    for (const row of candidate.rows) {
      if (!Array.isArray(row) || row.length < 2) return undefined;
      rows.push([String(row[0]), String(row[1])]);
    }
    groups.push({ name: candidate.name, rows });
  }
  return groups;
}

/** Renders the structured shape into the single content band, or null when the page has none. */
function renderStructured(data: Readonly<Record<string, unknown>>): string | null {
  const title = typeof data['title'] === 'string' ? data['title'] : undefined;
  const lines = asStringArray(data['lines']);
  const groups = asGroups(data['groups']);
  if (title === undefined && lines === undefined && groups === undefined) return null;

  const blocks: string[] = [];
  if (title !== undefined) blocks.push(`**${title}**`);
  if (groups !== undefined) {
    for (const group of groups) {
      blocks.push(`━━ ${group.name} ━━`);
      for (const [label, value] of group.rows) blocks.push(`${label}: ${value}`);
      blocks.push('');
    }
    if (blocks[blocks.length - 1] === '') blocks.pop();
  }
  if (lines !== undefined) blocks.push(lines.join('\n'));
  return blocks.join('\n');
}

/** The pre-layout mapping: first value is the content line, the rest a single subtext meta line. */
function genericSections(page: string, data: Readonly<Record<string, unknown>>): readonly string[] {
  const entries = Object.entries(data);
  const [first, ...rest] = entries;
  const primary = first === undefined ? page : String(first[1]);
  if (rest.length === 0) return [primary];
  const meta = rest.map(([key, value]) => `${key}: ${String(value)}`).join(' | ');
  return [primary, `-# ${meta}`];
}

export function pageSections(
  page: string,
  data: Readonly<Record<string, unknown>>,
): readonly string[] {
  const structured = renderStructured(data);
  return structured === null ? genericSections(page, data) : [structured];
}
