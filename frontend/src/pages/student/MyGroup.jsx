import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Mail, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import { groupApi } from '../../services';
import { errorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import { AsyncBoundary, EmptyState, Spinner } from '../../components/common/Feedback';
import { Badge, RoleBadge } from '../../components/common/Badges';
import ConfirmationModal from '../../components/modals/ConfirmationModal';
import { fmtDate, initials } from '../../utils/format';

const INV_TONE = { PENDING: 'amber', ACCEPTED: 'emerald', REJECTED: 'rose' };

export default function MyGroup() {
  const { user } = useAuth();
  const toast = useToast();
  const state = useAsync(() => groupApi.mine(), []);
  const [identifier, setIdentifier] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [confirm, setConfirm] = useState(null); // { kind: 'remove'|'leave'|'cancel', member?, invitation? }
  const [busy, setBusy] = useState(false);

  const invite = async (e, g) => {
    e.preventDefault();
    if (identifier.trim().length < 3) { setInviteError('Enter a student email or student ID'); return; }
    setInviting(true); setInviteError('');
    try {
      await groupApi.invite(g.id, identifier.trim());
      toast.success('Invitation sent. They’ll join once they accept.');
      setIdentifier('');
      await state.reload();
    } catch (err) { setInviteError(errorMessage(err)); } finally { setInviting(false); }
  };

  const runConfirm = async (g) => {
    setBusy(true);
    try {
      if (confirm.kind === 'remove') { await groupApi.removeMember(g.id, confirm.member.id); toast.success(`${confirm.member.full_name} was removed`); }
      if (confirm.kind === 'cancel') { await groupApi.cancelInvite(g.id, confirm.invitation.id); toast.success('Invitation cancelled'); }
      if (confirm.kind === 'leave') { const r = await groupApi.removeMember(g.id, user.id); toast.success(r.dissolved ? 'Group dissolved' : 'You left the group'); }
      setConfirm(null);
      await state.reload();
    } catch (err) { toast.error(errorMessage(err)); setConfirm(null); } finally { setBusy(false); }
  };

  return (
    <AsyncBoundary state={state}>
      {(g) => {
        if (!g) {
          return (
            <>
              <PageHeader title="My group" />
              <EmptyState icon={Users} title="You’re not in a group yet" message="Start a group and invite classmates by email or student ID, or accept an invitation you’ve received."
                action={<div className="flex gap-2"><Link to="/group/create" className="btn btn-primary">Create a group</Link><Link to="/invitations" className="btn btn-secondary">View invitations</Link></div>} />
            </>
          );
        }
        const isLeader = g.my_role === 'LEADER';
        const pending = (g.invitations || []).filter((i) => i.status === 'PENDING');
        const history = (g.invitations || []).filter((i) => i.status !== 'PENDING');
        const alone = g.members.length === 1;
        return (
          <>
            <PageHeader title={g.group_name} subtitle={`${g.members.length} of ${g.max_size} places filled · created ${fmtDate(g.created_at)}`}
              actions={<button className="btn btn-secondary" onClick={() => setConfirm({ kind: 'leave' })}><LogOut className="h-4 w-4" />{isLeader && alone ? 'Dissolve group' : 'Leave group'}</button>} />
            <div className="grid gap-6 lg:grid-cols-5">
              <section className="card lg:col-span-3" aria-labelledby="m-h">
                <h2 id="m-h" className="border-b border-slate-100 px-5 py-4 text-base font-semibold">Members</h2>
                <ul className="divide-y divide-slate-100">
                  {g.members.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">{initials(m.full_name)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.full_name}{m.id === user.id && <span className="ml-1.5 text-xs font-normal text-slate-500">(you)</span>}</p>
                        <p className="truncate text-xs text-slate-500">{m.student_id} · {m.email}</p>
                        <p className="text-xs text-slate-400">Joined {fmtDate(m.joined_at)}</p>
                      </div>
                      <RoleBadge role={m.member_role} />
                      {isLeader && m.id !== user.id && (
                        <button className="btn btn-ghost btn-sm text-rose-600 hover:bg-rose-50" aria-label={`Remove ${m.full_name}`} onClick={() => setConfirm({ kind: 'remove', member: m })}><UserMinus className="h-4 w-4" /></button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <div className="space-y-6 lg:col-span-2">
                {isLeader ? (
                  <section className="card p-5" aria-labelledby="i-h">
                    <h2 id="i-h" className="text-base font-semibold">Invite a classmate</h2>
                    <p className="mt-1 text-sm text-slate-500">Use their email or student ID. They’ll become a member after accepting.</p>
                    <form onSubmit={(e) => invite(e, g)} className="mt-4" noValidate>
                      <label htmlFor="invitee" className="sr-only">Email or student ID</label>
                      <input id="invitee" className={`input ${inviteError ? 'input-error' : ''}`} placeholder="Email or student ID" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                      {inviteError && <p className="mt-1.5 text-xs text-rose-600" role="alert">{inviteError}</p>}
                      <button className="btn btn-primary mt-3 w-full" disabled={inviting}>{inviting ? <Spinner className="!text-white" /> : <UserPlus className="h-4 w-4" />}Send invitation</button>
                    </form>
                  </section>
                ) : (
                  <div className="card p-5 text-sm text-slate-600">Only the group leader can invite or remove members. You can leave the group at any time.</div>
                )}

                {isLeader && (
                  <section className="card" aria-labelledby="p-h">
                    <h2 id="p-h" className="border-b border-slate-100 px-5 py-4 text-base font-semibold">Invitations</h2>
                    {pending.length + history.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No invitations sent yet.</p> : (
                      <ul className="divide-y divide-slate-100">
                        {[...pending, ...history].map((i) => (
                          <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{i.full_name}</p><p className="truncate text-xs text-slate-500">{i.student_id}</p></div>
                            <Badge tone={INV_TONE[i.status]}>{i.status.charAt(0) + i.status.slice(1).toLowerCase()}</Badge>
                            {i.status === 'PENDING' && <button className="btn btn-ghost btn-sm" aria-label={`Cancel invitation to ${i.full_name}`} onClick={() => setConfirm({ kind: 'cancel', invitation: i })}><X className="h-4 w-4" /></button>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </div>
            </div>

            <ConfirmationModal open={!!confirm} busy={busy} danger onClose={() => setConfirm(null)} onConfirm={() => runConfirm(g)}
              title={{ remove: 'Remove member', leave: isLeader && alone ? 'Dissolve group' : 'Leave group', cancel: 'Cancel invitation' }[confirm?.kind] || ''}
              confirmLabel={{ remove: 'Remove', leave: isLeader && alone ? 'Dissolve' : 'Leave', cancel: 'Cancel invitation' }[confirm?.kind] || 'Confirm'}
              cancelLabel="Keep"
              message={confirm?.kind === 'remove' ? `Remove ${confirm.member.full_name} from ${g.group_name}? Group progress will be recalculated without them.`
                : confirm?.kind === 'cancel' ? `Withdraw the invitation to ${confirm.invitation.full_name}?`
                : isLeader && !alone ? 'Leadership will pass to the member who joined earliest. Group progress will be recalculated.'
                : isLeader ? 'You are the only member, so the group will be deleted.' : 'You’ll leave this group and its progress will be recalculated without you.'} />
          </>
        );
      }}
    </AsyncBoundary>
  );
}
