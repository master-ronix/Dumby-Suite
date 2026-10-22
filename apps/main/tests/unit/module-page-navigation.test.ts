import { test, expect, describe } from 'vitest';
import { modulePageNavigation, romanNumeral } from '../../src/rendering/page-data.js';

/**
 * item 6 / item 17 — the /modules dial's options are PAGES, not modules.
 *
 * That surface lists the modules directly, so the dial moves between page slides. An option per
 * module would offer targets that do not exist — the dial would look like the dashboard's, which
 * pages module command lists, and would be wrong here.
 */
describe('the /modules dial offers pages', () => {
  test('one option per page, numbered from 1 and carrying the 0-based page', () => {
    const nav = modulePageNavigation(3, 12, 5);
    // item 5 — a dial moves between POSITIONS, so the label reads as one: `Slide II`, not `Page 2`.
    expect(nav.map((n) => n.name)).toStrictEqual(['Slide I', 'Slide II', 'Slide III']);
    expect(nav.map((n) => n.page)).toStrictEqual([0, 1, 2]);
    expect(nav.map((n) => n.id)).toStrictEqual(['page-1', 'page-2', 'page-3']);
  });

  test('each option states the range of modules it shows', () => {
    const nav = modulePageNavigation(3, 12, 5);
    expect(nav[0]?.description).toBe('Modules 1–5');
    expect(nav[1]?.description).toBe('Modules 6–10');
    // a partial last page stops at the real total, not at the page size
    expect(nav[2]?.description).toBe('Modules 11–12');
  });

  test('a one-module page reads in the singular', () => {
    expect(modulePageNavigation(1, 1, 5)[0]?.description).toBe('Module 1');
  });

  test('a single page is still one option — never an empty dial', () => {
    const nav = modulePageNavigation(1, 4, 5);
    expect(nav).toHaveLength(1);
    expect(nav[0]?.description).toBe('Modules 1–4');
  });

  test('a page position reads as a Roman numeral', () => {
    expect(romanNumeral(1)).toBe('I');
    expect(romanNumeral(4)).toBe('IIII');
    expect(romanNumeral(9)).toBe('VIIII');
    expect(romanNumeral(14)).toBe('XIIII');
    expect(romanNumeral(40)).toBe('XXXX');
    // Not a number, not a numeral: leave it alone rather than print nonsense.
    expect(romanNumeral(0)).toBe('0');
  });

  test('the values are unique, which a select requires', () => {
    const nav = modulePageNavigation(8, 40, 5);
    expect(new Set(nav.map((n) => n.page)).size).toBe(nav.length);
  });
});
