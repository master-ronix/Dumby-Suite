/**
 * UR-20261012-026 — the /persona page's Mode D content blocks.
 *
 * A formal control-plane board for one persona at a time. The page opens on the profile of the
 * persona that is actually running the command in this guild (not a hardcoded main bot), states
 * that profile's identity on a single field line, and lists the commands the profile owns — grouped
 * by tier and led by each module's own logo. A profile switcher sits under the headline so a member
 * can move between every persona active in the guild without leaving the page.
 *
 * Every indicator is a custom application emoji (UR-20261012-026); a unicode fallback applies until
 * the emoji upload lands, so the board never renders without an indicator.
 */

const TIER_LABEL: Readonly<Record<string, string>> = {
  core: 'Core',
  standard: 'Standard',
  marketplace: 'Marketplace',
};

interface ProfileShape {
  readonly id: string;
  readonly name: string;
  readonly isMain: boolean;
  readonly applicationId: string;
  readonly shards: string;
  readonly dmBehavior: string;
  readonly statusKind: string;
  readonly statusLabel: string;
  readonly present: boolean;
  readonly hasOAuth: boolean;
  readonly inviteUrl: string;
  readonly moduleCount: number;
  readonly commandCount: number;
}

interface TierShape {
  readonly tier: string;
  readonly modules: ReadonlyArray<{
    readonly name: string;
    readonly icon: string;
    readonly commands: readonly string[];
  }>;
}

/** The status indicator for a profile: the custom emoji when uploaded, else its unicode fallback. */
function statusIcon(kind: string, emoji: (n: string) => string | undefined): string {
  const online = kind === 'online' || kind === 'active';
  return online
    ? (emoji('dumby_status_online') ?? '\u{1F7E2}')
    : (emoji('dumby_status_offline') ?? '\u26AB');
}

const identityIcon = (emoji: (n: string) => string | undefined): string =>
  emoji('dumby_identity') ?? '\u{1FAAA}';
const infoIcon = (emoji: (n: string) => string | undefined): string =>
  emoji('dumby_info') ?? '\u2139\uFE0F';

function asProfiles(value: unknown): readonly ProfileShape[] {
  if (!Array.isArray(value)) return [];
  const out: ProfileShape[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const p = entry as Record<string, unknown>;
    if (typeof p['id'] !== 'string' || typeof p['name'] !== 'string') continue;
    out.push({
      id: p['id'],
      name: p['name'],
      isMain: p['isMain'] === true,
      applicationId: typeof p['applicationId'] === 'string' ? p['applicationId'] : '',
      shards: typeof p['shards'] === 'string' ? p['shards'] : '',
      dmBehavior: typeof p['dmBehavior'] === 'string' ? p['dmBehavior'] : '',
      statusKind: typeof p['statusKind'] === 'string' ? p['statusKind'] : 'offline',
      statusLabel: typeof p['statusLabel'] === 'string' ? p['statusLabel'] : 'Offline',
      present: p['present'] === true,
      hasOAuth: p['hasOAuth'] === true,
      inviteUrl: typeof p['inviteUrl'] === 'string' ? p['inviteUrl'] : '',
      moduleCount: typeof p['moduleCount'] === 'number' ? p['moduleCount'] : 0,
      commandCount: typeof p['commandCount'] === 'number' ? p['commandCount'] : 0,
    });
  }
  return out;
}

function asTiers(value: unknown): readonly TierShape[] {
  if (!Array.isArray(value)) return [];
  const out: TierShape[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const candidate = entry as { tier?: unknown; modules?: unknown };
    if (typeof candidate.tier !== 'string' || !Array.isArray(candidate.modules)) continue;
    const modules: Array<{ name: string; icon: string; commands: string[] }> = [];
    for (const mod of candidate.modules) {
      if (typeof mod !== 'object' || mod === null) continue;
      const m = mod as { name?: unknown; icon?: unknown; commands?: unknown };
      if (typeof m.name !== 'string' || !Array.isArray(m.commands)) continue;
      modules.push({
        name: m.name,
        icon: typeof m.icon === 'string' ? m.icon : '',
        commands: m.commands.map((command) => String(command)),
      });
    }
    out.push({ tier: candidate.tier, modules });
  }
  return out;
}

/**
 * Builds the /persona content blocks: the selected profile's headline (with the Refresh accessory),
 * the profile switcher, the identity field line, the tier-grouped command inventory, and the note.
 */
