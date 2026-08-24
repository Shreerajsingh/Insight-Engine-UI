import { formatValue } from '../../lib/format';
import type { Chart } from '../../types';

export function StatTile({ chart }: { chart: Chart }) {
  const format = chart.series[0]?.format ?? 'NUMBER';

  return (
    <div className="stat">
      <div className="stat__value">{formatValue(chart.value ?? null, format)}</div>
      {chart.caption && <div className="stat__caption">{chart.caption}</div>}
    </div>
  );
}
