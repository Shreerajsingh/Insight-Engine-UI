import type { Cell, Chart, QueryBundle, SeriesSpec } from '../types';

export function tablesFromBundle(bundle: QueryBundle): Chart[] {
  return bundle.sql
    .filter((result) => result.error === null && result.rowCount > 0)
    .map((result) => {
      const rows = result.rows as Record<string, Cell>[];

      return {
        id: result.id,
        type: 'table' as const,
        title: result.purpose,
        subtitle: result.truncated
          ? `Showing ${rows.length} rows — the row cap cut this short, so it is a sample.`
          : null,
        sourceQueryIds: [result.id],
        data: rows,
        xKey: null,
        xLabel: null,
        yLabel: null,
        series: [],
        stacked: false,
        horizontal: false,
        columns: inferColumns(rows),
        value: null,
        caption: null,
      };
    });
}

function inferColumns(rows: Record<string, Cell>[]): SeriesSpec[] {
  const first = rows[0] ?? {};

  return Object.keys(first).map((key) => ({
    key,
    label: humanize(key),
    format: inferFormat(key, rows),
  }));
}

function inferFormat(key: string, rows: Record<string, Cell>[]): SeriesSpec['format'] {
  if (/_ms$/.test(key)) return 'DURATION_MS';
  if (/percentage|_pct$/.test(key)) return 'PERCENT';

  const sample = rows.find((row) => row[key] !== null)?.[key];
  return typeof sample === 'number' ? 'NUMBER' : 'TEXT';
}

const humanize = (key: string) =>
  key.replace(/_/g, ' ').replace(/^./, (character) => character.toUpperCase());
