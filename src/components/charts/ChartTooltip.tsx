import { formatValue } from '../../lib/format';
import type { Cell, SeriesSpec } from '../../types';

interface TooltipItem {

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

const toCell = (value: unknown): Cell =>
  typeof value === 'number' || typeof value === 'string' ? value : null;

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
