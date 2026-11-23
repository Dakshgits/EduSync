import { useState } from 'react';
import { CheckCircle2, ExternalLink, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProgressBar from '../common/ProgressBar';
import { StatusBadge } from '../common/Badges';
import MemberConfirmations from './MemberConfirmations';
import ConfirmationModal from '../modals/ConfirmationModal';
import { submissionApi } from '../../services';
import { errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';

/** Student-side submission flow: open OneDrive -> "Yes, I have submitted" -> confirmation modal -> saved. */
export default function SubmissionPanel({ assignment, submission, meId, onChanged }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!assignment.has_group) {
    return (
      <div className="card p-5">
        <h2 className="text-base font-semibold">Submission</h2>
        <p className="mt-2 text-sm text-slate-600">Submissions are confirmed by group. Create a group or accept an invitation to take part.</p>
        <div className="mt-4 flex gap-2"><Link to="/group/create" className="btn btn-primary btn-sm">Create a group</Link><Link to="/invitations" className="btn btn-secondary btn-sm">View invitations</Link></div>
      </div>
    );
  }
  if (!submission) return null;

  const mine = submission.members.find((m) => m.id === meId);
  const segments = submission.members.map((m) => m.confirmed);

  const confirm = async () => {
    setBusy(true);
    try {
      await submissionApi.confirm(submission.id);
      toast.success('Submission confirmed');
      setOpen(false);
      await onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
      setOpen(false);
      await onChanged();
    } finally { setBusy(false); }
  };

  return (
    <section className="card p-5" aria-labelledby="sub-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sub-h" className="text-base font-semibold">Group submission</h2>
        <StatusBadge status={submission.status} />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm text-slate-600"><span className="text-lg font-semibold text-ink">{submission.confirmed_members}/{submission.total_members}</span> members confirmed</p>
          <p className="text-sm font-medium text-ink">{submission.percent}%</p>
        </div>
        <ProgressBar value={submission.percent} segments={segments} label="Group confirmation progress" />
        {submission.status !== 'SUBMITTED' && <p className="mt-2 text-xs text-slate-500">The group counts as submitted once every member has confirmed.</p>}
      </div>

      <div className="mt-5 rounded-lg bg-slate-50 p-4">
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-600 text-xs font-semibold text-white">1</span>
            <span>Upload your work to the professor’s OneDrive folder.
              <a href={assignment.onedrive_link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm ml-0 mt-2 flex w-fit"><ExternalLink className="h-3.5 w-3.5" />Open OneDrive link</a></span></li>
          <li className="flex items-start gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-600 text-xs font-semibold text-white">2</span>
            <span>Come back here and confirm that you uploaded it.</span></li>
        </ol>
        <div className="mt-4">
          {mine?.confirmed ? (
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-5 w-5" />You confirmed your submission.</p>
          ) : (
            <button className="btn btn-primary" onClick={() => setOpen(true)}>Yes, I have submitted</button>
          )}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />EduSync records your confirmation. It does not check OneDrive for the file.</p>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-medium text-slate-700">Members</h3>
        <MemberConfirmations members={submission.members} meId={meId} />
      </div>

      <ConfirmationModal open={open} busy={busy} title="Confirm submission"
        message="Have you successfully uploaded your assignment to the provided OneDrive link?"
        cancelLabel="Cancel" confirmLabel="Confirm Submission" onClose={() => setOpen(false)} onConfirm={confirm} />
    </section>
  );
}
