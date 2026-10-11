import {
  actionRow,
  buildComponentsV2,
  button,
  container,
  createBannerMediaGallery,
  createTitleBlock,
  DEFAULT_ACCENT_COLOR,
  section,
  separator,
  stringSelect,
  textDisplay,
  type Component,
  type ComponentsV2Message,
} from '../shared/utils/components-v2.js';
import { pageSections } from './page-layouts.js';

export const FOLLOWUP_ALARM_MS = 13 * 60 * 1000;

export type RenderMode = 'D' | 'M' | 'C';

export type NoticeReasonCode =
  | 'UNKNOWN_COMMAND'
  | 'MAINTENANCE'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'RESTRICTED'
  | 'COOLDOWN'
  | 'RATE_LIMITED'
  | 'GUILD_UNAVAILABLE'
  | 'MODULE_ERROR'
  | 'OVERDUE';

export interface RenderIdentity {
  surface: string;
  developer?: string;
  version?: string;
  /** ADR-013 — the owning module; the module-page footer is `<name> [<id>]`. */
  moduleId?: string;
  /** ADR-013 — the module's declared display name (defaults to the title-cased id). */
  displayName?: string;
  /** ADR-012 — the module's declared accent (defaults to amber). */
  accent?: string;
  /** ADR-012 — the module's declared banner URL. */
  banner?: string;
  /** item 9 — the module build id shown in the footer. */
  buildId?: string;
  /** item 9 — the module developer username shown in the footer. */
  devUsername?: string;
}

export interface NavigationOption {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
  readonly emoji?: string | { name: string; id?: string };
  readonly default?: boolean;
}

/** §11.3 — the navigation dropdown: one minted customId plus the page options. */
export interface NavigationControl {
  readonly customId: string;
  readonly options: readonly NavigationOption[];
}

/** §1.2/§3.3 — the footer's D/M/C density control, one minted customId per mode. */
export interface ModeControl {
  readonly customIds: Readonly<Record<RenderMode, string>>;
}

/** item 11/15/17 — a page-declared action button (info, uninstall, paging, search). */
export interface PageActionButton {
  readonly customId: string;
  readonly label: string;
  readonly style?: 1 | 2 | 3 | 4;
  /** A no-op control (e.g. Previous on page 0) is disabled rather than given a colliding id. */
  readonly disabled?: boolean;
  /** item 2 — an optional custom-emoji icon (the Home control's bold house). */
  readonly emoji?: { name: string; id?: string };
}

/** item 17 — one action row; Discord shows up to five buttons per row. */
export type PageActionRow = readonly PageActionButton[];

/**
 * item 8 — a richer content block. A `section` renders its text with the accessory button IN-LINE
 * after it; a `select` renders a String Select row (the install dropdown); a `text` is plain text.
 */
export type RenderBlock =
  | { readonly kind: 'text'; readonly content: string }
  | { readonly kind: 'section'; readonly content: string; readonly accessory: PageActionButton }
  | { readonly kind: 'row'; readonly buttons: readonly PageActionButton[] }
  | {
      readonly kind: 'select';
      readonly customId: string;
      readonly placeholder: string;
      readonly options: readonly NavigationOption[];
      readonly disabled?: boolean;
    };

export interface RenderDescriptor extends RenderIdentity {
  mode?: RenderMode;
  sections?: readonly string[];
  summary?: string;
  /**
   * §1.3 - an explicit banner URL for the Mode D banner slot. When absent the Renderer is meant to
   * generate the default banner (§11.5); that generation needs an image endpoint, so until one
   * exists the slot is omitted rather than pointed at a URL that would 404.
   */
  banner?: string;
  /** §11.3 — present in Modes D and M; omitted in Mode C. */
  navigation?: NavigationControl;
  /** §1.2 — the footer density control. */
  modeControl?: ModeControl;
  /** item 11/15/17 — page-declared action buttons rendered below the footer. */
  actions?: readonly PageActionRow[];
  /** item 8 — richer content blocks (inline sections, selects) that replace the plain sections. */
  blocks?: readonly RenderBlock[];
}

/**
 * §1.7 (UR-11) — the schema-declared authoring model. A module command returns page data; the
 * Renderer derives the entire presentation from it, so module code never builds components.
 */
export interface PageDataResult {
  page: string;
  data: Readonly<Record<string, unknown>>;
}

export interface PageRenderDescriptor extends RenderIdentity {
  page: string;
  data: Readonly<Record<string, unknown>>;
  mode?: RenderMode;
  banner?: string;
}

/**
 * Maps page data to render sections. The per-page layouts live in `page-layouts.ts` (§1.7's
 * page-descriptor layer); this re-exports that entry point so the renderer and the router keep
 * one call site.
 */
