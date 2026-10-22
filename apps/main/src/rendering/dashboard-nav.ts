import { HOME_SELECT_VALUE, INSTALL_DROPDOWN_CAP } from '../shared/constants/index.js';
import type { NavigationOption, RenderBlock } from './core-renderer.js';

/**
 * §1.2 / item 6 — the dashboard's navigation, below the footer, as a DIAL.
 *
 * The dashboard's pages are the modules themselves: page 0 is the main view, and page 1..n is one
 * STANDARD module's command list each, in installation order. A guild can install far more modules
 * than a select may carry (25 options, one of which is the pinned Home), so the dropdown cannot list
 * them all — and listing an arbitrary first N would hide the page the operator is actually on.
 *
 * So the dropdown shows a WINDOW around the current page: the module you are on sits in the CENTRE,
 * with `DIAL_RADIUS` neighbours above and below, in installation order. The window WRAPS, so the
 * first and the last module are centred too — the arrangement behaves like a dial rather than a list
 * with dead ends. Home is pinned above the window and always occupies the first slot.
 */

/** How many neighbours sit on each side of the current module. 5 → an 11-option window. */
export const DIAL_RADIUS = 5;

export interface DialEntry {
  /** The module's id — stable across boots, unlike the page index. */
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** The dashboard page this module's command list lives on (1..n). */
  readonly page: number;
  /** The module's logo, already resolved to emoji parts. Absent → the caller's fallback applies. */
  readonly icon?: { readonly name: string; readonly id?: string } | undefined;
  /** The module's manifested accent (`ui.accent`), when it declares one. */
  readonly accent?: string | undefined;
}

export interface DialOption extends DialEntry {
  /** Where this option sits relative to the current module: negative above, 0 at the centre. */
  readonly offset: number;
}

/**
 * The dial window: `radius` neighbours either side of `current`, wrapping at both ends.
 *
 * When the list is no longer than the window it is returned whole, in order — wrapping would only
 * reorder a set that already fits. `offset` is signed distance from the centre, which is what makes
 * "the current module is in the middle" checkable rather than a matter of luck.
 */
export function dialWindow(
  entries: readonly DialEntry[],
  current: number,
  radius: number = DIAL_RADIUS,
): readonly DialOption[] {
  const n = entries.length;
  if (n === 0) return [];
  if (n <= radius * 2 + 1) {
    return entries.map((entry, index) => ({ ...entry, offset: index - current }));
  }
  const out: DialOption[] = [];
  for (let distance = -radius; distance <= radius; distance += 1) {
    const index = (((current + distance) % n) + n) % n;
    const entry = entries[index];
    if (entry !== undefined) out.push({ ...entry, offset: distance });
  }
  return out;
}

export interface DialNavInput {
  readonly invokerId: string;
  /**
   * The command this dial navigates — `dashboard` or `modules`. It is the customId's target, so the
   * handler knows which surface to re-dispatch without a second lookup.
   */
  readonly command: 'dashboard' | 'modules';
  /** Home's own label and description — Home returns to THIS surface's main view, not another's. */
  readonly homeLabel?: string | undefined;
  readonly homeDescription?: string | undefined;
  /**
   * Home's own position. It is ALWAYS pinned first — it is the navigation's first page, and the page
   * options follow it. There is deliberately no switch to hide it.
   */
  /** Every module page, in installation order. */
  readonly entries: readonly DialEntry[];
  /** The page currently being shown: 0 for the main view, else a module's page. */
  readonly currentPage: number;
  /** The Home control's emoji, resolved by the caller for the acting application. */
  readonly homeIcon?: NavigationOption['emoji'] | undefined;
  /** Applied to a module that declares no logo of its own. */
  readonly fallbackIcon?: NavigationOption['emoji'] | undefined;
  readonly placeholder?: string | undefined;
}

/** The Home option: pinned above the window, and always the first slot. */
function homeOption(input: DialNavInput): NavigationOption {
  return {
    label: input.homeLabel ?? 'Home',
    value: HOME_SELECT_VALUE,
    description: input.homeDescription ?? 'The dashboard main view — every core command.',
    ...(input.homeIcon !== undefined ? { emoji: input.homeIcon } : {}),
  };
}

/**
 * The dial select — Home, then the dial window of module pages. One builder serves the dashboard and
 * /modules: both page a set of modules, and both need the same centred, wrapping window.
 *
 * Each module option carries its own logo when it declares one, and the caller's fallback icon
 * otherwise, so the dropdown reads as a list of modules rather than of names. The module whose page
 * is open is marked `default`, which is what Discord renders as the selected option.
 */
export function dialNavSelect(input: DialNavInput): RenderBlock {
  const current = input.currentPage >= 1 ? input.currentPage : 0;
  const centre = input.entries.findIndex((entry) => entry.page === current);
  const window = dialWindow(input.entries, centre < 0 ? 0 : centre);

  // Every field is coerced and clamped here, not at the call site: the entries come from page data,
  // and a malformed one must degrade to a plain option rather than throw out of the render.
  //
  // The VALUE is `<page>:<id>`, not the page alone. A select rejects a repeated option value with
  // COMPONENT_OPTION_VALUE_DUPLICATED, and on /modules several modules share one listing page — so
  // the page is not unique per option. The page still leads, because the handler only needs the page.
  //
  // Exactly ONE option is marked `default`: the centred one. Discord allows a single default, and on
  // /modules several entries can share the current page, so `entry.page === current` would mark them
  // all.
  const moduleOptions: NavigationOption[] = window.map((entry) => ({
    label: String(entry.name ?? '').slice(0, 100) || String(entry.id ?? ''),
    value: `${String(entry.page)}:${String(entry.id ?? '')}`.slice(0, 100),
    description: String(entry.description ?? '').slice(0, 100),
    ...(entry.icon !== undefined
      ? { emoji: entry.icon }
      : input.fallbackIcon !== undefined
        ? { emoji: input.fallbackIcon }
        : {}),
    ...(entry.offset === 0 ? { default: true } : {}),
  }));

  const options = [homeOption(input), ...moduleOptions];
  return {
    kind: 'select',
    customId: `dumby:act:${input.invokerId}:nav:${input.command}`,
    placeholder:
      input.placeholder ??
      (input.entries.length === 0 ? 'Nothing to navigate yet' : 'Go to a page…'),
    options: options.slice(0, INSTALL_DROPDOWN_CAP),
  };
}
