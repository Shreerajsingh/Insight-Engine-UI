import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { formatValue } from '../../lib/format';
import { foldSlices, seriesColor } from '../../lib/palette';
import type { Chart } from '../../types';

/**
 * Part-to-whole, at a glance and no further.
 *
 * A pie answers "roughly how is this split" and nothing else — comparing two close slices
 * is what a bar chart is for. Slices past the sixth are folded into one "Other" rather than
 * given a ninth colour, and the legend is a labelled list with the value on it, because
 * reading a pie by area alone is a guess.
 */
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
              // A donut: the hole removes the centre, where a pie's angles are hardest to
              // judge and its labels collide.
              innerRadius="52%"
              outerRadius="82%"
              // The 2px ring in the surface colour is what separates adjacent slices.
              stroke="var(--surface-1)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {/* Keyed by position, not by name: two slices can carry the same label — the same
                  topic counted under two ids — and a duplicate key drops one of them. */}
              {rows.map((_, index) => (
                <Cell key={index} fill={seriesColor(index)} />
              ))}
            </Pie>
            <Tooltip content={(props) => <ChartTooltip {...props} series={chart.series} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Direct labels, which is also the relief for the lighter slots' low contrast. */}
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
