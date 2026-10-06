/**
 * Components V2 utilities (Cluster: Frame).
 * Builds Discord Components V2 messages per interface.md specification.
 */

export const IS_COMPONENTS_V2 = 32768;

export const ComponentType = {
  ACTION_ROW: 1,
  TEXT_DISPLAY: 10,
  MEDIA_GALLERY: 12,
  SEPARATOR: 14,
  CONTAINER: 17,
  STRING_SELECT: 3,
  BUTTON: 2,
} as const;

export type ComponentTypeValue =
  | typeof ComponentType.ACTION_ROW
  | typeof ComponentType.TEXT_DISPLAY
  | typeof ComponentType.MEDIA_GALLERY
  | typeof ComponentType.SEPARATOR
  | typeof ComponentType.CONTAINER
  | typeof ComponentType.STRING_SELECT
  | typeof ComponentType.BUTTON;

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
  options: Array<{
    label: string;
    value: string;
    description?: string;
    emoji?: { name: string; id?: string; animated?: boolean };
    default?: boolean;
  }>;
}

export interface ButtonComponent extends ComponentBase {
  type: typeof ComponentType.BUTTON;
  style: 1 | 2 | 3 | 4 | 5;
  custom_id: string;
  label: string;
  disabled?: boolean;
  emoji?: { name: string; id?: string; animated?: boolean };
}

export interface ActionRowComponent extends ComponentBase {
  type: typeof ComponentType.ACTION_ROW;
  components: Array<ButtonComponent | StringSelectComponent>;
}

export type Component =
  | TextDisplayComponent
  | MediaGalleryComponent
  | SeparatorComponent
  | ContainerComponent
  | StringSelectComponent
  | ButtonComponent
  | ActionRowComponent;

export interface ComponentsV2Message {
  components: Component[];
  flags: typeof IS_COMPONENTS_V2;
}

/**
 * Creates a Text Display component.
 */
export function textDisplay(content: string): TextDisplayComponent {
  return {
    type: ComponentType.TEXT_DISPLAY,
    content,
  };
}

/**
 * Creates a Media Gallery component for banner images.
 */
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

/**
 * Creates a Separator component.
 */
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

/**
 * Creates a Container component (top-level).
 */
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

/**
 * Creates a String Select Menu component.
 */
export function stringSelect(
  customId: string,
  options: Array<{
    label: string;
    value: string;
    description?: string;
    emoji?: string;
    default?: boolean;
  }>,
  placeholder?: string,
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
      if (opt.emoji !== undefined) result.emoji = { name: opt.emoji };
      if (opt.default !== undefined) result.default = opt.default;
      return result;
    }),
  };
  if (placeholder !== undefined) {
    result.placeholder = placeholder;
  }
  return result;
}

/**
 * Creates a Button component.
 */
export function button(
  customId: string,
  label: string,
  style: 1 | 2 | 3 | 4 | 5 = 2,
  disabled = false,
  emoji?: string,
): ButtonComponent {
  const result: ButtonComponent = {
    type: ComponentType.BUTTON,
    style,
    custom_id: customId,
    label,
    disabled,
  };
  if (emoji !== undefined) {
    result.emoji = { name: emoji };
  }
  return result;
}

/**
 * Creates an Action Row with buttons/selects.
 */
export function actionRow(
  components: Array<ButtonComponent | StringSelectComponent>,
): ActionRowComponent {
  return {
    type: ComponentType.ACTION_ROW,
    components,
  };
}

/**
 * Builds a complete Components V2 message.
 */
export function buildComponentsV2(components: Component[]): ComponentsV2Message {
  return {
    components,
    flags: IS_COMPONENTS_V2,
  };
}

/**
 * Default Dumby accent color.
 */
export const DEFAULT_ACCENT_COLOR = 0x5865f2;

/**
 * Creates a banner Media Gallery from a URL or returns a generated banner placeholder.
 * In production, this would serve from the module's assets directory or CDN.
 */
export function createBannerMediaGallery(bannerUrl: string): MediaGalleryComponent {
  return mediaGallery(bannerUrl, 'Dumby banner');
}

/**
 * Creates a default generated banner URL.
 * In a real implementation, this would generate an image server-side or use a placeholder service.
 */
export function getDefaultBannerUrl(
  moduleName: string,
  accentColor = DEFAULT_ACCENT_COLOR,
): string {
  const encoded = encodeURIComponent(moduleName);
  return `https://api.dumby.dev/banner?module=${encoded}&color=${accentColor.toString(16).padStart(6, '0')}`;
}

/**
 * Creates the standard title block (TextDisplay with title and developer attribution).
 */
export function createTitleBlock(
  pageName: string,
  developer = 'Quixotic Mnemonics',
  version?: string,
): TextDisplayComponent {
  const title = `Dumby | ${pageName}`;
  const attribution = version
    ? `-# Developed by ${developer} v${version}`
    : `-# Developed by ${developer}`;
  return textDisplay(`${title}\n${attribution}`);
}

/**
 * Creates the Marketplace title block (no "Dumby |" prefix).
 */
export function createMarketplaceTitleBlock(
  developer = 'Quixotic Mnemonics',
): TextDisplayComponent {
  return textDisplay(`Dumby | Marketplace\n-# Developed by ${developer}`);
}

/**
 * Creates a section header with visual separator.
 */
export function createSectionHeader(emoji: string, title: string): TextDisplayComponent {
  return textDisplay(`━━ ${emoji} ${title} ━━`);
}

/**
 * Creates a key-value text display for health/info pages.
 */
export function createKeyValueDisplay(pairs: Record<string, string>): TextDisplayComponent {
  const lines = Object.entries(pairs).map(([key, value]) => `${key}: ${value}`);
  return textDisplay(lines.join('\n'));
}
