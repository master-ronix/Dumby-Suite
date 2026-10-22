import {
  actionRow,
  buildComponentsV2,
  button,
  channelSelect,
  container,
  createBannerMediaGallery,
  createTitleBlock,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PERSONA_ACCENT,
  linkButton,
  mentionableSelect,
  roleSelect,
  section,
  separator,
  stringSelect,
  textDisplay,
  thumbnail,
  userSelect,
  type ButtonComponent,
  type Component,
  type ComponentsV2Message,
  type EntitySelectComponent,
} from '../shared/utils/components-v2.js';
import { pageSections } from './page-layouts.js';
import type { Logger } from '../logging/logger.js';

export const FOLLOWUP_ALARM_MS = 13 * 60 * 1000;

export type RenderMode = 'D' | 'M' | 'C';

/**
 * item 1 — WHICH profile an action was triggered by. The Renderer is context-aware: a render
 * triggered by a persona falls back to the persona's configured accent, and one triggered by the
 * main bot falls back to the framework amber. `accent` is the acting profile's declared accent
 * (hex); absent means "use the framework default".
 */
export interface RenderProfile {
  readonly kind: 'main' | 'persona';
  /** 'main' for the main bot, or the persona id. */
  readonly id: string;
  /** The acting profile's declared accent, e.g. `#7A5AF8`. Absent for the main bot. */
  readonly accent?: string;
}

export type NoticeReasonCode =
  | 'STATE_UNAVAILABLE'
  | 'MODULE_DISABLED'
  | 'OUT_OF_BOUND_GUILD'
  | 'UNKNOWN_COMMAND'
  | 'MAINTENANCE'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'RESTRICTED'
  | 'COOLDOWN'
  | 'RATE_LIMITED'
  | 'GUILD_UNAVAILABLE'
  | 'MODULE_ERROR'
  | 'OVERDUE'
  /** UR-20261012-032 — a submitted value is not acceptable (e.g. a rename name Discord rejects). */
  | 'INVALID_INPUT';

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
  /** item 1 — which profile triggered this render; supplies the fallback accent. */
  profile?: RenderProfile;
}

export interface NavigationOption {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
  readonly emoji?: string | { name: string; id?: string };
  readonly default?: boolean;
}

/** §1.2/§3.3 — the footer's D/M/C density control, one minted customId per mode. */
export interface ModeControl {
  readonly customIds: Readonly<Record<RenderMode, string>>;
}

/** item 11/15/17 — a page-declared action button (info, uninstall, paging, search). */
export interface PageActionButton {
  /** Omitted for a LINK button (style 5), which carries `url` instead of an id. */
  readonly customId?: string;
  readonly label: string;
  readonly style?: 1 | 2 | 3 | 4 | 5;
  /** A no-op control (e.g. Previous on page 0) is disabled rather than given a colliding id. */
  readonly disabled?: boolean;
  /** item 2 — an optional custom-emoji icon (the Home control's bold house). */
  readonly emoji?: { name: string; id?: string };
  /**
   * UR-20261012-031 — a LINK button's destination. Present means Discord renders style 5 and sends
   * no interaction, so `customId` is ignored.
   */
  readonly url?: string;
}

/** One page action control as a Discord button: a link when it carries a url, else an interaction. */
function blockButton(action: PageActionButton): ButtonComponent {
  if (action.url !== undefined) return linkButton(action.url, action.label, action.emoji);
  return button(
    action.customId ?? '',
    action.label,
    (action.style ?? 2) as 1 | 2 | 3 | 4,
    action.disabled ?? false,
    action.emoji,
  );
}

/** item 17 — one action row; Discord shows up to five buttons per row. */
export type PageActionRow = readonly PageActionButton[];

/** item 6 — the non-string select family a page or module may place in the interactive zone. */
export type EntitySelectKind = 'user' | 'role' | 'mentionable' | 'channel';

/**
 * item 8 — a richer content block. A `section` renders its text with an accessory IN-LINE after it
 * (a button, or a thumbnail — item 3); a `select` renders a String Select row (the install
 * dropdown); an `entitySelect` renders one of the user/role/mentionable/channel selects (item 6); a
 * `thumbnail` renders a standalone small image; a `text` is plain text.
 */
