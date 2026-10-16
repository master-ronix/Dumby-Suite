export const IS_COMPONENTS_V2 = 32768;
/** 1 << 6 — a message only the invoking user can see. Combinable with IS_COMPONENTS_V2. */
export const EPHEMERAL = 64;

export const ComponentType = {
  ACTION_ROW: 1,
  TEXT_DISPLAY: 10,
  MEDIA_GALLERY: 12,
  SEPARATOR: 14,
  CONTAINER: 17,
  STRING_SELECT: 3,
  BUTTON: 2,
  /** item 8 — a Section: text blocks beside an accessory (e.g. an inline button). */
  SECTION: 9,
  /** item 3 — a small image usable as a Section accessory (Discord type 11). */
  THUMBNAIL: 11,
  /** item 6 — the select-menu family: user / role / mentionable / channel (Discord types 5-8). */
  USER_SELECT: 5,
  ROLE_SELECT: 6,
  MENTIONABLE_SELECT: 7,
  CHANNEL_SELECT: 8,
} as const;

export type ComponentTypeValue =
  | typeof ComponentType.ACTION_ROW
  | typeof ComponentType.TEXT_DISPLAY
  | typeof ComponentType.MEDIA_GALLERY
  | typeof ComponentType.SEPARATOR
  | typeof ComponentType.CONTAINER
  | typeof ComponentType.STRING_SELECT
  | typeof ComponentType.BUTTON
  | typeof ComponentType.SECTION
  | typeof ComponentType.THUMBNAIL
  | typeof ComponentType.USER_SELECT
  | typeof ComponentType.ROLE_SELECT
  | typeof ComponentType.MENTIONABLE_SELECT
  | typeof ComponentType.CHANNEL_SELECT;

export interface ComponentBase {
  type: ComponentTypeValue;
}

export interface TextDisplayComponent extends ComponentBase {
  type: typeof ComponentType.TEXT_DISPLAY;
  content: string;
}

export interface MediaGalleryComponent extends ComponentBase {
  type: typeof ComponentType.MEDIA_GALLERY;
  items: Array<{
    media: {
      url: string;
    };
    description?: string;
  }>;
}

export interface SeparatorComponent extends ComponentBase {
  type: typeof ComponentType.SEPARATOR;
  divider?: boolean;
  spacing?: 1 | 2;
}

export interface ContainerComponent extends ComponentBase {
  type: typeof ComponentType.CONTAINER;
  components: Component[];
  accent_color?: number;
  spoiler?: boolean;
}

export interface StringSelectComponent extends ComponentBase {
  type: typeof ComponentType.STRING_SELECT;
  custom_id: string;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  disabled?: boolean;
  options: Array<{
    label: string;
    value: string;
    description?: string;
    emoji?: { name: string; id?: string; animated?: boolean };
    default?: boolean;
  }>;
}

/**
 * item 6 — the select-menu family that is NOT the string select. Discord types 5-8 (user, role,
 * mentionable, channel) share one shape: a minted customId, optional placeholder/min/max/disabled,
 * and an optional `default_values` list. They carry no `options` array — the client enumerates the
 * candidates (members, roles, channels) itself.
 */
export interface EntitySelectComponent extends ComponentBase {
  type:
    | typeof ComponentType.USER_SELECT
    | typeof ComponentType.ROLE_SELECT
    | typeof ComponentType.MENTIONABLE_SELECT
    | typeof ComponentType.CHANNEL_SELECT;
  custom_id: string;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  disabled?: boolean;
  default_values?: Array<{ id: string; type: 'user' | 'role' | 'channel' }>;
  /** Channel select only — restrict to these channel types (Discord channel type numbers). */
  channel_types?: number[];
}

export interface ButtonComponent extends ComponentBase {
  type: typeof ComponentType.BUTTON;
  style: 1 | 2 | 3 | 4 | 5;
  custom_id: string;
  /** item 2 — omitted for an icon-only control (the Home button). */
  label?: string;
  disabled?: boolean;
  emoji?: { name: string; id?: string; animated?: boolean };
}

