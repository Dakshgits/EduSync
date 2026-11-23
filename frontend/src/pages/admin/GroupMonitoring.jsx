import { useState } from 'react';
import { Users } from 'lucide-react';
import useAsync from '../../hooks/useAsync';
import { groupApi } from '../../services';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import { AsyncBoundary, EmptyState, Skeleton } from '../../components/common/Feedback';
import { Badge, RoleBadge, StatusBadge } from '../../components/common/Badges';
import ProgressBar from '../../components/common/ProgressBar';
import Modal from '../../components/modals/Modal';
import InspectSubmissionModal from '../../components/dashboard/InspectSubmissionModal';
import { fmtDate } from '../../utils/format';

function GroupDetail({ id, onClose, onInspect }) {
  const state = useAsync(() => (id ? groupApi.get(id) : Promise.resolve(null)), [id]);
  return (
    <Modal open={!!id} onClose={onClose} title={state.data?.group_name || 'Group'} size="xl">
      <AsyncBoundary state={state} skeleton={<Skeleton className="h-48 w-full" />}>
        {(g) => g && (
          <div className="space-y-6">
            <section>
              <h3 className="mb-2 text-sm font-semibold">Members ({g.members.length})</h3>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {g.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-2.5"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{m.full_name}</p><p className="truncate text-xs text-slate-500">{m.student_id} · {m.email}</p></div><RoleBadge role={m.member_role} /></li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold">Assignments</h3>
              {g.submissions.length === 0 ? <p className="text-sm text-slate-500">No assignments for this group yet.</p> : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {g.submissions.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1 basis-48"><p className="truncate text-sm font-medium">{s.assignment_title}</p><p className="text-xs text-slate-500">{s.confirmed_members}/{s.total_members} confirmed</p></div>
                      <ProgressBar className="w-28" value={s.percent} /><StatusBadge status={s.status} />
                      <button className="btn btn-secondary btn-sm" onClick={() => onInspect(s.id)}>Records</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </AsyncBoundary>
    </Modal>
  );
}

export default function GroupMonitoring() {
  const state = useAsync(() => groupApi.list(), []);
  const [open, setOpen] = useState(null);
  const [inspect, setInspect] = useState(null);
  const cols = [
    { key: 'name', header: 'Group', render: (g) => <div className="min-w-[140px]"><p className="font-medium text-ink">{g.group_name}</p><p className="text-xs text-slate-500">Created {fmtDate(g.created_at)}</p></div> },
    { key: 'leader', header: 'Leader', render: (g) => g.leader_name || '—' },
    { key: 'members', header: 'Members', render: (g) => g.member_count },
    { key: 'assigned', header: 'Assignments', render: (g) => g.assigned },
    { key: 'result', header: 'Full / partial / none', render: (g) => <span className="whitespace-nowrap"><Badge tone="emerald">{g.submitted}</Badge> <Badge tone="amber">{g.partial}</Badge> <Badge tone="slate">{g.pending}</Badge></span> },
    { key: 'progress', header: 'Average progress', render: (g) => <div className="flex min-w-[130px] items-center gap-2"><ProgressBar className="flex-1" value={g.avg_progress} /><span className="w-9 text-right text-xs text-slate-600">{g.avg_progress}%</span></div> },
  ];
  return (
    <>
      <PageHeader title="Groups" subtitle="Select a group to see its members and submission records." />
      <AsyncBoundary state={state}>
        {(rows) => <DataTable columns={cols} rows={rows} onRowClick={(g) => setOpen(g.id)} empty={<EmptyState icon={Users} title="No groups yet" message="Groups appear here when students create them." />} />}
      </AsyncBoundary>
      <GroupDetail id={open} onClose={() => setOpen(null)} onInspect={setInspect} />
      <InspectSubmissionModal submissionId={inspect} onClose={() => setInspect(null)} />
    </>
  );
}
