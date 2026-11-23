import { Eye } from 'lucide-react';
import DataTable from '../common/DataTable';
import { Badge, StatusBadge } from '../common/Badges';
import ProgressBar from '../common/ProgressBar';
import { fmtDate, fmtDateTime } from '../../utils/format';

/** Group x assignment submission rows for professors. Inspect opens the member-level records. */
export default function SubmissionsTable({ rows, showAssignment = true, onInspect, empty }) {
  const columns = [
    ...(showAssignment ? [{ key: 'assignment', header: 'Assignment', render: (r) => <div className="min-w-[150px]"><p className="font-medium text-ink">{r.assignment_title}</p><p className="text-xs text-slate-500">Due {fmtDate(r.due_date)}</p></div> }] : []),
    { key: 'group', header: 'Group', render: (r) => <span className="whitespace-nowrap font-medium">{r.group_name}</span> },
    { key: 'members', header: 'Members', render: (r) => r.total_members },
    { key: 'confirmed', header: 'Confirmed', render: (r) => r.confirmed_members },
    { key: 'pendingM', header: 'Pending', render: (r) => r.total_members - r.confirmed_members },
    { key: 'progress', header: 'Progress', render: (r) => <div className="flex min-w-[130px] items-center gap-2"><ProgressBar className="flex-1" value={r.percent} segments={r.total_members <= 8 ? Array.from({ length: r.total_members }, (_, i) => i < r.confirmed_members) : undefined} /><span className="w-9 text-right text-xs text-slate-600">{r.percent}%</span></div> },
    { key: 'status', header: 'Status', render: (r) => <div className="flex flex-wrap gap-1"><StatusBadge status={r.status} />{r.is_overdue && <Badge tone="rose">Overdue</Badge>}</div> },
    { key: 'last', header: 'Last confirmed', render: (r) => <span className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(r.last_confirmed_at)}</span> },
    { key: 'act', header: <span className="sr-only">Inspect</span>, render: (r) => <button className="btn btn-secondary btn-sm" onClick={() => onInspect(r.id)} aria-label={`Inspect ${r.group_name} for ${r.assignment_title}`}><Eye className="h-3.5 w-3.5" />Inspect</button> },
  ];
  return <DataTable columns={columns} rows={rows} empty={empty} />;
}
