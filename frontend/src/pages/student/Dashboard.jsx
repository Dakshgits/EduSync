import { Link } from 'react-router-dom';
import { CalendarClock, CheckCheck, ClipboardList, Hourglass, Percent, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useAsync from '../../hooks/useAsync';
import { analyticsApi, assignmentApi, groupApi } from '../../services';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import ProgressBar from '../../components/common/ProgressBar';
import { AsyncBoundary, EmptyState } from '../../components/common/Feedback';
import { StudentStateBadge } from '../../components/common/Badges';
import { dueLabel, fmtDate, initials, studentState } from '../../utils/format';

export default function StudentDashboard() {
  const { user } = useAuth();
  const state = useAsync(async () => {
    const [stats, assignments, group] = await Promise.all([analyticsApi.student(), assignmentApi.list(), groupApi.mine()]);
    return { stats, assignments, group };
  }, []);

  return (
    <>
      <PageHeader title={`Welcome back, ${user.full_name.split(' ')[0]}`} subtitle="Here is where your group stands." />
      <AsyncBoundary state={state}>
        {({ stats, assignments, group }) => {
          const upcoming = assignments.filter((a) => a.status !== 'SUBMITTED' && new Date(a.due_date) >= new Date()).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5);
          const overdue = assignments.filter((a) => a.is_overdue);
          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <DashboardCard icon={Users} label="My group" value={stats.group_name || 'No group yet'} hint={group ? `${group.members.length} member${group.members.length === 1 ? '' : 's'}` : 'Create or join one'} />
                <DashboardCard icon={ClipboardList} label="Assigned" value={stats.total_assigned} tone="slate" hint="Assignments for you" />
                <DashboardCard icon={CheckCheck} label="Submitted" value={stats.submitted} tone="emerald" hint="Fully confirmed by your group" />
                <DashboardCard icon={Hourglass} label="Pending" value={stats.pending} tone="amber" hint={overdue.length ? `${overdue.length} overdue` : 'Not yet fully confirmed'} />
                <DashboardCard icon={Percent} label="Group completion" value={`${stats.group_completion}%`} tone="indigo" hint="Average across assignments" />
              </div>

              <div className="grid gap-6 lg:grid-cols-5">
                <section className="card lg:col-span-3" aria-labelledby="up-h">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h2 id="up-h" className="flex items-center gap-2 text-base font-semibold"><CalendarClock className="h-[18px] w-[18px] text-slate-400" />Upcoming deadlines</h2>
                    <Link to="/assignments" className="text-sm font-medium text-primary-600 hover:text-primary-700">All assignments</Link>
                  </div>
                  {upcoming.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-slate-500">No upcoming deadlines. Nice work.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {upcoming.map((a) => (
                        <li key={a.id}>
                          <Link to={`/assignments/${a.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a.title}</p><p className="text-xs text-slate-500">{fmtDate(a.due_date)} · {dueLabel(a.due_date)}</p></div>
                            <StudentStateBadge state={studentState(a)} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="card p-5 lg:col-span-2" aria-labelledby="g-h">
                  <h2 id="g-h" className="text-base font-semibold">Your group</h2>
                  {group ? (
                    <>
                      <p className="mt-1 text-sm text-slate-500">{group.group_name}</p>
                      <div className="mt-4 flex -space-x-2">
                        {group.members.slice(0, 6).map((m) => <span key={m.id} title={m.full_name} className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-primary-100 text-xs font-semibold text-primary-700">{initials(m.full_name)}</span>)}
                      </div>
                      <div className="mt-5"><div className="mb-1.5 flex justify-between text-xs text-slate-500"><span>Overall completion</span><span>{stats.group_completion}%</span></div><ProgressBar value={stats.group_completion} /></div>
                      <Link to="/group" className="btn btn-secondary btn-sm mt-5">Manage group</Link>
                    </>
                  ) : (
                    <EmptyState icon={Users} title="You’re not in a group" message="Create one and invite classmates, or accept an invitation." action={<Link to="/group/create" className="btn btn-primary btn-sm">Create a group</Link>} />
                  )}
                </section>
              </div>
            </div>
          );
        }}
      </AsyncBoundary>
    </>
  );
}