export interface ActionRowComponent extends ComponentBase {
  type: typeof ComponentType.ACTION_ROW;
  components: Array<ButtonComponent | StringSelectComponent | EntitySelectComponent>;
}

/**
 * item 3 — a small image (Discord type 11). Usable ONLY as a Section accessory, and (item 6) also
 * usable as a standalone content element. Mirrors the embed thumbnail slot.
 */
export interface ThumbnailComponent extends ComponentBase {
  type: typeof ComponentType.THUMBNAIL;
  media: { url: string };
  description?: string;
  spoiler?: boolean;
}

/**
 * item 8 — a Section holds one or more Text Displays beside a single accessory, so a control can sit
 * IN-LINE after its text rather than on a separate row. Discord allows exactly one accessory, and it
 * is either a Button or a Thumbnail (item 3).
 */
export interface SectionComponent extends ComponentBase {
  type: typeof ComponentType.SECTION;
  components: TextDisplayComponent[];
  accessory: ButtonComponent | ThumbnailComponent;
}

export type Component =
  | TextDisplayComponent
  | MediaGalleryComponent
  | SeparatorComponent
  | ContainerComponent
  | StringSelectComponent
  | EntitySelectComponent
  | ButtonComponent
  | ActionRowComponent
  | SectionComponent
  | ThumbnailComponent;

export interface ComponentsV2Message {
  components: Component[];
  flags: number;
}

export function textDisplay(content: string): TextDisplayComponent {
  return {
    type: ComponentType.TEXT_DISPLAY,
    content,
  };
}

export function mediaGallery(url: string, description?: string): MediaGalleryComponent {
  const item: { media: { url: string }; description?: string } = { media: { url } };
  if (description !== undefined) {
    item.description = description;
  }
  return {
    type: ComponentType.MEDIA_GALLERY,
    items: [item],
  };
}

export function separator(
  dividerOrSpacing: boolean | 'small' | 'large' = true,
  spacing: 'small' | 'large' = 'large',
): SeparatorComponent {
  const divider = typeof dividerOrSpacing === 'boolean' ? dividerOrSpacing : true;
  const size = typeof dividerOrSpacing === 'string' ? dividerOrSpacing : spacing;
  return {
    type: ComponentType.SEPARATOR,
    divider,
    spacing: size === 'small' ? 1 : 2,
  };
}

export function container(components: Component[], accentColor?: number): ContainerComponent {
  const result: ContainerComponent = {
    type: ComponentType.CONTAINER,
    components,
  };
  if (accentColor !== undefined) {
    result.accent_color = accentColor;
  }
  return result;
}

export function stringSelect(
  customId: string,
  options: Array<{
    label: string;
    value: string;
    description?: string;
    emoji?: string | { name: string; id?: string };
    default?: boolean;
  }>,
  placeholder?: string,
  disabled?: boolean,
): StringSelectComponent {
  const result: StringSelectComponent = {
    type: ComponentType.STRING_SELECT,
    custom_id: customId,
    min_values: 1,
    max_values: 1,
    options: options.map((opt) => {
      const result: {
        label: string;
        value: string;
        description?: string;
        emoji?: { name: string; id?: string; animated?: boolean };
        default?: boolean;
      } = {
        label: opt.label,
        value: opt.value,
      };
      if (opt.description !== undefined) result.description = opt.description;
      if (opt.emoji !== undefined)
        result.emoji = typeof opt.emoji === 'string' ? { name: opt.emoji } : opt.emoji;
      if (opt.default !== undefined) result.default = opt.default;
      return result;
    }),
  };
  if (placeholder !== undefined) {
    result.placeholder = placeholder;
  }
  if (disabled !== undefined) {
    result.disabled = disabled;
  }
  return result;
}

