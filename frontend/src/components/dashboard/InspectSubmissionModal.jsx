import Modal from '../modals/Modal';
import useAsync from '../../hooks/useAsync';
import { submissionApi } from '../../services';
import { AsyncBoundary, Skeleton } from '../common/Feedback';
import { StatusBadge } from '../common/Badges';
import ProgressBar from '../common/ProgressBar';
import MemberConfirmations from './MemberConfirmations';
import { fmtDateTime } from '../../utils/format';

/** Admin view of one group's confirmation records for one assignment. */
export default function InspectSubmissionModal({ submissionId, onClose }) {
  const state = useAsync(() => (submissionId ? submissionApi.get(submissionId) : Promise.resolve(null)), [submissionId]);
  return (
    <Modal open={!!submissionId} onClose={onClose} title="Confirmation records" size="lg">
      <AsyncBoundary state={state} skeleton={<div className="space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-2 w-full" /><Skeleton className="h-40 w-full" /></div>}>
        {(s) => s && (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{s.assignment_title}</p>
                <p className="text-sm text-slate-500">{s.group_name} · due {fmtDateTime(s.due_date)}</p>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm text-slate-600">{s.confirmed_members} of {s.total_members} members confirmed ({s.percent}%)</p>
              <ProgressBar value={s.percent} segments={s.members.map((m) => m.confirmed)} />
            </div>
            <div className="mt-4"><MemberConfirmations members={s.members} /></div>
            <p className="mt-3 text-xs text-slate-500">Confirmations are self-reported by students; OneDrive uploads are not verified.</p>
          </div>
        )}
      </AsyncBoundary>
    </Modal>
  );
}
