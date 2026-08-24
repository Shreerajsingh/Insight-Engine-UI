import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { formatValue } from '../../lib/format';
import { foldSlices, seriesColor } from '../../lib/palette';
import type { Chart } from '../../types';

export function PieView({ chart, height }: { chart: Chart; height: number }) {
  const nameKey = chart.xKey ?? '';
  const spec = chart.series[0];
  if (!spec) return null;

  const { rows, folded } = foldSlices(chart.data, nameKey, spec.key);

  return (
    <>
      <div className="card__plot" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={rows}
              dataKey={spec.key}
              nameKey={nameKey}

              innerRadius="52%"
              outerRadius="82%"

              stroke="var(--surface-1)"
              strokeWidth={2}
              isAnimationActive={false}
            >

              {rows.map((_, index) => (
                <Cell key={index} fill={seriesColor(index)} />
              ))}
            </Pie>
            <Tooltip content={(props) => <ChartTooltip {...props} series={chart.series} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="legend">
        {rows.map((row, index) => (
          <span className="legend__item" key={index}>
            <span className="legend__swatch" style={{ background: seriesColor(index) }} />
            {String(row[nameKey] ?? '—')}
            <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatValue(row[spec.key] as number, spec.format)}
            </span>
          </span>
        ))}
      </div>

      {folded > 0 && (
        <p className="card__foot">
          {folded} smaller slices grouped as “Other” — the table view lists them.
        </p>
      )}
    </>
  );
}