export function personaBlocks(
  data: Readonly<Record<string, unknown>> | undefined,
  invokerId: string,
  isAdmin: boolean,
  emoji: (name: string) => string | undefined,
  emojiParts: (name: string) => { readonly id: string; readonly name: string } | undefined,
): readonly Record<string, unknown>[] {
  // UR-20261012-057 — the emoji scope: the application this page is rendered for. Its ids are the
  // only ones the message may reference.
  const profiles = asProfiles(data?.['profiles']);
  const tiers = asTiers(data?.['tiers']);
  const note = typeof data?.['note'] === 'string' ? (data['note'] as string) : '';
  const currentId = typeof data?.['currentProfileId'] === 'string' ? data['currentProfileId'] : '';
  const selectedId =
    typeof data?.['selectedProfileId'] === 'string' ? data['selectedProfileId'] : currentId;

  const selected = profiles.find((p) => p.id === selectedId) ?? profiles[0];
  const blocks: Record<string, unknown>[] = [];

  // The headline, with the Refresh control in-line (a Section renders its single accessory on the
  // right of the text line). `refresh` re-dispatches the page, re-gathering the live state.
  const headline =
    selected === undefined
      ? `${statusIcon('offline', emoji)} **No profile** · Unavailable`
      : `${statusIcon(selected.statusKind, emoji)} **${selected.name}** · ${selected.statusLabel}`;
  const subtext =
    selected === undefined
      ? ''
      : [
          // UR-20261012-054 — the module count only. The command inventory is gone from this page by
          // request, so a command count would count something the page no longer shows.
          `${selected.moduleCount} claimed module${selected.moduleCount === 1 ? '' : 's'}`,
          // UR-20261012-031 — presence is stated plainly, and is NOT the same as the online state.
          selected.isMain ? '' : selected.present ? 'In this guild' : 'Not in this guild yet',
        ]
          .filter((part) => part !== '')
          .join(' · ');
  blocks.push({
    kind: 'section',
    content: subtext === '' ? headline : `${headline}\n-# ${subtext}`,
    accessory: {
      // The selected profile rides along, so Refresh re-gathers the state WITHOUT dropping the
      // member back to the running persona.
      customId: `dumby:act:${invokerId}:refresh:persona:${selected?.id ?? ''}`,
      label: 'Refresh',
      emoji: emojiParts('dumby_refresh') ?? { name: '\u{1F504}' },
      style: 2,
    },
  });

  // The profile switcher — present whenever the guild has at least one profile, and disabled while
  // there is nothing to switch to, so the control teaches its own affordance without dead-ending.
  if (profiles.length > 0) {
    const profileIcon = emojiParts('dumby_profile');
    const options: NavigationOption[] = profiles.map((p) => ({
      label: p.name.length > 0 ? p.name : p.id,
      value: p.id,
      description:
        p.id === currentId
          ? `Running this command · ${p.moduleCount} claimed`
          : `${p.moduleCount} claimed`,
      ...(profileIcon !== undefined ? { emoji: profileIcon } : { emoji: '\u{1F464}' }),
      ...(p.id === selectedId ? { default: true } : {}),
    }));
    blocks.push({
      kind: 'select',
      // UR-20261012-054 — BELOW the footer, as asked. A selector acts on the whole page, and the
      // footer closes the content above it.
      placement: 'trailing',
      customId: `dumby:act:${invokerId}:profile:persona`,
      placeholder:
        profiles.length < 2
          ? 'Only one profile is active in this guild'
          : 'Switch to another persona\u2026',
      options,
      ...(profiles.length < 2 ? { disabled: true } : {}),
    });
  }

  // The identity line: one compact field line, and deliberately no "bound server" entry — the page
  // only ever lists personas bound to this guild, so restating the guild is noise.
  if (selected !== undefined) {
    const fields: string[] = [];
    if (selected.applicationId !== '') fields.push(`Application ID \`${selected.applicationId}\``);
    if (selected.shards !== '') fields.push(`Shards \`${selected.shards}\``);
    if (selected.dmBehavior !== '') fields.push(`DM \`${selected.dmBehavior}\``);
    if (fields.length > 0) {
      blocks.push({
        kind: 'text',
        content: `${identityIcon(emoji)} **Identity**\n-# ${fields.join(' · ')}`,
      });
    }
  }

  // UR-20261012-054 — CLAIMED modules only, one line each: its logo and its name. No command
  // inventory: a profile's commands are the framework's, not a property of the profile, and listing
  // every command of every module buried the one thing this section is for — what this profile holds.
  if (tiers.length === 0) {
    blocks.push({
      kind: 'text',
      content:
        selected !== undefined && selected.isMain
          ? '-# No claimed modules — every module this guild has is bound to a persona.'
          : '-# No claimed modules — bind one to this persona and restart.',
    });
  }
  for (const group of tiers) {
    const lines = group.modules
      .map((mod) => `${mod.icon === '' ? '' : `${mod.icon} `}**${mod.name}**`)
      .join('\n');
    const count = group.modules.length;
    blocks.push({
      kind: 'text',
      content: `**${TIER_LABEL[group.tier] ?? group.tier}** · ${count} claimed\n${lines}`,
    });
  }

  if (note !== '') blocks.push({ kind: 'text', content: `${infoIcon(emoji)} ${note}` });

  // UR-20261012-054 — the Info control, and ONLY on a registered persona.
  //
  //   * Never on the main bot's profile: the main bot is not a persona, has no OAuth redirect to
  //     register, and nothing to invite. Showing a setup control there was meaningless.
  //   * Admin-only, and it OPENS A CARD carrying the OAuth redirect callback guide and nothing else.
  //     The install guide and the invite link were rejected, so neither is rendered.
  if (isAdmin && selected !== undefined && selected.isMain !== true) {
    const controls: Array<{
      customId?: string;
      url?: string;
      label: string;
      style?: 1 | 2 | 3 | 4 | 5;
      emoji?: { name: string; id?: string };
    }> = [];
    controls.push({
      customId: `dumby:persona-setup:${invokerId}:${selected.applicationId}`,
      label: '',
      style: 2,
      emoji: emojiParts('dumby_info') ?? { name: '\u2139\uFE0F' },
    });
    blocks.push({ kind: 'row', buttons: controls });
  }

  return blocks;
}
