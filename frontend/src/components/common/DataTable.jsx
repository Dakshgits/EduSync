import { EmptyState } from './Feedback';

/** columns: [{ key, header, render?(row), className? }]. Scrolls horizontally on small screens. */
export default function DataTable({ columns, rows, rowKey = 'id', onRowClick, empty }) {
  if (!rows || rows.length === 0) return empty || <EmptyState title="Nothing here yet" />;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/70">
            <tr>{columns.map((c) => <th key={c.key} scope="col" className="th">{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer hover:bg-slate-50/70' : ''}
              >
                {columns.map((c) => <td key={c.key} className={`td ${c.className || ''}`}>{c.render ? c.render(row) : row[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
