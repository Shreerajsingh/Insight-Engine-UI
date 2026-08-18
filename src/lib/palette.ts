/**
 * The categorical palette, by slot.
 *
 * CSS custom properties rather than hex: an SVG `fill` resolves a `var()` like any other
 * property, so one token list in theme.css themes the charts in both modes and there is no
 * second copy of the palette to keep in step.
 *
 * A slot is assigned by the series' position and never by its rank, so filtering a series
 * out never repaints the ones that remain. There is no ninth slot on purpose: a generated
 * hue is indistinguishable from an existing one under colour-vision deficiency, which is
 * what `foldSeries` is for.
 */
const SLOTS = 8;

export const seriesColor = (index: number): string => `var(--series-${(index % SLOTS) + 1})`;

/** True when a chart has more series than the palette can tell apart. */
export const overflowsPalette = (count: number): boolean => count > SLOTS;

/**
 * Slices past the sixth, folded into one "Other".
 *
 * A pie is only readable at a glance with a handful of slices, and the alternative to
 * folding is inventing colours. The tail is summed rather than dropped so the whole still
 * adds up to the whole.
 */
export function foldSlices<T extends Record<string, unknown>>(
  rows: T[],
  nameKey: string,
  valueKey: string,
  keep = 6,
): { rows: Record<string, unknown>[]; folded: number } {
  if (rows.length <= keep) return { rows, folded: 0 };

  const head = rows.slice(0, keep - 1);
  const tail = rows.slice(keep - 1);
  const total = tail.reduce((sum, row) => {
    const value = row[valueKey];
    return sum + (typeof value === 'number' ? value : 0);
  }, 0);

  return {
    rows: [...head, { [nameKey]: `Other (${tail.length})`, [valueKey]: total }],
    folded: tail.length,
  };
}
