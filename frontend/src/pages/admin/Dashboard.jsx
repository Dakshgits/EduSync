import { Link } from 'react-router-dom';
import { CalendarClock, CircleDashed, ClipboardList, GraduationCap, History, PieChart, Users, CheckCheck, Timer } from 'lucide-react';
import useAsync from '../../hooks/useAsync';
import { analyticsApi } from '../../services';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import { AsyncBoundary } from '../../components/common/Feedback';
import { Badge } from '../../components/common/Badges';
import ProgressBar from '../../components/common/ProgressBar';
import { StatusDonut, GroupProgressBars } from '../../components/charts/Charts';
import { dueLabel, fmtDate, fmtDateTime } from '../../utils/format';

export default function AdminDashboard() {
  const state = useAsync(async () => {
    const [overview, groups] = await Promise.all([analyticsApi.admin(), analyticsApi.groups()]);
    return { overview, groups };
  }, []);
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Submission status across every assignment and group."
        actions={<Link to="/admin/assignments/new" className="btn btn-primary">New assignment</Link>} />
      <AsyncBoundary state={state}>
        {({ overview: o, groups }) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DashboardCard icon={GraduationCap} label="Total students" value={o.totals.students} tone="slate" hint={`${o.totals.grouped_students} in groups`} />
              <DashboardCard icon={Users} label="Total groups" value={o.totals.groups} />
              <DashboardCard icon={ClipboardList} label="Total assignments" value={o.totals.assignments} tone="slate" />
              <DashboardCard icon={CheckCheck} label="Submitted groups" value={o.submissions.submitted} tone="emerald" hint="Every member confirmed (per assignment)" />
              <DashboardCard icon={Timer} label="Partially submitted" value={o.submissions.partial} tone="amber" hint="Some members confirmed" />
              <DashboardCard icon={CircleDashed} label="Pending groups" value={o.submissions.pending} tone="rose" hint="No confirmations yet" />
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <section className="card p-5 lg:col-span-2" aria-labelledby="c1">
                <h2 id="c1" className="flex items-center gap-2 text-base font-semibold"><PieChart className="h-[18px] w-[18px] text-slate-400" />Submission completion</h2>
                <p className="mt-1 text-sm text-slate-500">{o.submissions.completion_percent}% of assignment–group pairs fully confirmed · {o.submissions.member_confirmation_percent}% of individual member confirmations received</p>
                <StatusDonut submitted={o.submissions.submitted} partial={o.submissions.partial} pending={o.submissions.pending} />
              </section>
              <section className="card p-5 lg:col-span-3" aria-labelledby="c2">
                <h2 id="c2" className="text-base font-semibold">Group performance</h2>
                <p className="mt-1 text-sm text-slate-500">Average member-confirmation progress across each group’s assignments.</p>
                <GroupProgressBars rows={groups} />
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="card" aria-labelledby="r1">
                <h2 id="r1" className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-base font-semibold"><History className="h-[18px] w-[18px] text-slate-400" />Recent activity</h2>
                {o.recent_activity.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">No confirmations yet.</p> : (
                  <ul className="divide-y divide-slate-100">
                    {o.recent_activity.map((r) => (
                      <li key={r.id} className="px-5 py-3">
                        <p className="text-sm"><span className="font-medium">{r.student_name}</span> <span className="text-slate-500">({r.group_name})</span> confirmed <Link className="font-medium text-primary-700 hover:underline" to={`/admin/assignments/${r.assignment_id}`}>{r.assignment_title}</Link></p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">{fmtDateTime(r.confirmed_at)}{r.late && <Badge tone="rose">Late</Badge>}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="card" aria-labelledby="r2">
                <h2 id="r2" className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-base font-semibold"><CalendarClock className="h-[18px] w-[18px] text-slate-400" />Upcoming deadlines</h2>
                {o.upcoming_deadlines.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">No upcoming deadlines.</p> : (
                  <ul className="divide-y divide-slate-100">
                    {o.upcoming_deadlines.map((d) => (
                      <li key={d.id}>
                        <Link to={`/admin/assignments/${d.id}`} className="block px-5 py-3 hover:bg-slate-50">
                          <div className="flex items-baseline justify-between gap-3"><p className="truncate text-sm font-medium">{d.title}</p><p className="shrink-0 text-xs text-slate-500">{fmtDate(d.due_date)} · {dueLabel(d.due_date)}</p></div>
                          <div className="mt-2 flex items-center gap-3"><ProgressBar className="flex-1" value={d.total_groups ? (100 * d.submitted_groups) / d.total_groups : 0} /><span className="text-xs text-slate-500">{d.submitted_groups}/{d.total_groups} groups</span></div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
