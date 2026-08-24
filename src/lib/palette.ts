const SLOTS = 8;

export const seriesColor = (index: number): string => `var(--series-${(index % SLOTS) + 1})`;

export const overflowsPalette = (count: number): boolean => count > SLOTS;

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
