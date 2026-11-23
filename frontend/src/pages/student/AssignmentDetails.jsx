import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, UserRound, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useAsync from '../../hooks/useAsync';
import { assignmentApi, submissionApi } from '../../services';
import { AsyncBoundary } from '../../components/common/Feedback';
import { StudentStateBadge } from '../../components/common/Badges';
import SubmissionPanel from '../../components/dashboard/SubmissionPanel';
import { dueLabel, fmtDateTime, studentState } from '../../utils/format';

export default function AssignmentDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const state = useAsync(async () => {
    const assignment = await assignmentApi.get(id);
    const submission = assignment.submission_id ? await submissionApi.get(assignment.submission_id) : null;
    return { assignment, submission };
  }, [id]);

  return (
    <>
      <Link to="/assignments" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink"><ArrowLeft className="h-4 w-4" />All assignments</Link>
      <AsyncBoundary state={state}>
        {({ assignment: a, submission }) => (
          <div className="grid gap-6 lg:grid-cols-5">
            <section className="card p-6 lg:col-span-3">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl font-semibold tracking-tight">{a.title}</h1>
                <StudentStateBadge state={studentState(a)} />
              </div>
              <dl className="mt-4 grid gap-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-400" /><dt className="sr-only">Professor</dt><dd>{a.professor_name}</dd></div>
                <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-slate-400" /><dt className="sr-only">Due</dt><dd>Due {fmtDateTime(a.due_date)} <span className={a.is_overdue ? 'text-rose-600' : 'text-slate-500'}>({dueLabel(a.due_date)})</span></dd></div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" /><dt className="sr-only">Group</dt><dd>{a.has_group ? a.group_name : 'You are not in a group'}</dd></div>
              </dl>
              <h2 className="mt-6 text-sm font-semibold">Instructions</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.description || 'No description provided.'}</p>
              <p className="mt-6 text-xs text-slate-500">Posted {fmtDateTime(a.created_at)}</p>
            </section>
            <div className="lg:col-span-2">
              <SubmissionPanel assignment={a} submission={submission} meId={user.id} onChanged={state.reload} />
            </div>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
