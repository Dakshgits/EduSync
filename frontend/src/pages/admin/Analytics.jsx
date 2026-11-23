import useAsync from '../../hooks/useAsync';
import { analyticsApi } from '../../services';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import { AsyncBoundary } from '../../components/common/Feedback';
import ProgressBar from '../../components/common/ProgressBar';
import { AssignmentBars, GroupProgressBars, StatusDonut } from '../../components/charts/Charts';
import { fmtDate } from '../../utils/format';

export default function Analytics() {
  const state = useAsync(async () => {
    const [overview, assignments, groups] = await Promise.all([analyticsApi.admin(), analyticsApi.assignments(), analyticsApi.groups()]);
    return { overview, assignments, groups };
  }, []);
  const cols = [
    { key: 'title', header: 'Assignment', render: (a) => <div className="min-w-[160px]"><p className="font-medium text-ink">{a.title}</p><p className="text-xs text-slate-500">Due {fmtDate(a.due_date)}</p></div> },
    { key: 'total', header: 'Groups', render: (a) => a.total },
    { key: 'submitted', header: 'Fully', render: (a) => a.submitted },
    { key: 'partial', header: 'Partial', render: (a) => a.partial },
    { key: 'pending', header: 'None', render: (a) => a.pending },
    { key: 'members', header: 'Member confirmations', render: (a) => `${a.confirmed_members}/${a.total_members}` },
    { key: 'pct', header: 'Completion', render: (a) => <div className="flex min-w-[130px] items-center gap-2"><ProgressBar className="flex-1" value={a.completion_percent} /><span className="w-9 text-right text-xs">{a.completion_percent}%</span></div> },
  ];
  return (
    <>
      <PageHeader title="Analytics" subtitle="Calculated live from submission records in the database." />
      <AsyncBoundary state={state}>
        {({ overview: o, assignments, groups }) => (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-5">
              <section className="card p-5 lg:col-span-2"><h2 className="text-base font-semibold">Submitted vs pending groups</h2><p className="mt-1 text-sm text-slate-500">Overall completion: <span className="font-medium text-ink">{o.submissions.completion_percent}%</span></p><StatusDonut submitted={o.submissions.submitted} partial={o.submissions.partial} pending={o.submissions.pending} /></section>
              <section className="card p-5 lg:col-span-3"><h2 className="text-base font-semibold">Assignment-wise submissions</h2><p className="mt-1 text-sm text-slate-500">Groups by confirmation status for each assignment.</p><AssignmentBars rows={assignments} /></section>
            </div>
            <section className="card p-5"><h2 className="text-base font-semibold">Group-wise progress</h2><p className="mt-1 text-sm text-slate-500">Average share of members who confirmed, across the group’s assignments.</p><GroupProgressBars rows={groups} /></section>
            <section><h2 className="mb-3 text-base font-semibold">Assignment breakdown</h2><DataTable columns={cols} rows={assignments} /></section>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