/** item 6 — the shared shape of the user/role/mentionable/channel select family. */
function entitySelect(
  type: EntitySelectComponent['type'],
  customId: string,
  options: {
    placeholder?: string;
    minValues?: number;
    maxValues?: number;
    disabled?: boolean;
    defaultValues?: Array<{ id: string; type: 'user' | 'role' | 'channel' }>;
    channelTypes?: number[];
  } = {},
): EntitySelectComponent {
  const result: EntitySelectComponent = {
    type,
    custom_id: customId,
    min_values: options.minValues ?? 1,
    max_values: options.maxValues ?? 1,
  };
  if (options.placeholder !== undefined) result.placeholder = options.placeholder;
  if (options.disabled !== undefined) result.disabled = options.disabled;
  if (options.defaultValues !== undefined) result.default_values = options.defaultValues;
  if (options.channelTypes !== undefined) result.channel_types = options.channelTypes;
  return result;
}

/** item 6 — a User Select menu (Discord type 5). */
export function userSelect(
  customId: string,
  options?: Parameters<typeof entitySelect>[2],
): EntitySelectComponent {
  return entitySelect(ComponentType.USER_SELECT, customId, options);
}

/** item 6 — a Role Select menu (Discord type 6). */
export function roleSelect(
  customId: string,
  options?: Parameters<typeof entitySelect>[2],
): EntitySelectComponent {
  return entitySelect(ComponentType.ROLE_SELECT, customId, options);
}

/** item 6 — a Mentionable Select menu (Discord type 7: users and roles). */
export function mentionableSelect(
  customId: string,
  options?: Parameters<typeof entitySelect>[2],
): EntitySelectComponent {
  return entitySelect(ComponentType.MENTIONABLE_SELECT, customId, options);
}

/** item 6 — a Channel Select menu (Discord type 8), optionally restricted to channel types. */
export function channelSelect(
  customId: string,
  options?: Parameters<typeof entitySelect>[2],
): EntitySelectComponent {
  return entitySelect(ComponentType.CHANNEL_SELECT, customId, options);
}

export function button(
  customId: string,
  label: string,
  style: 1 | 2 | 3 | 4 | 5 = 2,
  disabled = false,
  emoji?: string | { name: string; id?: string },
): ButtonComponent {
  const result: ButtonComponent = {
    type: ComponentType.BUTTON,
    style,
    custom_id: customId,
    disabled,
  };
  // item 2 — an icon-only control (the Home button) omits the label and carries a custom emoji.
  if (label !== '') {
    result.label = label;
  }
  if (emoji !== undefined) {
    result.emoji = typeof emoji === 'string' ? { name: emoji } : emoji;
  }
  return result;
}

/**
 * UR-20261012-029 — a LINK button (style 5). Discord requires a `url` in place of a `custom_id` on
 * a link button, so it is built here rather than through `button()`.
 */
export function linkButton(
  url: string,
  label: string,
  emoji?: string | { name: string; id?: string },
): ButtonComponent {
  const result = {
    type: ComponentType.BUTTON,
    style: 5 as const,
    custom_id: '',
    url,
    disabled: false,
  } as unknown as ButtonComponent & { url: string };
  if (label !== '') result.label = label;
  if (emoji !== undefined) result.emoji = typeof emoji === 'string' ? { name: emoji } : emoji;
  return result;
}

export function actionRow(
  components: Array<ButtonComponent | StringSelectComponent | EntitySelectComponent>,
): ActionRowComponent {
  return {
    type: ComponentType.ACTION_ROW,
    components,
  };
}

/**
 * item 3 — a small image usable as a Section accessory (Discord type 11). Mirrors the embed
 * thumbnail slot; Discord renders it right-aligned beside the section's text.
 */
export function thumbnail(url: string, description?: string, spoiler?: boolean): ThumbnailComponent {
  const result: ThumbnailComponent = {
    type: ComponentType.THUMBNAIL,
    media: { url },
  };
  if (description !== undefined) result.description = description;
  if (spoiler !== undefined) result.spoiler = spoiler;
  return result;
}

/** item 8 — a Section: a text block with an accessory (button or thumbnail) rendered in-line. */
export function section(
  content: string | TextDisplayComponent[],
  accessory: ButtonComponent | ThumbnailComponent,
): SectionComponent {
  const components = typeof content === 'string' ? [textDisplay(content)] : content;
  return {
    type: ComponentType.SECTION,
    components,
    accessory,
  };
}

