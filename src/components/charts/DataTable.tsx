import { formatValue } from '../../lib/format';
import type { Cell, SeriesSpec } from '../../types';

/**
 * The table form, and the table *view* of every other form.
 *
 * Both jobs are the same component. As a form it is what rows meant to be read deserve —
 * quotes and descriptions are not a chart. As a view it is the accessibility floor: every
 * chart can be switched to this, which is what makes the lighter palette slots legal on the
 * light surface and what makes any chart here readable without colour at all.
 */
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

/** Numbers are right-aligned and tabular so digits line up down the column. */
const isNumeric = (column: SeriesSpec) => column.format !== 'TEXT';
