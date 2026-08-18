import { formatValue } from '../../lib/format';
import type { Cell, SeriesSpec } from '../../types';

/**
 * The part of Recharts' tooltip payload this uses.
 *
 * Declared here rather than imported: the library's own props are generic over the value and
 * name types and only line up with a `content` callback when both generics are inferred, so
 * naming the three fields we read is both shorter and stable across versions.
 */
interface TooltipItem {
  /** Unknown because Recharts allows an accessor function here; we only ever pass a key. */
  dataKey?: unknown;
  name?: string | number;
  value?: unknown;
  color?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: readonly TooltipItem[];
  label?: unknown;
  series: SeriesSpec[];
  labelFormat?: (value: unknown) => string;
}

/**
 * The hover layer, written out rather than themed.
 *
 * Recharts' default tooltip carries its own light background and inline colours, which
 * means it stays white in dark mode and prints raw values — `424000` where the axis says
 * `7:04`. Owning the markup is what puts the value through the series' own formatter and
 * the surface on a token.
 *
 * The swatch carries identity; the text stays on text tokens. A value in the series colour
 * would be a second, weaker way of saying what the swatch already says, at some cost to
 * legibility.
 */
export function ChartTooltip({ active, payload, label, series, labelFormat }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="tooltip">
      {label !== undefined && label !== null && (
        <div className="tooltip__label">{labelFormat ? labelFormat(label) : String(label)}</div>
      )}
      {payload.map((item) => {
        const spec = series.find((candidate) => candidate.key === String(item.dataKey));
        return (
          <div className="tooltip__row" key={String(item.dataKey) + String(item.name)}>
            <span className="tooltip__swatch" style={{ background: String(item.color) }} />
            <span>{spec?.label ?? item.name}</span>
            <span className="tooltip__value">
              {formatValue(toCell(item.value), spec?.format ?? 'NUMBER')}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** A payload value is typed as unknown; only a string or a number can be printed. */
const toCell = (value: unknown): Cell =>
  typeof value === 'number' || typeof value === 'string' ? value : null;

/**
 * The legend, in HTML below the plot.
 *
 * Present whenever there are two or more series and absent for one — a single-series chart
 * is named by its title, and a legend box repeating that name is furniture. Rendered as
 * HTML rather than through Recharts so it wraps, stays on text tokens, and does not eat
 * plot height.
 */
export function ChartLegend({ series, colors }: { series: SeriesSpec[]; colors: string[] }) {
  if (series.length < 2) return null;

  return (
    <div className="legend">
      {series.map((spec, index) => (
        <span className="legend__item" key={spec.key}>
          <span className="legend__swatch" style={{ background: colors[index] }} />
          {spec.label}
        </span>
      ))}
    </div>
  );
}
