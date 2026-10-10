import { describe, expect, test } from 'vitest';
import {
  IS_COMPONENTS_V2,
  ComponentType,
  textDisplay,
  mediaGallery,
  separator,
  container,
  stringSelect,
  button,
  actionRow,
  buildComponentsV2,
  DEFAULT_ACCENT_COLOR,
  createBannerMediaGallery,
  getDefaultBannerUrl,
  createTitleBlock,
  createMarketplaceTitleBlock,
  createSectionHeader,
  createKeyValueDisplay,
} from '../../src/shared/utils/components-v2.js';

describe('components-v2 builders', () => {
  test('textDisplay creates a TEXT_DISPLAY component', () => {
    expect(textDisplay('hello')).toStrictEqual({
      type: ComponentType.TEXT_DISPLAY,
      content: 'hello',
    });
  });

  test('mediaGallery creates an item with the given URL', () => {
    expect(mediaGallery('https://img/1.png')).toStrictEqual({
      type: ComponentType.MEDIA_GALLERY,
      items: [{ media: { url: 'https://img/1.png' } }],
    });
  });

  test('mediaGallery attaches a description when provided', () => {
    expect(mediaGallery('https://img/1.png', 'Banner')).toStrictEqual({
      type: ComponentType.MEDIA_GALLERY,
      items: [{ media: { url: 'https://img/1.png' }, description: 'Banner' }],
    });
  });

  test('separator defaults to divider true and large spacing (2)', () => {
    expect(separator()).toStrictEqual({
      type: ComponentType.SEPARATOR,
      divider: true,
      spacing: 2,
    });
  });

  test('separator maps small spacing to 1 and honors divider false', () => {
    expect(separator(false, 'small')).toStrictEqual({
      type: ComponentType.SEPARATOR,
      divider: false,
      spacing: 1,
    });
  });

  test('container wraps components and attaches accent color only when given', () => {
    const child = textDisplay('x');
    expect(container([child])).toStrictEqual({
      type: ComponentType.CONTAINER,
      components: [child],
    });
    expect(container([child], 0x112233)).toStrictEqual({
      type: ComponentType.CONTAINER,
      components: [child],
      accent_color: 0x112233,
    });
  });

  test('stringSelect builds options and resolves emoji to { name }', () => {
    const select = stringSelect(
      'dd',
      [
        { label: 'One', value: '1' },
        { label: 'Two', value: '2', description: 'desc', emoji: '🚀', default: true },
      ],
      'Pick one',
    );
    expect(select).toStrictEqual({
      type: ComponentType.STRING_SELECT,
      custom_id: 'dd',
      placeholder: 'Pick one',
      min_values: 1,
      max_values: 1,
      options: [
        { label: 'One', value: '1' },
        { label: 'Two', value: '2', description: 'desc', emoji: { name: '🚀' }, default: true },
      ],
    });
  });

  test('stringSelect omits placeholder when absent', () => {
    const select = stringSelect('dd', [{ label: 'One', value: '1' }]);
    expect(select).not.toHaveProperty('placeholder');
  });

  test('button builds a button with defaults and optional emoji', () => {
    expect(button('id', 'Label')).toStrictEqual({
      type: ComponentType.BUTTON,
      style: 2,
      custom_id: 'id',
      label: 'Label',
      disabled: false,
    });
    expect(button('id', 'Label', 3, true, '👍')).toStrictEqual({
      type: ComponentType.BUTTON,
      style: 3,
      custom_id: 'id',
      label: 'Label',
      disabled: true,
      emoji: { name: '👍' },
    });
  });

  test('actionRow groups buttons and selects', () => {
    const btn = button('b', 'B');
    const sel = stringSelect('s', [{ label: 'L', value: 'v' }]);
    expect(actionRow([btn, sel])).toStrictEqual({
      type: ComponentType.ACTION_ROW,
      components: [btn, sel],
    });
  });

  test('buildComponentsV2 sets the Components V2 flag', () => {
    expect(buildComponentsV2([])).toStrictEqual({
      components: [],
      flags: IS_COMPONENTS_V2,
    });
    expect(IS_COMPONENTS_V2).toBe(32768);
  });

  test('createBannerMediaGallery delegates to mediaGallery', () => {
    expect(createBannerMediaGallery('https://img/2.png')).toStrictEqual(
      mediaGallery('https://img/2.png', 'Dumby banner'),
    );
  });

  test('getDefaultBannerUrl encodes module name and color', () => {
    expect(getDefaultBannerUrl('Modules')).toContain('module=Modules');
    expect(getDefaultBannerUrl('My Module', 0xabcdef)).toBe(
      'https://api.dumby.dev/banner?module=My%20Module&color=abcdef',
    );
    expect(getDefaultBannerUrl('Health', DEFAULT_ACCENT_COLOR)).toBe(
      'https://api.dumby.dev/banner?module=Health&color=ffca6d',
    );
  });

  test('createTitleBlock renders a bold Dumby Suite title and the developer line', () => {
    expect(createTitleBlock('Dashboard')).toStrictEqual(
      textDisplay('**Dumby Suite | Dashboard**\n-# Developed by Quixotic Mnemonics'),
    );
    expect(createTitleBlock('Health', 'Quixotic Mnemonics')).toStrictEqual(
      textDisplay('**Dumby Suite | Health**\n-# Developed by Quixotic Mnemonics'),
    );
  });

  test('createMarketplaceTitleBlock names the surface with framework attribution', () => {
    expect(createMarketplaceTitleBlock()).toStrictEqual(
      textDisplay('**Dumby Suite | Marketplace**\n-# Developed by Quixotic Mnemonics'),
    );
  });

  test('createSectionHeader wraps emoji and title in borders', () => {
    expect(createSectionHeader('👤', 'Active Personas')).toStrictEqual(
      textDisplay('━━ 👤 Active Personas ━━'),
    );
  });

  test('createKeyValueDisplay joins key-value pairs', () => {
    expect(createKeyValueDisplay({ Ping: '12ms', Status: 'Online' })).toStrictEqual(
      textDisplay('Ping: 12ms\nStatus: Online'),
    );
  });
});
