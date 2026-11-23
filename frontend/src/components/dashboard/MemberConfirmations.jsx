import { CheckCircle2, Circle } from 'lucide-react';
import { Badge, RoleBadge } from '../common/Badges';
import { fmtDateTime } from '../../utils/format';

/** One row per current group member showing whether they have confirmed, and when. */
export default function MemberConfirmations({ members, meId }) {
  return (
    <ul className="divide-y divide-slate-100" aria-label="Member confirmations">
      {members.map((m) => (
        <li key={m.id} className="flex items-center gap-3 py-3">
          {m.confirmed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-label="Confirmed" /> : <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-label="Not confirmed" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{m.full_name}{m.id === meId && <span className="ml-1.5 text-xs font-normal text-slate-500">(you)</span>}</p>
            <p className="truncate text-xs text-slate-500">{m.student_id} · {m.confirmed ? `Confirmed ${fmtDateTime(m.confirmed_at)}` : 'Not confirmed yet'}</p>
          </div>
          {m.late && <Badge tone="rose">Late</Badge>}
          <RoleBadge role={m.member_role} />
        </li>
      ))}
    </ul>
  );
}
