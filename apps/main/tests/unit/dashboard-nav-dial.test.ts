import { test, expect, describe } from 'vitest';
import { DIAL_RADIUS, dialNavSelect, dialWindow } from '../../src/rendering/dashboard-nav.js';
import type { DialEntry } from '../../src/rendering/dashboard-nav.js';
import { HOME_SELECT_VALUE, INSTALL_DROPDOWN_CAP } from '../../src/shared/constants/index.js';

/**
 * §1.2 / item 6 — the dashboard's navigation is a DIAL below the footer.
 *
 * A guild can install more modules than a select may carry, so the dropdown shows a WINDOW around the
 * page you are on: the current module centred, `DIAL_RADIUS` neighbours either side, in installation
 * order. The window wraps, so the first and last modules are centred too — a dial, not a list with
 * dead ends. These cases pin the arithmetic, which is the whole feature.
 */
function entries(n: number): readonly DialEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    name: `Module ${i}`,
    description: `Description ${i}`,
    page: i + 1,
  }));
}

const ids = (opts: readonly { id: string; offset: number }[]): string[] => opts.map((o) => o.id);

describe('dialWindow', () => {
  test('a list that fits the window is returned whole, in order', () => {
    const out = dialWindow(entries(4), 2);
    expect(ids(out)).toStrictEqual(['m0', 'm1', 'm2', 'm3']);
    // Offsets are signed distance from the centre, so "the current module is in the middle" is a fact.
    expect(out.map((o) => o.offset)).toStrictEqual([-2, -1, 0, 1]);
  });

  test('a longer list yields exactly the window, the current module at offset 0', () => {
    const out = dialWindow(entries(40), 20);
    expect(out).toHaveLength(DIAL_RADIUS * 2 + 1);
    expect(out[DIAL_RADIUS]?.id).toBe('m20');
    expect(out.map((o) => o.offset)).toStrictEqual([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
  });

  test('the FIRST module is centred — its upper neighbours WRAP to the end of the list', () => {
    const out = dialWindow(entries(40), 0);
    expect(out[DIAL_RADIUS]?.id).toBe('m0');
    // Above m0 are the last modules, not nothing.
    expect(ids(out)).toStrictEqual([
      'm35',
      'm36',
      'm37',
      'm38',
      'm39',
      'm0',
      'm1',
      'm2',
      'm3',
      'm4',
      'm5',
    ]);
  });

  test('the LAST module is centred — its lower neighbours WRAP to the start', () => {
    const out = dialWindow(entries(40), 39);
    expect(out[DIAL_RADIUS]?.id).toBe('m39');
    expect(ids(out)).toStrictEqual([
      'm34',
      'm35',
      'm36',
      'm37',
      'm38',
      'm39',
      'm0',
      'm1',
      'm2',
      'm3',
      'm4',
    ]);
  });

  test('an empty list yields nothing rather than throwing', () => {
    expect(dialWindow([], 0)).toStrictEqual([]);
  });
});

describe('dialNavSelect', () => {
  const home = { name: 'dumby_home', id: '1' };
  const fallback = { name: 'dumby_module', id: '2' };

  test('Home is pinned first and always carries the reserved value', () => {
    const block = dialNavSelect({
      invokerId: 'u1',
      command: 'dashboard',
      entries: entries(3),
      currentPage: 0,
      homeIcon: home,
      fallbackIcon: fallback,
    });
    expect(block.kind).toBe('select');
    expect(block.options[0]?.label).toBe('Home');
    expect(block.options[0]?.value).toBe(HOME_SELECT_VALUE);
    // One slot is spent on Home, so the module options fit inside the ceiling.
    expect(block.options.length).toBeLessThanOrEqual(INSTALL_DROPDOWN_CAP);
  });

  test('the option for the page you are ON is marked selected', () => {
    const block = dialNavSelect({
      invokerId: 'u1',
      command: 'dashboard',
      entries: entries(3),
      currentPage: 2,
      homeIcon: home,
      fallbackIcon: fallback,
    });
    const selected = block.options.filter((o) => o.default === true);
    expect(selected).toHaveLength(1);
    expect(selected[0]?.value).toBe('2');
  });

  test('a module with no declared logo takes the caller fallback', () => {
    const withIcon: DialEntry[] = [
      { id: 'a', name: 'A', description: 'a', page: 1, icon: { name: 'dumby_browse', id: '9' } },
      { id: 'b', name: 'B', description: 'b', page: 2 },
    ];
    const block = dialNavSelect({
      invokerId: 'u1',
      command: 'dashboard',
      entries: withIcon,
      currentPage: 1,
      homeIcon: home,
      fallbackIcon: fallback,
    });
    // Home, then A (its own logo), then B (the fallback).
    expect(block.options[0]?.emoji).toStrictEqual(home);
    expect(block.options[1]?.emoji).toStrictEqual({ name: 'dumby_browse', id: '9' });
    expect(block.options[2]?.emoji).toStrictEqual(fallback);
  });

  test('the option value is the target page, and the customId is the dashboard nav', () => {
    const block = dialNavSelect({
      invokerId: 'u1',
      command: 'dashboard',
      entries: entries(3),
      currentPage: 0,
      homeIcon: home,
      fallbackIcon: fallback,
    });
    expect(block.options.slice(1).map((o) => o.value)).toStrictEqual(['1', '2', '3']);
    expect(block.customId).toBe('dumby:act:u1:nav:dashboard');
  });

  test('the SAME builder serves /modules — only the customId target changes', () => {
    const block = dialNavSelect({
      invokerId: 'u1',
      command: 'modules',
      homeDescription: 'Return to the first page of the module list.',
      entries: entries(3),
      currentPage: 1,
      homeIcon: home,
      fallbackIcon: fallback,
    });
    expect(block.customId).toBe('dumby:act:u1:nav:modules');
    expect(block.options[0]?.description).toBe('Return to the first page of the module list.');
    expect(block.options.filter((o) => o.default === true)[0]?.value).toBe('1');
  });

  test('40 modules still produce a legal option count, centred on the current page', () => {
    const block = dialNavSelect({
      invokerId: 'u1',
      command: 'dashboard',
      entries: entries(40),
      currentPage: 20,
      homeIcon: home,
      fallbackIcon: fallback,
    });
    expect(block.options.length).toBe(DIAL_RADIUS * 2 + 2); // Home + the window
    expect(block.options[0]?.value).toBe(HOME_SELECT_VALUE);
    expect(block.options.filter((o) => o.default === true)[0]?.value).toBe('20');
  });
});