export type RenderBlock =
  | { readonly kind: 'text'; readonly content: string }
  | {
      readonly kind: 'section';
      readonly content: string;
      /** A button (interaction/link) OR a thumbnail image as the single in-line accessory. */
      readonly accessory:
        PageActionButton | { readonly thumbnail: string; readonly description?: string };
    }
  | { readonly kind: 'row'; readonly buttons: readonly PageActionButton[] }
  | {
      readonly kind: 'select';
      readonly customId: string;
      readonly placeholder: string;
      readonly options: readonly NavigationOption[];
      readonly disabled?: boolean;
      /**
       * UR-20261012-054 — historically this asked for the block to render BELOW the footer. It is now
       * IMPLIED and the flag does nothing: a select's canonical zone is below the footer whatever list
       * it is declared in (see `blockZone`), so the grammar places it there without being asked. Kept
       * on the type so an existing declaration does not have to change.
       */
      readonly placement?: 'trailing';
    }
  | {
      readonly kind: 'entitySelect';
      readonly selectType: EntitySelectKind;
      readonly customId: string;
      readonly placeholder?: string;
      readonly minValues?: number;
      readonly maxValues?: number;
      readonly disabled?: boolean;
      readonly channelTypes?: readonly number[];
    }
  | { readonly kind: 'thumbnail'; readonly url: string; readonly description?: string };

function entitySelectBuilder(
  block: Extract<RenderBlock, { kind: 'entitySelect' }>,
): EntitySelectComponent {
  const options = {
    ...(block.placeholder !== undefined ? { placeholder: block.placeholder } : {}),
    ...(block.minValues !== undefined ? { minValues: block.minValues } : {}),
    ...(block.maxValues !== undefined ? { maxValues: block.maxValues } : {}),
    ...(block.disabled !== undefined ? { disabled: block.disabled } : {}),
    ...(block.channelTypes !== undefined ? { channelTypes: [...block.channelTypes] } : {}),
  };
  switch (block.selectType) {
    case 'user':
      return userSelect(block.customId, options);
    case 'role':
      return roleSelect(block.customId, options);
    case 'mentionable':
      return mentionableSelect(block.customId, options);
    case 'channel':
      return channelSelect(block.customId, options);
  }
}

function renderBlockComponent(block: RenderBlock): Component | undefined {
  switch (block.kind) {
    case 'text':
      return textDisplay(block.content);
    case 'thumbnail':
      return thumbnail(block.url, block.description);
    case 'section': {
      const accessory =
        'thumbnail' in block.accessory
          ? thumbnail(block.accessory.thumbnail, block.accessory.description)
          : blockButton(block.accessory);
      return section(block.content, accessory);
    }
    case 'row':
      return actionRow(block.buttons.map((b) => blockButton(b)));
    case 'select':
      return actionRow([
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
      ]);
    case 'entitySelect':
      return actionRow([entitySelectBuilder(block)]);
  }
}

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
  /** §1.2 — the footer density control. */
  modeControl?: ModeControl;
  /**
   * item 6 — the BUTTON ZONE: page-declared action buttons, rendered above the footer. Only buttons
   * are permitted here.
   */
  actions?: readonly PageActionRow[];
  /**
   * item 8 — richer content blocks that replace the plain sections. Content and inline controls
   * (text, thumbnail, section) render here, ABOVE the footer; a select declared here is relocated
   * below it. See `blockZone`.
   */
  blocks?: readonly RenderBlock[];
  /**
   * item 6 — the INTERACTIVE ZONE, rendered BELOW the footer. Reserved for interactions and button
   * actions: action-row buttons and every select kind, with no limit on how many a page places. It
   * does NOT accept other content (text/section/thumbnail — those are relocated above the footer) and
   * it does NOT accept an inline button, which is a section accessory and renders with its section
   * above. See `blockZone` for the grammar.
   */
  interactive?: readonly RenderBlock[];
  /**
   * item 4/5 — render this message EPHEMERAL (only the invoking user sees it). The ephemeral grammar
   * is its own (see `renderEphemeral`); an ephemeral render ignores density, accent and footer.
   */
  ephemeral?: boolean;
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
  profile?: RenderProfile;
  ephemeral?: boolean;
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
  /** item 4 — a notice for a private interaction is itself ephemeral. */
  ephemeral?: boolean;
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

/** Parse a `#RGB`/`#RRGGBB` hex into a Discord colour int, or undefined when malformed. */
export function accentToInt(accent: string | undefined): number | undefined {
  if (accent === undefined) return undefined;
  const hex = accent.replace('#', '');
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return undefined;
  return Number.parseInt(full, 16);
}

/**
 * item 1 — resolve the container accent from context. Precedence: an explicit page/module accent,
 * then the ACTING PROFILE's declared accent (a persona's own colour), then the framework default.
 * The main bot's profile carries no accent, so it lands on amber.
 */