/** item 5 — a modal text input (short, style 1) or paragraph (style 2). */
export interface ModalTextInput {
  customId: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  /** item 6 — style 2 is a multi-line paragraph input. */
  style?: 'short' | 'paragraph';
  minLength?: number;
}

export interface ModalPayload {
  custom_id: string;
  title: string;
  components: Array<{
    type: typeof ComponentType.ACTION_ROW;
    components: Array<{
      type: 4;
      custom_id: string;
      label: string;
      style: 1 | 2;
      placeholder?: string;
      required?: boolean;
      max_length?: number;
      min_length?: number;
    }>;
  }>;
}

function textInputRow(input: ModalTextInput): ModalPayload['components'][number] {
  return {
    type: ComponentType.ACTION_ROW,
    components: [
      {
        type: 4,
        custom_id: input.customId,
        label: input.label,
        style: input.style === 'paragraph' ? 2 : 1,
        ...(input.placeholder !== undefined ? { placeholder: input.placeholder } : {}),
        ...(input.required !== undefined ? { required: input.required } : {}),
        ...(input.maxLength !== undefined ? { max_length: input.maxLength } : {}),
        ...(input.minLength !== undefined ? { min_length: input.minLength } : {}),
      },
    ],
  };
}

export function textInputModal(
  customId: string,
  title: string,
  input: ModalTextInput,
): ModalPayload {
  return {
    custom_id: customId,
    title,
    components: [textInputRow(input)],
  };
}

/** item 6 — a modal carrying several inputs (short inputs and/or paragraphs), one per action row. */
export function multiInputModal(
  customId: string,
  title: string,
  inputs: readonly ModalTextInput[],
): ModalPayload {
  return {
    custom_id: customId,
    title,
    components: inputs.map(textInputRow),
  };
}

/**
 * item 5 — build a Components-v2 message. `ephemeral` adds the EPHEMERAL flag (1 << 6) alongside
 * IS_COMPONENTS_V2, producing a message only the invoking user can see.
 */
export function buildComponentsV2(
  components: Component[],
  options: { ephemeral?: boolean } = {},
): ComponentsV2Message {
  return {
    components,
    flags: options.ephemeral === true ? IS_COMPONENTS_V2 | EPHEMERAL : IS_COMPONENTS_V2,
  };
}

export const DEFAULT_ACCENT_COLOR = 0xffca6d;

/**
 * item 2 — the accent a Twill-registered persona falls back to when none is configured: a neutral
 * gray. Distinct from the framework's amber default, so a persona with no declared identity is
 * visibly its own surface rather than the framework's.
 */
export const DEFAULT_PERSONA_ACCENT = '#808080';

export function createBannerMediaGallery(bannerUrl: string): MediaGalleryComponent {
  return mediaGallery(bannerUrl, 'Dumby banner');
}

export function getDefaultBannerUrl(
  moduleName: string,
  accentColor = DEFAULT_ACCENT_COLOR,
): string {
  const encoded = encodeURIComponent(moduleName);
  return `https://api.dumby.dev/banner?module=${encoded}&color=${accentColor.toString(16).padStart(6, '0')}`;
}

export function createTitleBlock(
  pageName: string,
  developer = 'Quixotic Mnemonics',
): TextDisplayComponent {
  return textDisplay(`**Dumby Suite | ${pageName}**\n-# Developed by ${developer}`);
}

export function createMarketplaceTitleBlock(
  developer = 'Quixotic Mnemonics',
): TextDisplayComponent {
  return textDisplay(`**Dumby Suite | Marketplace**\n-# Developed by ${developer}`);
}

export function createSectionHeader(emoji: string, title: string): TextDisplayComponent {
  return textDisplay(`━━ ${emoji} ${title} ━━`);
}

export function createKeyValueDisplay(pairs: Record<string, string>): TextDisplayComponent {
  const lines = Object.entries(pairs).map(([key, value]) => `${key}: ${value}`);
  return textDisplay(lines.join('\n'));
}
