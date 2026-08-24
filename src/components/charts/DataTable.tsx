import { formatValue } from '../../lib/format';
import type { Cell, SeriesSpec } from '../../types';

export function DataTable({
  columns,
  rows,
}: {
  columns: SeriesSpec[];
  rows: Record<string, Cell>[];
}) {
  return (
    <div className="table__scroll">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={isNumeric(column) ? 'num' : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key} className={isNumeric(column) ? 'num' : undefined}>
                  {formatValue(row[column.key] ?? null, column.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const isNumeric = (column: SeriesSpec) => column.format !== 'TEXT';