export function derivePageSections(
  page: string,
  data: Readonly<Record<string, unknown>>,
): readonly string[] {
  return pageSections(page, data);
}

function isPageDataResult(value: unknown): value is PageDataResult {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { page?: unknown; data?: unknown };
  return (
    typeof candidate.page === 'string' &&
    typeof candidate.data === 'object' &&
    candidate.data !== null
  );
}

export interface FormalNoticeDescriptor extends RenderIdentity {
  reason: NoticeReasonCode;
  traceId: string;
  heading?: string;
  explanation?: string;
}

export interface RendererInteraction {
  replied?: boolean;
  deferred?: boolean;
  reply(options: ComponentsV2Message): Promise<void>;
  editReply(options: ComponentsV2Message): Promise<void>;
}

const DEFAULT_DEVELOPER = 'Quixotic Mnemonics';

/** The default display name for a module id: `hello-world` becomes `Hello World`. */
function titleCaseModuleId(id: string): string {
  return id
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export class InvalidRenderDescriptorError extends Error {
  constructor() {
    super('Command handler returned a value that is not a valid render descriptor');
    this.name = 'InvalidRenderDescriptorError';
  }
}

export class DirectInteractionResponseError extends Error {
  constructor(method: string) {
    super(`Command handlers must return render descriptors; direct ${method} is forbidden`);
    this.name = 'DirectInteractionResponseError';
  }
}

export class CoreRenderer {
  private readonly bannerUrl: string | undefined;
  private readonly bannersByModule: Readonly<Record<string, string>>;

  /**
   * §1.3 / §11.5 - the Mode D banner. `bannersByModule` lets a specific module (the dashboard,
   * item 6) carry its own banner; every other module falls back to `bannerUrl` (the default).
   */
  constructor(options: { bannerUrl?: string; bannersByModule?: Record<string, string> } = {}) {
    this.bannerUrl = options.bannerUrl;
    this.bannersByModule = options.bannersByModule ?? {};
  }

  createTraceId(): string {
    return `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  createReadOnlyInteraction<T extends object>(interaction: T): T {
    return new Proxy(interaction, {
      get(target, prop, receiver) {
        // §2.4 / Appendix C #20 — a handler must not open a response path of its own, so `reply`,
        // `followUp` and `showModal` stay blocked. `editReply` is deliberately allowed: the registry
        // acknowledges a component interaction with `deferUpdate` before the handler runs, and after
        // that `editReply` is the only call that can land a result on the existing message. Blocking
        // it left every component handler with no way to respond at all — the trigger fired, the
        // handler ran, and nothing ever reached the message.
        if (prop === 'reply' || prop === 'followUp' || prop === 'showModal') {
          return async (): Promise<never> => {
            throw new DirectInteractionResponseError(String(prop));
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async sendBuffer(interaction: RendererInteraction, identity: RenderIdentity): Promise<void> {
    const payload = this.renderBuffer(identity);
    if (interaction.replied === true || interaction.deferred === true) {
      await interaction.editReply(payload);
      return;
    }
    await interaction.reply(payload);
  }

  async editFinal(interaction: RendererInteraction, descriptor: RenderDescriptor): Promise<void> {
    await interaction.editReply(this.render(descriptor));
  }

  async editNotice(
    interaction: RendererInteraction,
    descriptor: FormalNoticeDescriptor,
  ): Promise<void> {
    await interaction.editReply(this.renderNotice(descriptor));
  }

  renderBuffer(identity: RenderIdentity): ComponentsV2Message {
    return this.frame([
      createTitleBlock(identity.surface, identity.developer ?? DEFAULT_DEVELOPER),
      separator(),
      textDisplay(`⏳ Preparing ${identity.surface}…`),
    ]);
  }

  renderPage(input: PageRenderDescriptor): ComponentsV2Message {
    return this.render({
      surface: input.surface,
      ...(input.developer !== undefined ? { developer: input.developer } : {}),
      ...(input.version !== undefined ? { version: input.version } : {}),
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
      ...(input.banner !== undefined ? { banner: input.banner } : {}),
      sections: derivePageSections(input.page, input.data),
    });
  }

  render(input: RenderDescriptor): ComponentsV2Message {
    const mode = input.mode ?? 'D';
    const sections = input.sections ?? (input.summary ? [input.summary] : []);
    // item 8 — a page may carry content as blocks (sections/select) instead of plain sections.
    const hasBlocks = input.blocks !== undefined && input.blocks.length > 0;
    if (sections.length === 0 && !hasBlocks) {
      throw new InvalidRenderDescriptorError();
    }

    const developer = input.developer ?? DEFAULT_DEVELOPER;
    const components: Component[] = [];

    // §1.2 / §1.3 / §1.4 - the banner slot opens the frame, and is present in Mode D only.
    // item 6 - a module's own banner wins; then the default. The dashboard carries its own.
    const moduleBanner =
      input.moduleId !== undefined ? this.bannersByModule[input.moduleId] : undefined;
    const bannerUrl = input.banner ?? moduleBanner ?? this.bannerUrl;
    if (mode === 'D' && bannerUrl !== undefined) {
      components.push(createBannerMediaGallery(bannerUrl));
      components.push(separator());
    }

    // items 6/7/8 - the identity band: a bold "Dumby Suite | <page>" title, then the developer.
    // item 2 - the attribution is the developer's registered username, not a static name.
    const attribution = input.devUsername !== undefined ? `@${input.devUsername}` : developer;
    components.push(createTitleBlock(input.surface, attribution));
    components.push(separator());

    // §1.2 / §1.4 - the content slot, rendered at the page's density.
    if (mode === 'C') {
      components.push(textDisplay(this.oneLineRender(input.surface, sections[0] ?? input.surface)));
    } else if (mode === 'M') {
      components.push(textDisplay(this.condensedRender(sections)));
    } else if (hasBlocks) {
      // item 8 — richer blocks: a Section (text with an inline accessory), a text block, or a Select.
      input.blocks?.forEach((block, index) => {
        if (index > 0) components.push(separator());
        if (block.kind === 'text') {
          components.push(textDisplay(block.content));
        } else if (block.kind === 'section') {
          const a = block.accessory;
          components.push(
            section(
              block.content,
              button(a.customId, a.label, a.style ?? 2, a.disabled ?? false, a.emoji),
            ),
          );
        } else if (block.kind === 'row') {
          components.push(
            actionRow(
              block.buttons.map((b) =>
                button(b.customId, b.label, b.style ?? 2, b.disabled ?? false, b.emoji),
              ),
            ),
          );
        } else {
          components.push(
            actionRow([
              stringSelect(
                block.customId,
                block.options.map((o) => ({
                  label: o.label,
                  value: o.value,
                  ...(o.description !== undefined ? { description: o.description } : {}),
                  ...(o.emoji !== undefined ? { emoji: o.emoji } : {}),
                })),
                block.placeholder,
                block.disabled,
              ),
            ]),
          );
        }
      });
    } else {
      sections.forEach((section, index) => {
        if (index > 0) components.push(separator());
        components.push(textDisplay(section));
      });
    }
    // ADR-015 (amends ADR-013) — the module-page footer is `<name> [<id>]` and nothing else; the
    // developer attribution stays in the identity band above and is never repeated in the footer.
    const footer = this.moduleFooter(input.displayName, input.moduleId);
    if (footer !== undefined) {
      components.push(separator());
      components.push(textDisplay(footer));
    }

    // items 3/10/11/15/17 - page-declared action controls render INSIDE the container, at the
    // bottom, below the footer's divider (item 3). An ActionRow is a valid child of a Components v2
    // container, so the navigation controls sit within the frame rather than beside it.
    const actions = input.actions;
    if (actions !== undefined) {
      const rows: Component[] = [];
      for (const row of actions) {
        if (row.length === 0) continue;
        rows.push(
          actionRow(
            row.map((b) => button(b.customId, b.label, b.style ?? 2, b.disabled ?? false, b.emoji)),
          ),
        );
      }
      if (rows.length > 0) {
        components.push(separator());
        components.push(...rows);
      }
    }

    return this.frame(components, input.accent);
  }

  renderNotice(input: FormalNoticeDescriptor): ComponentsV2Message {
    const heading = input.heading ?? this.defaultNoticeHeading(input.reason);
    const explanation = input.explanation ?? this.defaultNoticeExplanation(input.reason);

    return this.frame([
      createTitleBlock(input.surface, input.developer ?? DEFAULT_DEVELOPER),
      separator(),
      textDisplay(
        [
          `⚠ ${heading}`,
          '',
          explanation,
          '',
          `reason: ${input.reason}`,
          `trace: ${input.traceId}`,
        ].join('\n'),
      ),
    ]);
  }

  normalizeHandlerResult(result: unknown, fallback: RenderDescriptor): RenderDescriptor {
    if (result === undefined || result === null) {
      return { ...fallback, summary: 'Done.' };
    }

    if (typeof result === 'string') {
      return { ...fallback, summary: result };
    }

    if (isPageDataResult(result)) {
      return { ...fallback, sections: derivePageSections(result.page, result.data) };
    }

    if (this.isRenderDescriptor(result)) {
      return {
        surface: result.surface,
        ...(result.developer !== undefined ? { developer: result.developer } : {}),
        ...(result.moduleId !== undefined ? { moduleId: result.moduleId } : {}),
        ...(result.mode !== undefined ? { mode: result.mode } : {}),
        ...(result.sections !== undefined ? { sections: result.sections } : {}),
        ...(result.summary !== undefined ? { summary: result.summary } : {}),
        ...(result.banner !== undefined ? { banner: result.banner } : {}),
      };
    }

    throw new InvalidRenderDescriptorError();
  }

  noticeReasonFromError(err: unknown): NoticeReasonCode {
    if (err instanceof InvalidRenderDescriptorError) return 'MODULE_ERROR';
    const name = err instanceof Error ? err.name : '';
    if (name === 'CommandNotFoundError') return 'UNKNOWN_COMMAND';
    if (name === 'CommandScopeDeniedError') return 'FORBIDDEN';
    if (name === 'PersonaOccupiedError') return 'FORBIDDEN';
    // blueprint.md §22.2 / Table 22-A — a Power Engine `suspendGuild` blocks dispatch in that guild,
    // so the user sees the GUILD_UNAVAILABLE formal notice rather than a partial render.
    if (name === 'GuildSuspendedError') return 'GUILD_UNAVAILABLE';
    return 'MODULE_ERROR';
  }

  private frame(
    components: Parameters<typeof container>[0],
    accent: string | undefined = undefined,
    topLevel: Component[] = [],
  ): ComponentsV2Message {
    const color =
      accent !== undefined ? Number.parseInt(accent.replace('#', ''), 16) : DEFAULT_ACCENT_COLOR;
    return buildComponentsV2([container(components, color), ...topLevel]);
  }

  /**
   * ADR-015 (amends ADR-013) — the module-page footer is the module's display name followed by
   * its id in brackets, and nothing else. The developer attribution lives in the identity band.
   */
  private moduleFooter(
    displayName: string | undefined,
    moduleId: string | undefined,
  ): string | undefined {
    if (moduleId === undefined) return undefined;
    const name = displayName ?? titleCaseModuleId(moduleId);
    return `-# ${name} [${moduleId}]`;
  }

  private oneLineRender(surface: string, first: string): string {
    const line = first.split('\n').find((part) => part.trim().length > 0) ?? first;
    return `${surface}: ${line}`;
  }

  private condensedRender(sections: readonly string[]): string {
    const first = sections[0] ?? '';
    const remainder = sections.length - 1;
    return remainder > 0 ? `${first}\n+${remainder} more` : first;
  }

  private isRenderDescriptor(value: unknown): value is RenderDescriptor {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Partial<RenderDescriptor>;
    const hasContent =
      (Array.isArray(candidate.sections) &&
        candidate.sections.every((s) => typeof s === 'string')) ||
      typeof candidate.summary === 'string';
    const validMode =
      candidate.mode === undefined ||
      candidate.mode === 'D' ||
      candidate.mode === 'M' ||
      candidate.mode === 'C';
    return typeof candidate.surface === 'string' && hasContent && validMode;
  }

  private defaultNoticeHeading(reason: NoticeReasonCode): string {
    switch (reason) {
      case 'UNKNOWN_COMMAND':
        return 'Unknown command';
      case 'MAINTENANCE':
        return 'Maintenance mode';
      case 'NOT_FOUND':
        return 'Not found';
      case 'FORBIDDEN':
      case 'RESTRICTED':
        return 'Not permitted';
      case 'COOLDOWN':
      case 'RATE_LIMITED':
        return 'Throttled';
      case 'GUILD_UNAVAILABLE':
        return 'Guild unavailable';
      case 'OVERDUE':
        return 'Interaction overdue';
      case 'MODULE_ERROR':
        return 'Module error';
    }
  }

  private defaultNoticeExplanation(reason: NoticeReasonCode): string {
    switch (reason) {
      case 'UNKNOWN_COMMAND':
        return 'That command is not registered or is not available here.';
      case 'MAINTENANCE':
        return 'Dumby is in maintenance mode. Please try again after the window ends.';
      case 'NOT_FOUND':
        return 'The requested target does not exist or is no longer available.';
      case 'FORBIDDEN':
        return 'Your permissions do not allow this action.';
      case 'RESTRICTED':
        return 'The restricted access floor applies to this action.';
      case 'COOLDOWN':
        return 'This command is cooling down. Please try again later.';
      case 'RATE_LIMITED':
        return 'The rate limit for this action has been exceeded.';
      case 'GUILD_UNAVAILABLE':
        return 'This module is not available in this server.';
      case 'OVERDUE':
        return 'The interaction expired before a final render was available.';
      case 'MODULE_ERROR':
        return 'The module failed while handling the interaction.';
    }
  }
}
