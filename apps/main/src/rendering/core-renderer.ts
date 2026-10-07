import {
  buildComponentsV2,
  container,
  createBannerMediaGallery,
  createTitleBlock,
  DEFAULT_ACCENT_COLOR,
  separator,
  textDisplay,
  type Component,
  type ComponentsV2Message,
} from '../shared/utils/components-v2.js';

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
 * Maps page data to render sections: the primary value is the content line, the remaining fields a
 * single subtext meta line.
 *
 * §11.6 - `-#` is subtext only at the *start* of a line, so exactly one marker is emitted, at the
 * head of the meta line. Emitting one per field left every marker after the first rendering as
 * literal `-#` characters in the middle of the line.
 */
export function derivePageSections(
  page: string,
  data: Readonly<Record<string, unknown>>,
): readonly string[] {
  const entries = Object.entries(data);
  const [first, ...rest] = entries;
  const primary = first === undefined ? page : String(first[1]);
  if (rest.length === 0) return [primary];
  const meta = rest.map(([key, value]) => `${key}: ${String(value)}`).join(' | ');
  return [primary, `-# ${meta}`];
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
const DEFAULT_VERSION = '5.0.0';

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
  createTraceId(): string {
    return `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  createReadOnlyInteraction<T extends object>(interaction: T): T {
    return new Proxy(interaction, {
      get(target, prop, receiver) {
        if (
          prop === 'reply' ||
          prop === 'deferReply' ||
          prop === 'editReply' ||
          prop === 'followUp' ||
          prop === 'showModal'
        ) {
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
      createTitleBlock(
        identity.surface,
        identity.developer ?? DEFAULT_DEVELOPER,
        identity.version ?? DEFAULT_VERSION,
      ),
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
    if (sections.length === 0) {
      throw new InvalidRenderDescriptorError();
    }

    const developer = input.developer ?? DEFAULT_DEVELOPER;
    const version = input.version ?? DEFAULT_VERSION;
    const components: Component[] = [];

    // §1.2 / §1.3 / §1.4 - the banner slot opens the frame, and is present in Mode D only.
    if (mode === 'D' && input.banner !== undefined) {
      components.push(createBannerMediaGallery(input.banner));
      components.push(separator());
    }

    // §1.2 / §1.5 - the identity band: the title and its attribution line.
    components.push(createTitleBlock(input.surface, developer, version));
    components.push(separator());

    // §1.2 / §1.4 - the content slot, rendered at the page's density.
    if (mode === 'C') {
      components.push(textDisplay(this.oneLineRender(input.surface, sections[0] ?? input.surface)));
    } else if (mode === 'M') {
      components.push(textDisplay(this.condensedRender(sections)));
    } else {
      sections.forEach((section, index) => {
        if (index > 0) components.push(separator());
        components.push(textDisplay(section));
      });
    }
    components.push(separator());

    // §1.2 / §1.5 - the footer repeats the attribution.
    components.push(textDisplay(`-# Developed by ${developer} v${version}`));

    return this.frame(components);
  }

  renderNotice(input: FormalNoticeDescriptor): ComponentsV2Message {
    const heading = input.heading ?? this.defaultNoticeHeading(input.reason);
    const explanation = input.explanation ?? this.defaultNoticeExplanation(input.reason);

    return this.frame([
      createTitleBlock(
        input.surface,
        input.developer ?? DEFAULT_DEVELOPER,
        input.version ?? DEFAULT_VERSION,
      ),
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

  normalizeHandlerResult(result: unknown, fallback: RenderIdentity): RenderDescriptor {
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
        ...(result.version !== undefined ? { version: result.version } : {}),
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

  private frame(components: Parameters<typeof container>[0]): ComponentsV2Message {
    return buildComponentsV2([container(components, DEFAULT_ACCENT_COLOR)]);
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
