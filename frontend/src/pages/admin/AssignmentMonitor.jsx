import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CheckCheck, CircleDashed, ExternalLink, Pencil, Timer, Users } from 'lucide-react';
import useAsync from '../../hooks/useAsync';
import { assignmentApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { AsyncBoundary, EmptyState } from '../../components/common/Feedback';
import { Badge } from '../../components/common/Badges';
import DashboardCard from '../../components/common/DashboardCard';
import SubmissionsTable from '../../components/dashboard/SubmissionsTable';
import InspectSubmissionModal from '../../components/dashboard/InspectSubmissionModal';
import { dueLabel, fmtDateTime } from '../../utils/format';

export default function AssignmentMonitor() {
  const { id } = useParams();
  const { user } = useAuth();
  const state = useAsync(() => assignmentApi.get(id), [id]);
  const [status, setStatus] = useState('');
  const [inspect, setInspect] = useState(null);

  return (
    <>
      <Link to="/admin/assignments" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink"><ArrowLeft className="h-4 w-4" />All assignments</Link>
      <AsyncBoundary state={state}>
        {(a) => {
          const rows = a.submissions.filter((s) => !status || s.status === status);
          return (
            <div className="space-y-6">
              <section className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold tracking-tight">{a.title}</h1>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />Due {fmtDateTime(a.due_date)} ({dueLabel(a.due_date)})</span>
                      <Badge tone={a.target_type === 'ALL' ? 'indigo' : 'slate'}><Users className="h-3 w-3" />{a.target_type === 'ALL' ? 'All students' : `${a.group_ids.length} selected group${a.group_ids.length === 1 ? '' : 's'}`}</Badge>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a href={a.onedrive_link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink className="h-3.5 w-3.5" />OneDrive link</a>
                    {a.created_by === user.id && <Link to={`/admin/assignments/${a.id}/edit`} className="btn btn-secondary btn-sm"><Pencil className="h-3.5 w-3.5" />Edit</Link>}
                  </div>
                </div>
                {a.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.description}</p>}
              </section>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DashboardCard icon={Users} label="Groups assigned" value={a.total_groups} tone="slate" />
                <DashboardCard icon={CheckCheck} label="Fully confirmed" value={a.submitted_groups} tone="emerald" />
                <DashboardCard icon={Timer} label="Partially confirmed" value={a.partial_groups} tone="amber" />
                <DashboardCard icon={CircleDashed} label="No confirmations" value={a.pending_groups} tone="rose" />
              </div>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold">Group submissions</h2>
                  <select aria-label="Filter by status" className="input w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All statuses</option><option value="SUBMITTED">Fully confirmed</option><option value="PARTIAL">Partially confirmed</option><option value="PENDING">No confirmations</option>
                  </select>
                </div>
                <SubmissionsTable rows={rows} showAssignment={false} onInspect={setInspect}
                  empty={<EmptyState title="No groups to show" message={a.submissions.length ? 'No groups match this status.' : 'No groups have been assigned this work yet.'} />} />
              </section>
              <InspectSubmissionModal submissionId={inspect} onClose={() => setInspect(null)} />
            </div>
          );
        }}
      </AsyncBoundary>
    </>
  );
}
