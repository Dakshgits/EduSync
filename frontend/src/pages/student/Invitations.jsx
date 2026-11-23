import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MailOpen, X } from 'lucide-react';
import useAsync from '../../hooks/useAsync';
import { invitationApi } from '../../services';
import { errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import { AsyncBoundary, EmptyState } from '../../components/common/Feedback';
import { Badge } from '../../components/common/Badges';
import { fmtDateTime } from '../../utils/format';

const TONE = { PENDING: 'amber', ACCEPTED: 'emerald', REJECTED: 'rose' };

export default function Invitations() {
  const toast = useToast();
  const state = useAsync(() => invitationApi.list(), []);
  const [busyId, setBusyId] = useState(null);

  const respond = async (inv, action) => {
    setBusyId(inv.id);
    try {
      await invitationApi[action](inv.id);
      toast.success(action === 'accept' ? `You joined ${inv.group_name}` : 'Invitation declined');
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusyId(null); await state.reload(); }
  };

  return (
    <>
      <PageHeader title="Invitations" subtitle="Group invitations you’ve received. You can be in one group at a time." />
      <AsyncBoundary state={state}>
        {(list) => list.length === 0 ? (
          <EmptyState icon={MailOpen} title="No invitations" message="When a group leader invites you, it will show up here." action={<Link to="/group/create" className="btn btn-secondary btn-sm">Start your own group</Link>} />
        ) : (
          <ul className="space-y-3">
            {list.map((i) => (
              <li key={i.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{i.group_name}</p>
                  <p className="text-xs text-slate-500">Invited by {i.invited_by_name} · {i.member_count} member{i.member_count === 1 ? '' : 's'} · {fmtDateTime(i.created_at)}</p>
                </div>
                {i.status === 'PENDING' ? (
                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-sm" disabled={busyId === i.id} onClick={() => respond(i, 'accept')}><Check className="h-4 w-4" />Accept</button>
                    <button className="btn btn-secondary btn-sm" disabled={busyId === i.id} onClick={() => respond(i, 'reject')}><X className="h-4 w-4" />Decline</button>
                  </div>
                ) : <Badge tone={TONE[i.status]}>{i.status === 'ACCEPTED' ? 'Accepted' : 'Declined'}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
    </>
  );
}
