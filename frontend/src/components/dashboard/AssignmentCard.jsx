import { Link } from 'react-router-dom';
import { CalendarClock, ExternalLink, UserRound, Users } from 'lucide-react';
import { StudentStateBadge } from '../common/Badges';
import ProgressBar from '../common/ProgressBar';
import { dueLabel, fmtDate, studentState } from '../../utils/format';

export default function AssignmentCard({ a }) {
  const state = studentState(a);
  return (
    <article className="card flex flex-col p-5 transition-shadow hover:shadow-pop/40">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-base font-semibold leading-snug text-ink"><Link to={`/assignments/${a.id}`} className="hover:text-primary-700">{a.title}</Link></h3>
        <StudentStateBadge state={state} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{a.description || 'No description provided.'}</p>
      <dl className="mt-4 grid gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5" /><dt className="sr-only">Professor</dt><dd>{a.professor_name}</dd></div>
        <div className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5" /><dt className="sr-only">Due</dt><dd>Due {fmtDate(a.due_date)} <span className={state === 'overdue' ? 'text-rose-600' : ''}>({dueLabel(a.due_date)})</span> · Posted {fmtDate(a.created_at)}</dd></div>
        <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /><dt className="sr-only">Group</dt><dd>{a.has_group ? a.group_name : 'Join a group to submit'}</dd></div>
      </dl>
      {a.has_group && (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-slate-500"><span>{a.confirmed_members}/{a.total_members} members confirmed</span><span>{a.percent}%</span></div>
          <ProgressBar value={a.percent} label={`${a.title} group progress`} />
        </div>
      )}
      <div className="mt-5 flex items-center gap-2 pt-1">
        <Link to={`/assignments/${a.id}`} className="btn btn-secondary btn-sm">View details</Link>
        <a href={a.onedrive_link} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><ExternalLink className="h-3.5 w-3.5" />OneDrive</a>
      </div>
    </article>
  );
}
