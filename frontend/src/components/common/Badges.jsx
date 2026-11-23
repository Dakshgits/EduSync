const TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  indigo: 'bg-primary-50 text-primary-700 ring-primary-200',
};

export function Badge({ tone = 'slate', children, className = '' }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}>{children}</span>;
}

/** Group-level submission status as the professor sees it. */
const ADMIN = { PENDING: ['slate', 'No confirmations'], PARTIAL: ['amber', 'Partially confirmed'], SUBMITTED: ['emerald', 'Fully confirmed'] };
export function StatusBadge({ status }) {
  const [tone, label] = ADMIN[status] || ['slate', status];
  return <Badge tone={tone}>{label}</Badge>;
}

/** The four badges students see: Pending, Submitted, Completed, Overdue. */
const STUDENT = { pending: ['amber', 'Pending'], submitted: ['indigo', 'Submitted'], completed: ['emerald', 'Completed'], overdue: ['rose', 'Overdue'] };
export function StudentStateBadge({ state }) {
  const [tone, label] = STUDENT[state];
  return <Badge tone={tone}>{label}</Badge>;
}

export const RoleBadge = ({ role }) => <Badge tone={role === 'LEADER' ? 'indigo' : 'slate'}>{role === 'LEADER' ? 'Leader' : 'Member'}</Badge>;
