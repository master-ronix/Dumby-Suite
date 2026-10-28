/**
 * Paging helpers a module page needs to build its own slides.
 *
 * These lived in `apps/main/src/rendering/page-data.ts`, which a module cannot import — so they are
 * here, in the package a module already depends on, and the host re-exports them from where it used
 * to declare them. One implementation, two callers.
 */

/** 1 -> I, 4 -> IV. Non-finite or non-positive values are printed as they are. */
export function romanNumeral(value: number): string {
  if (!Number.isFinite(value) || value < 1) return String(value);
  const table: Array<[number, string]> = [
    [1000, 'M'],
    [500, 'D'],
    [100, 'C'],
    [50, 'L'],
    [10, 'X'],
    [5, 'V'],
    [1, 'I'],
  ];
  let remaining = Math.floor(value);
  let out = '';
  for (const [size, glyph] of table) {
    while (remaining >= size) {
      out += glyph;
      remaining -= size;
    }
  }
  return out;
}

export interface PageSlide {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly page: number;
}

/**
 * The DIAL's entries for a surface that pages MODULES directly: one option per slide, naming the
 * range it holds. An option per module would offer targets that do not exist.
 *
 * Page 0 is Home; the slides cover 1..pageTotal-1, numbered from I — numbering the first listing page
 * as a slide made Home and "Slide I" the same destination with the same modules on it.
 */
export function modulePageNavigation(
  pageTotal: number,
  total: number,
  pageSize: number,
): readonly PageSlide[] {
  return Array.from({ length: Math.max(0, pageTotal - 1) }, (_, offset) => {
    const index = offset + 1;
    const first = index * pageSize + 1;
    const last = Math.min((index + 1) * pageSize, total);
    return {
      id: `page-${index + 1}`,
      name: `Slide ${romanNumeral(offset + 1)}`,
      description: first === last ? `Module ${first}` : `Modules ${first}–${last}`,
      page: index,
    };
  });
}