export function resolveAccent(
  explicit: string | undefined,
  profile: RenderProfile | undefined,
): number {
  const fromProfile =
    profile?.accent ?? (profile?.kind === 'persona' ? DEFAULT_PERSONA_ACCENT : undefined);
  return accentToInt(explicit) ?? accentToInt(fromProfile) ?? DEFAULT_ACCENT_COLOR;
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

/**
 * §1.3 — the ZONE GRAMMAR for a Mode D page, in Discord's Components v2 terms.
 *
 *   `above` — content and inline controls: text, thumbnails, and sections (whose single accessory is
 *             the INLINE button or a thumbnail). A select NEVER appears above the footer.
 *   `below` — the action zone: action-row buttons and every select kind (string, user, role,
 *             mentionable, channel). Other content never appears below the footer, and neither does
 *             an inline button — an inline button is a section accessory, so it travels with its
 *             section, above the footer.
 *   `both`  — an action row of buttons: the page's own action bar above the footer, and actions in
 *             the interactive zone below it.
 *
 * The zone is a property of the BLOCK KIND, not of the list a page happened to declare it in, so a
 * misplaced block is relocated rather than rendered where it does not belong.
 */
export function blockZone(block: RenderBlock): 'above' | 'below' | 'both' {
  switch (block.kind) {
    case 'text':
    case 'thumbnail':
    case 'section':
      return 'above';
    case 'select':
    case 'entitySelect':
      return 'below';
    case 'row':
      return 'both';
  }
}

export class CoreRenderer {
  private readonly bannerUrl: string | undefined;
  private readonly bannersByModule: Readonly<Record<string, string>>;
  /** §1.3 — logs a block relocated to its canonical zone. Optional, so the renderer stays pure. */
  private readonly logger: Logger | undefined;

  /**
   * §1.3 / §11.5 - the Mode D banner. `bannersByModule` lets a specific module (the dashboard,
   * item 6) carry its own banner; every other module falls back to `bannerUrl` (the default).
   */
  constructor(
    options: {
      bannerUrl?: string;
      bannersByModule?: Record<string, string>;
      logger?: Logger | undefined;
    } = {},
  ) {
    this.bannerUrl = options.bannerUrl;
    this.bannersByModule = options.bannersByModule ?? {};
    this.logger = options.logger;
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

  /**
   * UR-20261012-058 — ANSWER with a notice where nothing has been sent yet. `editNotice` edits a reply
   * that already exists; a refusal raised before the buffer is drawn (a DM, say) has none, so editing
   * would itself fail and the member would see Discord's "The application did not respond" instead of
   * the reason.
   */
  async replyNotice(
    interaction: RendererInteraction,
    descriptor: FormalNoticeDescriptor,
  ): Promise<void> {
    await interaction.reply(this.renderNotice(descriptor));
  }

  renderBuffer(identity: RenderIdentity): ComponentsV2Message {
    return this.frame(
      [
        createTitleBlock(identity.surface, identity.developer ?? DEFAULT_DEVELOPER),
        separator(),
        textDisplay(`⏳ Preparing ${identity.surface}…`),
      ],
      resolveAccent(undefined, identity.profile),
      [],
      false,
    );
  }

  renderPage(input: PageRenderDescriptor): ComponentsV2Message {
    return this.render({
      surface: input.surface,
      ...(input.developer !== undefined ? { developer: input.developer } : {}),
      ...(input.version !== undefined ? { version: input.version } : {}),
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
      ...(input.banner !== undefined ? { banner: input.banner } : {}),
      ...(input.profile !== undefined ? { profile: input.profile } : {}),
      ...(input.ephemeral !== undefined ? { ephemeral: input.ephemeral } : {}),
      sections: derivePageSections(input.page, input.data),
    });
  }

  render(input: RenderDescriptor): ComponentsV2Message {
    const mode = input.mode ?? 'D';
    const sections = input.sections ?? (input.summary ? [input.summary] : []);
    // item 8 — a page may carry content as blocks (sections/select) instead of plain sections, and a
    // page whose only components are interactions is valid too: the interactive zone alone is a page.
    const hasBlocks = input.blocks !== undefined && input.blocks.length > 0;
    if (sections.length === 0 && !hasBlocks && (input.interactive?.length ?? 0) === 0) {
      throw new InvalidRenderDescriptorError();
    }

    const developer = input.developer ?? DEFAULT_DEVELOPER;
    const components: Component[] = [];

    // §1.3 — the ZONE GRAMMAR, applied once here so every render site inherits it. Every declared
    // block is placed in its CANONICAL zone (see `blockZone`), whichever list it was declared in; a
    // misplaced block is relocated rather than rendered where it does not belong, and the relocation
    // is logged when a logger is configured. Nothing is dropped.
    const aboveBlocks: RenderBlock[] = [];
    const belowBlocks: RenderBlock[] = [];
    const placeBlock = (block: RenderBlock, declared: 'above' | 'below'): void => {
      const zone = blockZone(block);
      const target = zone === 'both' ? declared : zone;
      if (target !== declared) {
        this.logger?.warn('render-block-relocated', {
          kind: block.kind,
          from: declared,
          to: target,
          reason:
            'Components v2 zone grammar — selects belong below the footer; content and inline controls above it',
        });
      }
      (target === 'above' ? aboveBlocks : belowBlocks).push(block);
    };
    for (const block of input.blocks ?? []) placeBlock(block, 'above');
    for (const block of input.interactive ?? []) placeBlock(block, 'below');

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
    // UR-20261011-013 R11 - the band shows the developer's display NAME, not a handle: the spec
    // band is "Developed by Quixotic Mnemonics", with no '@'. The registered value is the display
    // name, so it is rendered verbatim.
    const attribution = input.devUsername ?? developer;
    components.push(createTitleBlock(input.surface, attribution));
    components.push(separator());

    // §1.2 / §1.4 - the content slot, rendered at the page's density.
    if (mode === 'C') {
      components.push(textDisplay(this.oneLineRender(input.surface, sections[0] ?? input.surface)));
    } else if (mode === 'M') {
      components.push(textDisplay(this.condensedRender(sections)));
    } else if (aboveBlocks.length > 0) {
      // item 8 — the content blocks, in declaration order: a Section (text with an inline accessory),
      // a text block, a thumbnail. Only blocks whose canonical zone is above the footer reach here; a
      // select declared among them was relocated below, an action row stays where it was declared, and
      // content declared in the interactive list was relocated UP into this zone.
      aboveBlocks.forEach((block) => {
        const component = renderBlockComponent(block);
        if (component !== undefined) components.push(component);
      });
    } else {
      sections.forEach((section, index) => {
        if (index > 0) components.push(separator());
        components.push(textDisplay(section));
      });
    }

    // item 6 — the BUTTON ZONE: page-declared action buttons, rendered ABOVE the footer. Only
    // buttons are permitted here (an ActionRow of buttons), so the footer cleanly separates the
    // page's own controls from the interactive zone below it.
    const actions = input.actions;
    if (actions !== undefined) {
      const rows: Component[] = [];
      for (const row of actions) {
        if (row.length === 0) continue;
        rows.push(actionRow(row.map((b) => blockButton(b))));
      }
      if (rows.length > 0) {
        components.push(separator());
        components.push(...rows);
      }
    }

    // ADR-015 (amends ADR-013) — the module-page footer is `<name> [<id>]` and nothing else; the
    // developer attribution stays in the identity band above and is never repeated in the footer.
    // The ephemeral grammar excludes the footer along with the accent and the density control: an
    // ephemeral card is a private answer, not a page. See `renderEphemeral`.
    const footer =
      input.ephemeral === true ? undefined : this.moduleFooter(input.displayName, input.moduleId);
    if (footer !== undefined) {
      components.push(separator());
      components.push(textDisplay(footer));
    }

    // item 6 — the INTERACTIVE ZONE, below the footer. It is reserved for interactions and button
    // ACTIONS: action-row buttons and select menus of every kind (string/user/role/mentionable/
    // channel), with no limit on how many a page places. Other content is NOT rendered here — a text,
    // section or thumbnail block belongs above the footer and was relocated there. An INLINE button is
    // not rendered here either: it is a section accessory, so it travels with its section, above.
    if (belowBlocks.length > 0) {
      components.push(separator());
      for (const block of belowBlocks) {
        const component = renderBlockComponent(block);
        if (component !== undefined) components.push(component);
      }
    }

    return this.frame(
      components,
      resolveAccent(input.accent, input.profile),
      [],
      input.ephemeral === true,
    );
  }

  /**
   * item 4/5 — the EPHEMERAL grammar. An ephemeral (private) message has its own rules, distinct
   * from the framed page grammar:
   *
   *   - ONE Components-v2 container holds everything (never several top-level containers);
   *   - NO accent / colour is enforced — the container carries no `accent_color`;
   *   - NO density modes, no banner, no identity band, no footer — the caller composes freely;
   *   - the caller may place any content components (text, sections, media, separators, thumbnails)
   *     and any interactive components (buttons, every select menu) inside.
   *
   * The only rule is the single container and the absent accent.
   */
  renderEphemeral(components: Component[]): ComponentsV2Message {
    return buildComponentsV2([container(components)], { ephemeral: true });
  }

  /** item 4/5 — a convenience wrapper: ephemeral content built from text/section blocks. */
  renderEphemeralBlocks(blocks: readonly RenderBlock[]): ComponentsV2Message {
    const components: Component[] = [];
    for (const block of blocks) {
      const component = renderBlockComponent(block);
      if (component !== undefined) components.push(component);
    }
    return this.renderEphemeral(components);
  }

  renderNotice(input: FormalNoticeDescriptor): ComponentsV2Message {
    const heading = input.heading ?? this.defaultNoticeHeading(input.reason);
    const explanation = input.explanation ?? this.defaultNoticeExplanation(input.reason);

    return this.frame(
      [
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
      ],
      resolveAccent(undefined, input.profile),
      [],
      input.ephemeral === true,
    );
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
        ...(result.profile !== undefined ? { profile: result.profile } : {}),
        ...(result.ephemeral !== undefined ? { ephemeral: result.ephemeral } : {}),
      };
    }

    throw new InvalidRenderDescriptorError();
  }

  noticeReasonFromError(err: unknown): NoticeReasonCode {
    if (err instanceof InvalidRenderDescriptorError) return 'MODULE_ERROR';
    const name = err instanceof Error ? err.name : '';
    if (name === 'CommandNotFoundError') return 'UNKNOWN_COMMAND';
    if (name === 'CommandScopeDeniedError') {
      // UR-20261012-074 — a scope refusal has THREE causes now, and they are NOT the same to a member:
      // "your permissions do not allow this", "we could not read the state", and "the module is
      // switched off here". Reporting the third as the first told a member they lacked permission when
      // the truth was that an admin had turned the module off — the exact confusion reported from a
      // live server. The error carries which, so the notice says which.
      const cause = (err as { scopeCause?: string }).scopeCause;
      if (cause === 'state-unreadable') return 'STATE_UNAVAILABLE';
      if (cause === 'module-disabled') return 'MODULE_DISABLED';
      return 'FORBIDDEN';
    }
    if (name === 'PersonaOccupiedError') return 'FORBIDDEN';
    // UR-20261012-060 — a persona is bound to ONE guild; anywhere else it refuses everything.
    if (name === 'PersonaBoundGuildError') return 'OUT_OF_BOUND_GUILD';
    // UR-20261012-032 — a rejected submission is an input fault, not a permission or module fault.
    if (name === 'InvalidCommandNameError') return 'INVALID_INPUT';
    // blueprint.md §22.2 / Table 22-A — a Power Engine `suspendGuild` blocks dispatch in that guild,
    // so the user sees the GUILD_UNAVAILABLE formal notice rather than a partial render.
    if (name === 'GuildSuspendedError') return 'GUILD_UNAVAILABLE';
    return 'MODULE_ERROR';
  }

  private frame(
    components: Parameters<typeof container>[0],
    accent: number = DEFAULT_ACCENT_COLOR,
    topLevel: Component[] = [],
    ephemeral = false,
  ): ComponentsV2Message {
    // The ephemeral grammar: "NO accent / colour is enforced — the container carries no
    // `accent_color`". Applying one anyway is the reported bypass — /modules' private Info card came
    // back amber on a persona, so a private card announced a profile it did not belong to.
    return buildComponentsV2([container(components, ephemeral ? undefined : accent), ...topLevel], {
      ephemeral,
    });
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
      case 'STATE_UNAVAILABLE':
        return 'Could not check this server';
      case 'MODULE_DISABLED':
        return 'This module is switched off';
      case 'OUT_OF_BOUND_GUILD':
        return 'This is not my server';
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
      case 'INVALID_INPUT':
        return 'Invalid input';
    }
  }

  private defaultNoticeExplanation(reason: NoticeReasonCode): string {
    switch (reason) {
      case 'STATE_UNAVAILABLE':
        return 'This server\u2019s module state could not be read, so the command was refused rather than allowed on a guess. This is a fault on our side, not a permission decision \u2014 try again shortly.';
      case 'MODULE_DISABLED':
        return 'The module that provides this command is switched off in this server, so this is not a permissions problem. A server admin can turn it back on from /browse.';
      case 'OUT_OF_BOUND_GUILD':
        return 'This persona is bound to one server and refuses every command and action everywhere else. Invite the main bot, or use the persona in its own server.';
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
      case 'INVALID_INPUT':
        return 'That value cannot be used here. Check it and try again.';
    }
  }
}
