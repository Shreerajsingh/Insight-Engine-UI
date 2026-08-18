import { formatValue } from '../../lib/format';
import type { Chart } from '../../types';

/**
 * One number, at the size a headline deserves.
 *
 * This is the form a single value takes. A one-bar bar chart says the same thing with an
 * axis, a gridline and a legend attached, all of which exist to support comparison — and
 * there is nothing here to compare it to.
 */
export function StatTile({ chart }: { chart: Chart }) {
  const format = chart.series[0]?.format ?? 'NUMBER';

  return (
    <div className="stat">
      <div className="stat__value">{formatValue(chart.value ?? null, format)}</div>
      {chart.caption && <div className="stat__caption">{chart.caption}</div>}
    </div>
  );
}
