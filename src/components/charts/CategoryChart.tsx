import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartLegend, ChartTooltip } from './ChartTooltip';
import { formatTick } from '../../lib/format';
import { seriesColor } from '../../lib/palette';
import type { Cell, Chart } from '../../types';

/**
 * bar, line and area — the three forms that share an x axis, and therefore share all of
 * their chrome.
 *
 * The chrome is the deliberate part: hairline gridlines on the value axis only, no dashes,
 * no axis lines, thin marks with rounded data-ends, and ticks on the muted ink token. The
 * defaults Recharts ships are the opposite of each of those, so most of what follows is
 * turning something off.
 */
export function CategoryChart({ chart, height }: { chart: Chart; height: number }) {
  const colors = chart.series.map((_, index) => seriesColor(index));
  const valueFormat = chart.series[0]?.format ?? 'NUMBER';
  const xKey = chart.xKey ?? '';

  // Counts are whole things: a "1.5 objections" tick is not a smaller tick, it is a wrong one.
  const allowDecimals = chart.data.some((row) =>
    chart.series.some((spec) => {
      const value = row[spec.key];
      return typeof value === 'number' && !Number.isInteger(value);
    }),
  );

  // A duration axis that reaches a minute is clock-formatted throughout, ticks included.
  const asClock =
    valueFormat === 'DURATION_MS' &&
    chart.data.some((row) =>
      chart.series.some((spec) => {
        const value = row[spec.key];
        return typeof value === 'number' && value >= 60_000;
      }),
    );

  const tick = (value: Cell) => formatTick(value, valueFormat, asClock);

  const grid = <CartesianGrid stroke="var(--grid)" strokeDasharray="0" vertical={false} />;
  const tooltip = (
    <Tooltip
      // The crosshair, kept to a hairline. Recharts' default cursor is a wide grey block.
      cursor={{ stroke: 'var(--axis)', strokeWidth: 1, fill: 'var(--accent-wash)' }}
      content={(props) => <ChartTooltip {...props} series={chart.series} />}
    />
  );

  const axisProps = {
    stroke: 'var(--axis)',
    tickLine: false,
    tick: { fill: 'var(--text-muted)', fontSize: 11 },
  } as const;

  return (
    <>
      <div className="card__plot" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === 'bar' ? (
            <BarChart
              data={chart.data}
              layout={chart.horizontal ? 'vertical' : 'horizontal'}
              margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
              barCategoryGap={chart.horizontal ? '28%' : '22%'}
            >
              <CartesianGrid
                stroke="var(--grid)"
                strokeDasharray="0"
                vertical={chart.horizontal}
                horizontal={!chart.horizontal}
              />
              {chart.horizontal ? (
                <>
                  <XAxis
                    type="number"
                    {...axisProps}
                    allowDecimals={allowDecimals}
                    tickFormatter={tick}
                  />
                  {/* Long category names are why this chart is horizontal — give them room. */}
                  <YAxis type="category" dataKey={xKey} width={132} {...axisProps} />
                </>
              ) : (
                <>
                  <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" />
                  <YAxis
                    {...axisProps}
                    allowDecimals={allowDecimals}
                    tickFormatter={tick}
                  />
                </>
              )}
              {tooltip}
              {chart.series.map((spec, index) => (
                <Bar
                  key={spec.key}
                  dataKey={spec.key}
                  name={spec.label}
                  fill={colors[index]}
                  stackId={chart.stacked ? 'stack' : undefined}
                  // Only the outermost segment gets rounded ends: rounding every segment
                  // of a stack puts a notch at every join and reads as separate bars.
                  radius={cornerRadius(chart, index)}
                  // A hairline in the surface colour is the gap between stacked segments.
                  stroke={chart.stacked ? 'var(--surface-1)' : undefined}
                  strokeWidth={chart.stacked ? 1 : 0}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          ) : chart.type === 'line' ? (
            <LineChart data={chart.data} margin={{ top: 6, right: 14, bottom: 4, left: 4 }}>
              {grid}
              <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" />
              <YAxis
                {...axisProps}
                allowDecimals={allowDecimals}
                tickFormatter={tick}
              />
              {tooltip}
              {chart.series.map((spec, index) => (
                <Line
                  key={spec.key}
                  type="monotone"
                  dataKey={spec.key}
                  name={spec.label}
                  stroke={colors[index]}
                  strokeWidth={2}
                  // 8px across: the smallest marker that stays a hit target.
                  dot={{ r: 4, fill: colors[index], stroke: 'var(--surface-1)', strokeWidth: 1 }}
                  activeDot={{ r: 5, stroke: 'var(--surface-1)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          ) : (
            <AreaChart data={chart.data} margin={{ top: 6, right: 14, bottom: 4, left: 4 }}>
              {grid}
              <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" />
              <YAxis
                {...axisProps}
                allowDecimals={allowDecimals}
                tickFormatter={tick}
              />
              {tooltip}
              {chart.series.map((spec, index) => (
                <Area
                  key={spec.key}
                  type="monotone"
                  dataKey={spec.key}
                  name={spec.label}
                  stackId={chart.stacked ? 'stack' : undefined}
                  stroke={colors[index]}
                  strokeWidth={2}
                  fill={colors[index]}
                  // The fill locates the series; the stroke is what carries it.
                  fillOpacity={0.16}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
      <ChartLegend series={chart.series} colors={colors} />
    </>
  );
}

/** Rounded ends on the data end only, so bars stay anchored to the baseline. */
function cornerRadius(chart: Chart, index: number): [number, number, number, number] | number {
  const outermost = index === chart.series.length - 1;
  if (chart.stacked && !outermost) return 0;

  return chart.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];
}
