import { useState } from 'react';
import { CategoryChart } from './charts/CategoryChart';
import { DataTable } from './charts/DataTable';
import { PieView } from './charts/PieView';
import { StatTile } from './charts/StatTile';
import { overflowsPalette } from '../lib/palette';
import type { Chart, SeriesSpec } from '../types';

export function ChartCard({ chart, expanded = false }: { chart: Chart; expanded?: boolean }) {
  /* The table toggle is an accessibility requirement, not a convenience: three palette slots sit
     under 3:1 against the light surface, and the table is what makes that legal. */
  const [asTable, setAsTable] = useState(false);

  const isTable = chart.type === 'table';
  const isStat = chart.type === 'stat';
  const showToggle = !isTable && !isStat;
  const showingTable = isTable || asTable;

  const height = plotHeight(chart, expanded);

  return (
    <figure className={`card${isWide(chart) && !expanded ? ' card--wide' : ''}`}>
      <div className="card__head">
        <div style={{ minWidth: 0 }}>
          <figcaption className="card__title">{chart.title}</figcaption>
          {chart.subtitle && <p className="card__subtitle">{chart.subtitle}</p>}
        </div>
        {showToggle && (
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setAsTable((current) => !current)}
            aria-pressed={asTable}
          >
            {asTable ? 'Chart' : 'Table'}
          </button>
        )}
      </div>

      {isStat ? (
        <StatTile chart={chart} />
      ) : showingTable ? (
        <DataTable columns={tableColumns(chart)} rows={chart.data} />
      ) : chart.type === 'pie' ? (
        <PieView chart={chart} height={height} />
      ) : (
        <CategoryChart chart={chart} height={height} />
      )}

      {overflowsPalette(chart.series.length) && !showingTable && (
        <p className="card__foot">
          {chart.series.length} series is past what {8} distinguishable colours can carry —
          the table view is the reliable read.
        </p>
      )}

      {chart.sourceQueryIds.length > 0 && (
        <p className="card__foot">from {chart.sourceQueryIds.join(', ')}</p>
      )}
    </figure>
  );
}

function tableColumns(chart: Chart): SeriesSpec[] {
  if (chart.columns.length > 0) return chart.columns;

  const category: SeriesSpec[] = chart.xKey
    ? [{ key: chart.xKey, label: chart.xLabel ?? chart.xKey, format: 'TEXT' }]
    : [];

  return [...category, ...chart.series];
}

function plotHeight(chart: Chart, expanded: boolean): number {
  if (chart.horizontal && chart.type === 'bar') {
    const perBar = expanded ? 40 : 34;
    return Math.max(expanded ? 320 : 200, Math.min(720, chart.data.length * perBar + 60));
  }
  if (expanded) return 460;
  return chart.data.length > 12 ? 300 : 260;
}

const isWide = (chart: Chart) =>
  chart.type === 'table' || chart.data.length > 10 || chart.series.length > 4;
